import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// ─────────────────────────────────────────────────────
//  AUTH BYPASS — set to true while Supabase is not yet
//  configured. All pages work with a "Guest Explorer"
//  identity. Flip to false when Supabase is ready and
//  you want real OAuth to take over.
// ─────────────────────────────────────────────────────
const AUTH_BYPASS = true;

// These imports are only used when AUTH_BYPASS is false.
// We keep them here so the code stays intact for later.
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Session, User } from "@supabase/supabase-js";
import { supabase, ensureProfile, onAuthStateChange, type Profile } from "@/lib/supabase";
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** "email" | "google" | "apple" — derived from the auth provider */
  provider: "email" | "google" | "apple";
  /** True when the user is a guest (no real auth backend configured yet). */
  isGuest: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  /** True while any auth operation (sign-in/sign-up/OAuth redirect) is in flight. */
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithProvider: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Mock guest used while Supabase is being configured. */
const GUEST_USER: AuthUser = {
  id: "guest-explorer",
  email: "explorer@safario.travel",
  name: "Guest Explorer",
  avatarUrl: null,
  provider: "email",
  isGuest: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // ── Bypass mode — no Supabase calls, instant guest user ──
  if (AUTH_BYPASS) {
    const value = useMemo<AuthContextValue>(
      () => ({
        user: GUEST_USER,
        ready: true,
        loading: false,
        signUp: async () => ({ error: "Registration is temporarily disabled while we configure Supabase. Check back soon!" }),
        signIn: async () => ({ error: "Sign in is temporarily disabled while we configure Supabase. Check back soon!" }),
        signInWithProvider: async () => {
          throw new Error("OAuth sign in is temporarily disabled while we configure Supabase. Check back soon!");
        },
        signOut: async () => {
          // No-op in bypass mode — guest stays signed in so the app works.
        },
      }),
      [],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  // ── Real Supabase auth (below) — preserved exactly as-is for later use ──
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [session, setSession] = useState<Session | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [profile, setProfile] = useState<Profile | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [ready, setReady] = useState<boolean>(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [loading, setLoading] = useState<boolean>(false);

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

  // Restore session on mount + listen for changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useState(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      setSession(s);
      if (s?.user) {
        const p = await ensureProfile(s.user);
        setProfile(p);
      }
      setReady(true);
    })();

    const unsub = onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const p = await ensureProfile(newSession.user);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setReady(true);
    });

    return () => { unsub?.(); };
  });

  const user = useMemo<AuthUser | null>(() => {
    if (!session) return null;
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

        // If email confirmation is off, session is returned immediately.
        if (data.session) {
          setSession(data.session);
          const p = await ensureProfile(data.session.user);
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
        const p = await ensureProfile(data.session.user);
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
    async (provider: "google" | "apple") => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth`,
            queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
          },
        });

        if (error) {
          setLoading(false);
          throw new Error(error.message);
        }
        // Browser redirects to the OAuth provider — we never reach this line
        // on success. The onAuthStateChange listener above picks up the session
        // when the browser returns.
      } catch (err) {
        setLoading(false);
        throw err;
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
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
