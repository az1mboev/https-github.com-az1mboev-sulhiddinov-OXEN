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
  signInWithProvider: (provider: "google" | "apple") => Promise<void>;
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
        // on success. The onAuthStateChange listener picks up the session
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
