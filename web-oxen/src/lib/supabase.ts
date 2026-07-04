import { createClient, type Session, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).");
}

/**
 * Single Supabase client instance for the entire app.
 * Session is persisted automatically in localStorage by supabase-js on the web.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/** User-facing profile shape from the `profiles` table. */
export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch or create a row in the `profiles` table for the given user.
 * Safe to call after sign-up/sign-in even if the row already exists.
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Explorer";

  const { data: existing, error: fetchErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("Failed to fetch profile:", fetchErr);
  }

  if (existing) return existing as Profile;

  const { data: created, error: insertErr } = await supabase
    .from("profiles")
    .insert({ id: user.id, email: user.email, name })
    .select("*")
    .single();

  if (insertErr) {
    console.error("Failed to create profile:", insertErr);
    return null;
  }

  return created as Profile;
}

/**
 * Listen to auth state changes.
 * Returns an unsubscribe function identical to supabase.auth.onAuthStateChange.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription.unsubscribe;
}
