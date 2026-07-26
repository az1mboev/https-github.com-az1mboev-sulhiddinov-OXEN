import { createClient, type Session, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).");
}

/**
 * Single Supabase client instance for the entire app.
 * Session is persisted automatically in localStorage by supabase-js on the web.
 *
 * Session persistence config:
 *  - persistSession: true   → session restored from localStorage on reload
 *  - autoRefreshToken: true → access token refreshed before expiry
 *  - detectSessionInUrl: true → OAuth redirect hash parsed automatically
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
  /** Mirror of id — the stable auth.uid() used as the permanent account key. */
  user_id: string | null;
  email: string | null;
  /** Trimmed + lowercased email. Used for uniqueness + lookup. */
  normalized_email: string | null;
  /** Display nickname (original casing). */
  nickname: string | null;
  /** Trimmed + lowercased nickname. Used for unique index + login lookup. */
  normalized_nickname: string | null;
  name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  account_status: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch or create a row in the `profiles` table for the given user.
 * Safe to call after sign-up/sign-in even if the row already exists.
 *
 * Idempotent: repeated OAuth callbacks / refreshes never create duplicates.
 * The DB trigger `on_auth_user_created` also handles this server-side,
 * so this is a client-side safety net.
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Explorer";

  const avatar =
    user.user_metadata?.avatar_url ??
    user.user_metadata?.picture ??
    null;

  const provider =
    user.user_metadata?.provider ??
    user.app_metadata?.provider ??
    null;

  // 1. Read first — never assume the row is missing
  const { data: existing, error: fetchErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("Failed to fetch profile:", fetchErr);
  }

  if (existing) return existing as Profile;

  // 2. Only insert if no row exists. Normalized columns are filled
  //    by the `profiles_normalize_email` DB trigger.
  const { data: created, error: insertErr } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      user_id: user.id,
      email: user.email ?? null,
      name,
      full_name: name,
      avatar_url: avatar,
      provider,
      onboarding_completed: false,
    })
    .select("*")
    .single();

  if (insertErr) {
    // Race condition: trigger may have created the row between our
    // select and insert. Re-fetch as a fallback.
    if (insertErr.code === "23505") {
      const { data: retry } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return retry as Profile | null;
    }
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

// ── Nickname helpers ──────────────────────────────────────

/** Reserved nicknames that can never be registered. */
export const RESERVED_NICKNAMES = new Set<string>([
  "admin", "owner", "oxen", "support", "moderator", "system",
  "root", "official", "help", "null", "undefined",
]);

/**
 * Validate a nickname format.
 * Returns an error string (user-facing) or null when valid.
 */
export function validateNicknameFormat(nickname: string): string | null {
  const trimmed = nickname.trim();
  if (!trimmed) return "Nickname is required.";
  if (trimmed.length < 3) return "Nickname must be at least 3 characters.";
  if (trimmed.length > 24) return "Nickname must be at most 24 characters.";
  // Reject spaces, @, and any character outside Latin letters, numbers, _, .
  if (!/^[A-Za-z0-9_.]+$/.test(trimmed)) {
    if (/\s/.test(trimmed)) return "Nickname cannot contain spaces.";
    if (trimmed.includes("@")) return "Nickname cannot contain @.";
    return "Nickname can only contain Latin letters, numbers, underscore, and dot.";
  }
  // No leading or trailing dot
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) {
    return "Nickname cannot start or end with a dot.";
  }
  // No leading or trailing underscore
  if (trimmed.startsWith("_") || trimmed.endsWith("_")) {
    return "Nickname cannot start or end with an underscore.";
  }
  // No consecutive dots
  if (trimmed.includes("..")) {
    return "Nickname cannot contain consecutive dots.";
  }
  if (RESERVED_NICKNAMES.has(trimmed.toLowerCase())) {
    return "This nickname is reserved. Please choose another.";
  }
  return null;
}

/**
 * Check nickname availability server-side (case-insensitive).
 * Returns "available" | "taken" | "invalid".
 */
export async function checkNicknameAvailability(
  nickname: string,
): Promise<"available" | "taken" | "invalid"> {
  const formatError = validateNicknameFormat(nickname);
  if (formatError) return "invalid";

  const normalized = nickname.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("normalized_nickname", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    // Do NOT mark the nickname invalid on a transient Supabase failure
    // (e.g. column not yet created, RLS error, network issue). The format
    // is already validated above; the DB unique index is the final guard at
    // onboarding submit time. Optimistically treat as available so the user
    // is not blocked from continuing.
    console.error("checkNicknameAvailability error:", error);
    return "available";
  }

  return data ? "taken" : "available";
}

/**
 * Validate a password against OXEN requirements.
 * Returns an error string or null when valid.
 */
export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password)) return "Password must contain at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

/**
 * Estimate password strength (0-4).
 * 0 = very weak, 4 = strong.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

/**
 * Normalize an email: trim + lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
