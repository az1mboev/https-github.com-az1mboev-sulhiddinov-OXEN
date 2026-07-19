import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, ensureProfile, onAuthStateChange, type Profile } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** "email" | "google" | "apple" — derived from the auth provider */
  provider: "email" | "google" | "apple";
  /** True when the user is a guest (not signed in). */
  isGuest: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  /** True while any auth operation (sign-in/sign-up/OAuth redirect) is in flight. */
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /**
   * Kick off OAuth with the given provider.
   *
   * Uses `skipBrowserRedirect: true` so we can control the redirect ourselves
   * — this lets us escape the Rork preview iframe (Google returns 403 inside
   * an iframe) by navigating the top-level window to the OAuth URL, with a
   * `window.open` fallback for sandboxed iframes.
   *
   * Returns `{ url }` so the caller can render a manual "Open in New Tab"
   * fallback button if the automatic redirect is blocked.
   */
  signInWithProvider: (
    provider: "google" | "apple",
    options?: { redirectToPath?: string },
  ) => Promise<{ url?: string; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Guest identity used when no Supabase session exists. */
const GUEST_USER: AuthUser = {
  id: "guest-explorer",
  email: "explorer@oxen.travel",
  name: "Guest Explorer",
  avatarUrl: null,
  provider: "email",
  isGuest: true,
};

function authUserFromSupabase(session: Session, profile: Profile | null): AuthUser {
  const providerRaw = session.user.app_metadata?.provider as string | undefined;
  let provider: AuthUser["provider"] = "email";
  if (providerRaw === "google") provider = "google";
  else if (providerRaw === "apple") provider = "apple";

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: profile?.name ?? session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Explorer",
    avatarUrl: profile?.avatar_url ?? session.user.user_metadata?.avatar_url ?? null,
    provider,
    isGuest: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Restore session on mount + listen for auth changes (OAuth redirect, signOut, etc.)
  useEffect(() => {
    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const s = data.session;
      setSession(s);
      if (s?.user) {
        const p = await ensureProfile(s.user as User);
        if (active) setProfile(p);
      }
      setReady(true);
    })();

    const unsub = onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const p = await ensureProfile(newSession.user as User);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setReady(true);
    });

    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  // When no session, show guest user so the app works without sign-in.
  // When session exists, show the real Supabase user.
  const user = useMemo<AuthUser>(() => {
    if (!session) return GUEST_USER;
    return authUserFromSupabase(session, profile);
  }, [session, profile]);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });

        if (error) return { error: error.message };

        if (data.session) {
          setSession(data.session);
          const p = await ensureProfile(data.session.user as User);
          setProfile(p);
        }

        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Registration failed" };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) return { error: error.message };

        setSession(data.session);
        const p = await ensureProfile(data.session.user as User);
        setProfile(p);

        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Sign in failed" };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signInWithProvider = useCallback(
    async (
      provider: "google" | "apple",
      options?: { redirectToPath?: string },
    ): Promise<{ url?: string; error?: string }> => {
      setLoading(true);
      try {
        // Build the real app callback URL from the current origin so OAuth
        // redirects land on the actual deployed app (preview or production),
        // not an embedded iframe URL. Preserve the post-login path so the
        // Auth page can route the user back to where they started.
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "https://azimboyevshuxrux-mvp1.rork.app";
        const redirectPath = options?.redirectToPath ?? "";
        const redirectTo = `${origin}/auth${
          redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""
        }`;

        // `skipBrowserRedirect` lets us control the navigation ourselves so we
        // can break out of the Rork preview iframe (Google 403s inside frames).
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            skipBrowserRedirect: true,
            redirectTo,
            queryParams:
              provider === "google"
                ? { access_type: "offline", prompt: "select_account" }
                : undefined,
          },
        });

        if (error) {
          return { error: error.message };
        }

        const url = data.url;
        if (!url) {
          return { error: "OAuth URL was not returned by Supabase." };
        }

        // Escape the iframe: navigate the top-level window to Google.
        // Google blocks being rendered inside an iframe (X-Frame-Options:
        // DENY), so we must redirect the top-level frame. If that is blocked
        // (cross-origin / sandbox), fall back to opening a new tab.
        try {
          const inIframe =
            typeof window !== "undefined" && window.self !== window.top;
          if (inIframe && window.top) {
            window.top.location.href = url;
          } else {
            window.location.assign(url);
          }
        } catch {
          try {
            window.open(url, "_blank", "noopener,noreferrer");
          } catch {
            /* caller can use the returned url for a manual fallback button */
          }
        }

        // Return the URL so the caller can render an "Open in New Tab"
        // fallback button if the automatic redirect is blocked.
        return { url };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "OAuth sign-in failed",
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tell Supabase to revoke the session server-side.
      //    { scope: "global" } ensures ALL sessions (this device + others)
      //    are invalidated, not just the current one.
      await supabase.auth.signOut({ scope: "global" });

      // 2. Clear React state so the user becomes Guest Explorer immediately.
      setSession(null);
      setProfile(null);

      // 3. Purge any lingering auth / OAuth state from browser storage.
      //    supabase-js stores under keys like `sb-<ref>-auth-token`.
      //    We also remove common OAuth intermediate keys.
      if (typeof window !== "undefined") {
        try {
          // Remove all Supabase auth keys from localStorage
          const localStorageKeys = Object.keys(localStorage);
          for (const key of localStorageKeys) {
            if (key.startsWith("sb-") || key.includes("supabase") || key.includes("oauth") || key.includes("auth-token")) {
              localStorage.removeItem(key);
            }
          }

          // Remove from sessionStorage as well
          const sessionStorageKeys = Object.keys(sessionStorage);
          for (const key of sessionStorageKeys) {
            if (key.startsWith("sb-") || key.includes("supabase") || key.includes("oauth") || key.includes("auth-token")) {
              sessionStorage.removeItem(key);
            }
          }
        } catch {
          // Storage access may be restricted — ignore
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, loading, signUp, signIn, signInWithProvider, signOut }),
    [user, ready, loading, signUp, signIn, signInWithProvider, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
