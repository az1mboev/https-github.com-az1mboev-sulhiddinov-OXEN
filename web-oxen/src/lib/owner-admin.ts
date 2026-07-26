import { supabase } from "@/lib/supabase";
import {
  computeEndDate,
  CONSULTING_PLANS,
  getPlan,
  type ConsultingCompany,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/consulting";
import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   Owner Admin Panel — Data Access Layer
   ------------------------------------------------
   Private admin module for the two OXEN platform owners.
   Every function requires the caller to be in `owner_admins`
   (enforced server-side by RLS via `is_owner()`).

   Owner emails are NEVER stored in the client bundle. The
   allowlist lives only in the `owner_admins` table (seeded by
   migration 0005). The client checks ownership by calling
   `checkOwnerAccess()` which hits a server-evaluated query.
   ============================================================ */

// ── Owner identity ─────────────────────────────────────────

export interface OwnerIdentity {
  email: string;
  user_id: string | null;
  is_owner: boolean;
}

/**
 * Check if the current authenticated user is an owner.
 * Returns `{ is_owner: false }` for everyone except the two
 * seeded owner accounts. The check is server-side (RLS on
 * `owner_admins` only lets a user read their own row).
 */
export async function checkOwnerAccess(): Promise<OwnerIdentity> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) {
    return { email: "", user_id: null, is_owner: false };
  }
  const userId = session.session.user.id;
  const email = session.session.user.email ?? "";

  // RLS only returns the row if the email matches
  const { data, error } = await supabase
    .from("owner_admins")
    .select("email, user_id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("checkOwnerAccess error:", error);
    return { email, user_id: userId, is_owner: false };
  }

  if (!data) return { email, user_id: userId, is_owner: false };

  // Link user_id if not yet linked
  if (!data.user_id) {
    await supabase
      .from("owner_admins")
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq("email", data.email);
  }

  return { email: data.email, user_id: userId, is_owner: true };
}

// ── User management ────────────────────────────────────────

export type AccountStatus =
  | "active"
  | "pending"
  | "suspended"
  | "blocked"
  | "deleted";

export type UserType =
  | "ordinary"
  | "consulting_applicant"
  | "premium_consulting"
  | "owner"
  | "manager"
  | "employee"
  | "cashier";

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
  provider: string | null;
  account_status: AccountStatus;
  user_type: UserType;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  /** Joined: consulting company name (if premium) */
  consulting_company_name?: string | null;
  /** Joined: consulting company id */
  consulting_company_id?: string | null;
}

export interface AdminUserFilters {
  search?: string;
  user_type?: UserType | "all";
  account_status?: AccountStatus | "all";
  /** "today" | "week" | "month" | "all" */
  signup_period?: "today" | "week" | "month" | "all";
  /** Sort: "newest" (default) | "oldest" */
  sort?: "newest" | "oldest";
}

function dateFilter(period: AdminUserFilters["signup_period"]): string | null {
  if (!period || period === "all") return null;
  const now = new Date();
  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null;
}

/**
 * Fetch all registered OXEN users (for the Owner Users page).
 * Owner-only — RLS on `profiles` allows owners to read all rows.
 */
export async function fetchAllUsers(
  filters: AdminUserFilters = {},
): Promise<AdminUser[]> {
  let query = supabase
    .from("profiles")
    .select(
      "id, email, name, avatar_url, phone, country, provider, account_status, user_type, last_login_at, created_at, updated_at",
    )
    .order("created_at", { ascending: filters.sort === "oldest" });

  if (filters.user_type && filters.user_type !== "all") {
    query = query.eq("user_type", filters.user_type);
  }
  if (filters.account_status && filters.account_status !== "all") {
    query = query.eq("account_status", filters.account_status);
  }
  if (filters.search?.trim()) {
    query = query.or(
      `name.ilike.%${filters.search.trim()}%,email.ilike.%${filters.search.trim()}%`,
    );
  }
  const since = dateFilter(filters.signup_period);
  if (since) {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchAllUsers error:", error);
    return [];
  }

  const users = (data ?? []) as unknown as AdminUser[];

  // Enrich with consulting company info for premium users
  const premiumUserIds = users
    .filter((u) => u.user_type === "premium_consulting")
    .map((u) => u.id);
  if (premiumUserIds.length > 0) {
    const { data: companies } = await supabase
      .from("consulting_companies")
      .select("id, name, owner_id")
      .in("owner_id", premiumUserIds);
    const companyMap = new Map<string, { id: string; name: string }>();
    for (const c of (companies ?? []) as unknown as { id: string; name: string; owner_id: string }[]) {
      companyMap.set(c.owner_id, { id: c.id, name: c.name });
    }
    for (const u of users) {
      const comp = companyMap.get(u.id);
      if (comp) {
        u.consulting_company_name = comp.name;
        u.consulting_company_id = comp.id;
      }
    }
  }

  return users;
}

/** Update a user's type (owner only — RLS enforced). */
export async function updateUserType(
  userId: string,
  userType: UserType,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ user_type: userType, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.error("updateUserType error:", error);
    return false;
  }
  return true;
}

/** Update a user's account status (owner only). */
export async function updateUserStatus(
  userId: string,
  status: AccountStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ account_status: status, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.error("updateUserStatus error:", error);
    return false;
  }
  return true;
}

/** Add an internal note about a user (owner only). */
export async function addUserNote(
  userId: string,
  ownerId: string,
  note: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("owner_user_notes")
    .insert({ user_id: userId, owner_id: ownerId, note });
  if (error) {
    console.error("addUserNote error:", error);
    return false;
  }
  return true;
}

/** Fetch internal notes for a user (owner only). */
export interface OwnerUserNote {
  id: string;
  user_id: string;
  owner_id: string;
  note: string;
  created_at: string;
}
export async function fetchUserNotes(userId: string): Promise<OwnerUserNote[]> {
  const { data, error } = await supabase
    .from("owner_user_notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchUserNotes error:", error);
    return [];
  }
  return (data ?? []) as unknown as OwnerUserNote[];
}

// ── Payment requests ───────────────────────────────────────

export type PaymentVerificationStatus =
  | "pending_verification"
  | "confirmed"
  | "rejected"
  | "more_info_required"
  | "refunded"
  | "cancelled";

export interface PaymentRequest {
  id: string;
  consulting_company_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_avatar_url: string | null;
  company_name: string | null;
  company_phone: string | null;
  plan: SubscriptionPlan;
  duration_months: number;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_date: string | null;
  transaction_reference: string | null;
  receipt_url: string | null;
  application_date: string;
  verification_status: PaymentVerificationStatus;
  owner_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all payment requests (owner only). */
export async function fetchPaymentRequests(
  status?: PaymentVerificationStatus | "all",
): Promise<PaymentRequest[]> {
  let query = supabase
    .from("owner_payment_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (status && status !== "all") {
    query = query.eq("verification_status", status);
  }
  const { data, error } = await query;
  if (error) {
    console.error("fetchPaymentRequests error:", error);
    return [];
  }
  return (data ?? []) as unknown as PaymentRequest[];
}

/** Create a payment request (submitted by the consulting user themselves). */
export async function createPaymentRequest(
  input: Omit<
    PaymentRequest,
    | "id"
    | "application_date"
    | "verification_status"
    | "owner_notes"
    | "reviewed_by"
    | "reviewed_at"
    | "created_at"
    | "updated_at"
  >,
): Promise<PaymentRequest | null> {
  const { data, error } = await supabase
    .from("owner_payment_requests")
    .insert({
      ...input,
      verification_status: "pending_verification",
    })
    .select("*")
    .single();
  if (error) {
    console.error("createPaymentRequest error:", error);
    return null;
  }
  return data as unknown as PaymentRequest;
}

/** Update a payment request's verification status (owner only). */
export async function updatePaymentRequestStatus(
  requestId: string,
  status: PaymentVerificationStatus,
  ownerId: string,
  notes?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("owner_payment_requests")
    .update({
      verification_status: status,
      owner_notes: notes ?? null,
      reviewed_by: ownerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) {
    console.error("updatePaymentRequestStatus error:", error);
    return false;
  }
  return true;
}

// ── Premium consulting accounts ────────────────────────────

export interface PremiumAccount {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  subscription_status: SubscriptionStatus | "none";
  subscription_plan: SubscriptionPlan | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  is_published: boolean;
  is_verified: boolean;
  verification_status: string;
  created_at: string;
  updated_at: string;
  /** Joined: owner profile */
  owner_name?: string | null;
  owner_email?: string | null;
  owner_avatar?: string | null;
}

/** Fetch all consulting companies (owner only). */
export async function fetchAllPremiumAccounts(): Promise<PremiumAccount[]> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchAllPremiumAccounts error:", error);
    return [];
  }
  const companies = (data ?? []) as unknown as PremiumAccount[];

  // Enrich with owner profile info
  const ownerIds = companies.map((c) => c.owner_id);
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .in("id", ownerIds);
    const profileMap = new Map<
      string,
      { name: string | null; email: string | null; avatar_url: string | null }
    >();
    for (const p of (profiles ?? []) as unknown as {
      id: string;
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    }[]) {
      profileMap.set(p.id, {
        name: p.name,
        email: p.email,
        avatar_url: p.avatar_url,
      });
    }
    for (const c of companies) {
      const p = profileMap.get(c.owner_id);
      if (p) {
        c.owner_name = p.name;
        c.owner_email = p.email;
        c.owner_avatar = p.avatar_url;
      }
    }
  }

  return companies;
}

/** Fetch a single consulting company with full detail (owner only). */
export async function fetchPremiumAccountDetails(
  companyId: string,
): Promise<PremiumAccount | null> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  if (error) {
    console.error("fetchPremiumAccountDetails error:", error);
    return null;
  }
  const company = data as unknown as PremiumAccount;
  if (company) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email, avatar_url")
      .eq("id", company.owner_id)
      .maybeSingle();
    const p = profile as unknown as {
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
    if (p) {
      company.owner_name = p.name;
      company.owner_email = p.email;
      company.owner_avatar = p.avatar_url;
    }
  }
  return company;
}

// ── Manual activation ──────────────────────────────────────

export interface ManualActivationInput {
  /** Supabase auth user id (must exist) */
  userId: string;
  userEmail: string;
  userName: string;
  companyName: string;
  companyPhone: string;
  plan: SubscriptionPlan;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionReference: string;
  startDate: string;
  receiptUrl?: string | null;
  note?: string;
  /** Owner performing the action */
  ownerId: string;
  ownerEmail: string;
}

/**
 * Manually activate a Premium Consulting subscription for a
 * registered Google account. Performs the full sequence:
 *   1. Find existing Supabase user by email
 *   2. Link user_id to consulting account
 *   3. Set account role to premium_consulting
 *   4. Create or update consulting company
 *   5. Create subscription record
 *   6. Calculate expiration date
 *   7. Activate dashboard
 *   8. Record which owner performed the action
 *   9. Record activation date + reason
 *  10. Add to Owner Audit Log
 *
 * Returns the activated company or throws on error.
 */
export async function manuallyActivatePremium(
  input: ManualActivationInput,
): Promise<{ company: PremiumAccount | null; error: string | null }> {
  const {
    userId,
    userEmail,
    userName,
    companyName,
    companyPhone,
    plan,
    amount,
    currency,
    paymentMethod,
    transactionReference,
    startDate,
    receiptUrl,
    note,
    ownerId,
    ownerEmail,
  } = input;

  const start = new Date(startDate);
  const end = computeEndDate(start, plan);
  const planInfo = getPlan(plan);

  // 1. Check if user exists in profiles
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email, name, user_type, account_status")
    .eq("id", userId)
    .maybeSingle();

  const profile = existingProfile as unknown as {
    id: string;
    email: string | null;
    name: string | null;
    user_type: UserType;
    account_status: AccountStatus;
  } | null;

  if (!profile) {
    return {
      company: null,
      error: "Account not registered. The user must sign up first.",
    };
  }

  // 2. Update user_type to premium_consulting
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      user_type: "premium_consulting",
      name: userName || profile.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profileErr) {
    return { company: null, error: `Failed to update user: ${profileErr.message}` };
  }

  // 3. Check if company already exists for this owner
  const { data: existingCompany } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  let companyId: string;

  if (existingCompany) {
    // 4a. Update existing company
    companyId = (existingCompany as unknown as { id: string }).id;
    const { error: updateErr } = await supabase
      .from("consulting_companies")
      .update({
        name: companyName,
        contact_phone: companyPhone,
        contact_email: userEmail,
        subscription_status: "active",
        subscription_plan: plan,
        subscription_start_date: start.toISOString(),
        subscription_end_date: end.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);
    if (updateErr) {
      return { company: null, error: `Failed to update company: ${updateErr.message}` };
    }
  } else {
    // 4b. Create new company
    const { data: newCompany, error: createErr } = await supabase
      .from("consulting_companies")
      .insert({
        owner_id: userId,
        name: companyName,
        contact_phone: companyPhone,
        contact_email: userEmail,
        verification_status: "pending",
        subscription_status: "active",
        subscription_plan: plan,
        subscription_start_date: start.toISOString(),
        subscription_end_date: end.toISOString(),
      })
      .select("*")
      .single();
    if (createErr || !newCompany) {
      return { company: null, error: `Failed to create company: ${createErr?.message}` };
    }
    companyId = (newCompany as unknown as { id: string }).id;
  }

  // 5. Create owner member row (if not exists)
  const { data: existingMember } = await supabase
    .from("consulting_members")
    .select("id")
    .eq("consulting_company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!existingMember) {
    await supabase.from("consulting_members").insert({
      consulting_company_id: companyId,
      user_id: userId,
      role: "owner",
      status: "active",
      invited_by: ownerId,
    });
  }

  // 6. Create subscription record
  await supabase.from("consulting_subscriptions").insert({
    consulting_company_id: companyId,
    plan,
    status: "active",
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    auto_renewal: false,
    amount,
    currency,
    created_by: ownerId,
  });

  // 7. Record payment
  await supabase.from("consulting_payments").insert({
    consulting_company_id: companyId,
    transaction_id: transactionReference || `manual_${Date.now()}`,
    type: "subscription",
    gross_amount: amount,
    commission: 0,
    net_amount: amount,
    currency,
    status: "paid",
    paid_at: new Date().toISOString(),
    receipt_url: receiptUrl ?? null,
    created_by: ownerId,
  });

  // 8. Record subscription history
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    amount,
    currency,
    action_type: "activation",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? `Manual activation by ${ownerEmail}`,
  });

  // 9. Audit log
  await logOwnerAction(ownerId, ownerEmail, "manual_activation", "company", companyId, {
    user_id: userId,
    user_email: userEmail,
    company_name: companyName,
    plan,
    amount,
    duration_months: planInfo.months,
  });

  // 10. Fetch the final company
  const { data: finalCompany } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("id", companyId)
    .single();
  return { company: finalCompany as unknown as PremiumAccount, error: null };
}

// ── Subscription extension / plan changes ──────────────────

export interface SubscriptionHistoryEntry {
  id: string;
  consulting_company_id: string;
  plan: SubscriptionPlan;
  start_date: string;
  end_date: string;
  amount: number | null;
  currency: string | null;
  action_type:
    | "activation"
    | "extension"
    | "upgrade"
    | "suspension"
    | "reactivation"
    | "cancellation"
    | "plan_change"
    | "custom";
  performed_by: string;
  performed_by_email: string | null;
  note: string | null;
  created_at: string;
}

/** Fetch subscription history for a company (owner only). */
export async function fetchSubscriptionHistory(
  companyId: string,
): Promise<SubscriptionHistoryEntry[]> {
  const { data, error } = await supabase
    .from("owner_subscription_history")
    .select("*")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchSubscriptionHistory error:", error);
    return [];
  }
  return (data ?? []) as unknown as SubscriptionHistoryEntry[];
}

export type ExtensionDuration = "1month" | "3months" | "1year" | "custom";

function addDuration(start: Date, duration: ExtensionDuration, customDate?: string): Date {
  if (duration === "custom" && customDate) {
    return new Date(customDate);
  }
  const d = new Date(start);
  if (duration === "1month") d.setMonth(d.getMonth() + 1);
  else if (duration === "3months") d.setMonth(d.getMonth() + 3);
  else if (duration === "1year") d.setFullYear(d.getFullYear() + 1);
  return d;
}

/**
 * Extend a subscription. If currently active, adds after the
 * existing end date. If expired, starts from today (or a
 * selected start date).
 */
export async function extendSubscription(
  companyId: string,
  duration: ExtensionDuration,
  ownerId: string,
  ownerEmail: string,
  customStartDate?: string,
  note?: string,
): Promise<{ new_end_date: string | null; error: string | null }> {
  const { data: company } = await supabase
    .from("consulting_companies")
    .select("subscription_end_date, subscription_status, subscription_plan")
    .eq("id", companyId)
    .maybeSingle();

  const c = company as unknown as {
    subscription_end_date: string | null;
    subscription_status: SubscriptionStatus | "none";
    subscription_plan: SubscriptionPlan | null;
  } | null;
  if (!c) return { new_end_date: null, error: "Company not found" };

  const now = new Date();
  const currentEnd = c.subscription_end_date ? new Date(c.subscription_end_date) : now;
  const isExpired = c.subscription_status !== "active" || currentEnd < now;

  // For active subs: extend from current end. For expired: from now or custom.
  const baseDate = isExpired
    ? (customStartDate ? new Date(customStartDate) : now)
    : currentEnd;

  const newEnd = addDuration(baseDate, duration, customStartDate);
  const newStart = isExpired ? (customStartDate ?? now.toISOString()) : c.subscription_end_date!;
  const plan = c.subscription_plan ?? "monthly";
  const planInfo = getPlan(plan);

  const { error: updateErr } = await supabase
    .from("consulting_companies")
    .update({
      subscription_status: "active",
      subscription_end_date: newEnd.toISOString(),
      subscription_start_date: isExpired ? newStart : undefined,
      updated_at: now.toISOString(),
    })
    .eq("id", companyId);
  if (updateErr) {
    return { new_end_date: null, error: updateErr.message };
  }

  // Record history
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan,
    start_date: newStart,
    end_date: newEnd.toISOString(),
    amount: planInfo.price,
    currency: planInfo.currency,
    action_type: "extension",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? `Extended by ${duration}`,
  });

  await logOwnerAction(ownerId, ownerEmail, "extend_subscription", "company", companyId, {
    duration,
    new_end_date: newEnd.toISOString(),
  });

  return { new_end_date: newEnd.toISOString(), error: null };
}

/** Change the subscription plan (upgrade). */
export async function changeSubscriptionPlan(
  companyId: string,
  newPlan: SubscriptionPlan,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<{ error: string | null }> {
  const planInfo = getPlan(newPlan);
  const now = new Date();
  const newEnd = computeEndDate(now, newPlan);

  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_plan: newPlan,
      subscription_start_date: now.toISOString(),
      subscription_end_date: newEnd.toISOString(),
      subscription_status: "active",
      updated_at: now.toISOString(),
    })
    .eq("id", companyId);
  if (error) return { error: error.message };

  await supabase.from("consulting_subscriptions").insert({
    consulting_company_id: companyId,
    plan: newPlan,
    status: "active",
    start_date: now.toISOString(),
    end_date: newEnd.toISOString(),
    auto_renewal: false,
    amount: planInfo.price,
    currency: planInfo.currency,
    created_by: ownerId,
  });

  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: newPlan,
    start_date: now.toISOString(),
    end_date: newEnd.toISOString(),
    amount: planInfo.price,
    currency: planInfo.currency,
    action_type: "plan_change",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? `Plan changed to ${planInfo.name}`,
  });

  await logOwnerAction(ownerId, ownerEmail, "change_plan", "company", companyId, {
    new_plan: newPlan,
    new_end_date: newEnd.toISOString(),
  });

  return { error: null };
}

/** Suspend a consulting account. */
export async function suspendCompany(
  companyId: string,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) {
    console.error("suspendCompany error:", error);
    return false;
  }
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: "monthly",
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    action_type: "suspension",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? "Suspended by owner",
  });
  await logOwnerAction(ownerId, ownerEmail, "suspend_company", "company", companyId, { note });
  return true;
}

/** Reactivate a suspended/expired account. */
export async function reactivateCompany(
  companyId: string,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) {
    console.error("reactivateCompany error:", error);
    return false;
  }
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: "monthly",
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    action_type: "reactivation",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? "Reactivated by owner",
  });
  await logOwnerAction(ownerId, ownerEmail, "reactivate_company", "company", companyId, { note });
  return true;
}

/** Cancel a subscription (at end of period). */
export async function cancelSubscription(
  companyId: string,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) {
    console.error("cancelSubscription error:", error);
    return false;
  }
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: "monthly",
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    action_type: "cancellation",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? "Cancelled by owner",
  });
  await logOwnerAction(ownerId, ownerEmail, "cancel_subscription", "company", companyId, { note });
  return true;
}

/** Set a custom expiration date. */
export async function setCustomExpiration(
  companyId: string,
  newEndDate: string,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_end_date: newEndDate,
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) {
    console.error("setCustomExpiration error:", error);
    return false;
  }
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: "monthly",
    start_date: new Date().toISOString(),
    end_date: newEndDate,
    action_type: "custom",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? `Custom expiration set to ${newEndDate}`,
  });
  await logOwnerAction(ownerId, ownerEmail, "set_custom_expiration", "company", companyId, {
    new_end_date: newEndDate,
  });
  return true;
}

// ── Audit log ──────────────────────────────────────────────

export interface OwnerAuditLog {
  id: string;
  owner_id: string;
  owner_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
}

/** Record an owner action in the audit log. */
export async function logOwnerAction(
  ownerId: string,
  ownerEmail: string,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  await supabase.from("owner_audit_logs").insert({
    owner_id: ownerId,
    owner_email: ownerEmail,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
  });
}

/** Fetch audit logs (owner only). */
export async function fetchAuditLogs(limit = 100): Promise<OwnerAuditLog[]> {
  const { data, error } = await supabase
    .from("owner_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchAuditLogs error:", error);
    return [];
  }
  return (data ?? []) as unknown as OwnerAuditLog[];
}

// ── Dashboard analytics ────────────────────────────────────

export interface OwnerDashboardStats {
  // User stats
  totalAccounts: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalOrdinaryUsers: number;
  totalConsultingApplicants: number;
  totalConsultingAccounts: number;
  totalActivePremium: number;
  totalExpiredSubscriptions: number;
  pendingConsultingApprovals: number;
  // Revenue
  totalSubscriptionRevenue: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  // Subscription summary
  activeMonthly: number;
  activeQuarterly: number;
  activeAnnual: number;
  expiringWithin7Days: number;
  expiringWithin30Days: number;
  cancelledSubscriptions: number;
  suspendedAccounts: number;
}

/**
 * Fetch real platform-wide analytics for the Owner Dashboard.
 * Returns zeros when no data — never fake values.
 */
export async function fetchOwnerDashboardStats(): Promise<OwnerDashboardStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const empty: OwnerDashboardStats = {
    totalAccounts: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    totalOrdinaryUsers: 0,
    totalConsultingApplicants: 0,
    totalConsultingAccounts: 0,
    totalActivePremium: 0,
    totalExpiredSubscriptions: 0,
    pendingConsultingApprovals: 0,
    totalSubscriptionRevenue: 0,
    revenueThisMonth: 0,
    revenueThisYear: 0,
    activeMonthly: 0,
    activeQuarterly: 0,
    activeAnnual: 0,
    expiringWithin7Days: 0,
    expiringWithin30Days: 0,
    cancelledSubscriptions: 0,
    suspendedAccounts: 0,
  };

  try {
    // Profile counts — run in parallel
    const [
      totalRes,
      todayRes,
      weekRes,
      monthRes,
      ordinaryRes,
      applicantRes,
      premiumRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfToday.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfWeek.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "ordinary"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "consulting_applicant"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "premium_consulting"),
    ]);

    // Company counts
    const [activePremiumRes, expiredRes, cancelledRes, suspendedRes] = await Promise.all([
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "expired"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "cancelled"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "suspended"),
    ]);

    // Plan breakdown
    const [monthlyRes, quarterlyRes, annualRes] = await Promise.all([
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .eq("subscription_plan", "monthly"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .eq("subscription_plan", "quarterly"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .eq("subscription_plan", "annual"),
    ]);

    // Expiring soon (active + end_date within 7/30 days)
    const [expiring7Res, expiring30Res] = await Promise.all([
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .gte("subscription_end_date", now.toISOString())
        .lte("subscription_end_date", in7Days.toISOString()),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .gte("subscription_end_date", now.toISOString())
        .lte("subscription_end_date", in30Days.toISOString()),
    ]);

    // Pending payment approvals
    const pendingRes = await supabase
      .from("owner_payment_requests")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending_verification");

    // Revenue from consulting_payments (type=subscription, status=paid)
    const { data: paidPayments } = await supabase
      .from("consulting_payments")
      .select("gross_amount, paid_at, currency")
      .eq("type", "subscription")
      .eq("status", "paid");

    const paid = (paidPayments ?? []) as unknown as {
      gross_amount: number;
      paid_at: string | null;
      currency: string;
    }[];
    const totalRevenue = paid.reduce((s, p) => s + Number(p.gross_amount), 0);
    const monthRevenue = paid
      .filter((p) => p.paid_at && new Date(p.paid_at) >= startOfMonth)
      .reduce((s, p) => s + Number(p.gross_amount), 0);
    const yearRevenue = paid
      .filter((p) => p.paid_at && new Date(p.paid_at) >= startOfYear)
      .reduce((s, p) => s + Number(p.gross_amount), 0);

    return {
      totalAccounts: totalRes.count ?? 0,
      newUsersToday: todayRes.count ?? 0,
      newUsersThisWeek: weekRes.count ?? 0,
      newUsersThisMonth: monthRes.count ?? 0,
      totalOrdinaryUsers: ordinaryRes.count ?? 0,
      totalConsultingApplicants: applicantRes.count ?? 0,
      totalConsultingAccounts: (activePremiumRes.count ?? 0) + (expiredRes.count ?? 0),
      totalActivePremium: premiumRes.count ?? 0,
      totalExpiredSubscriptions: expiredRes.count ?? 0,
      pendingConsultingApprovals: pendingRes.count ?? 0,
      totalSubscriptionRevenue: totalRevenue,
      revenueThisMonth: monthRevenue,
      revenueThisYear: yearRevenue,
      activeMonthly: monthlyRes.count ?? 0,
      activeQuarterly: quarterlyRes.count ?? 0,
      activeAnnual: annualRes.count ?? 0,
      expiringWithin7Days: expiring7Res.count ?? 0,
      expiringWithin30Days: expiring30Res.count ?? 0,
      cancelledSubscriptions: cancelledRes.count ?? 0,
      suspendedAccounts: suspendedRes.count ?? 0,
    };
  } catch (err) {
    console.error("fetchOwnerDashboardStats error:", err);
    return empty;
  }
}

// ── Business stats for a single company (Consulting Details) ─

export interface CompanyBusinessStats {
  packageCount: number;
  clientCount: number;
  applicationCount: number;
  totalSales: number;
  outstandingPayments: number;
  posRevenue: number;
  cashierIncome: number;
  cashierExpenses: number;
}

export async function fetchCompanyBusinessStats(
  companyId: string,
): Promise<CompanyBusinessStats> {
  const empty: CompanyBusinessStats = {
    packageCount: 0,
    clientCount: 0,
    applicationCount: 0,
    totalSales: 0,
    outstandingPayments: 0,
    posRevenue: 0,
    cashierIncome: 0,
    cashierExpenses: 0,
  };
  try {
    const [pkgRes, clientRes, appRes] = await Promise.all([
      supabase
        .from("consulting_packages")
        .select("*", { count: "exact", head: true })
        .eq("consulting_company_id", companyId),
      supabase
        .from("consulting_clients")
        .select("*", { count: "exact", head: true })
        .eq("consulting_company_id", companyId)
        .eq("is_archived", false),
      supabase
        .from("consulting_applications")
        .select("*", { count: "exact", head: true })
        .eq("consulting_company_id", companyId),
    ]);

    const { data: payments } = await supabase
      .from("consulting_payments")
      .select("gross_amount, status, type")
      .eq("consulting_company_id", companyId);
    const pays = (payments ?? []) as unknown as {
      gross_amount: number;
      status: string;
      type: string;
    }[];
    const totalSales = pays
      .filter((p) => p.status === "paid" && p.type === "package")
      .reduce((s, p) => s + Number(p.gross_amount), 0);
    const outstanding = pays
      .filter((p) => p.status === "pending" || p.status === "partial")
      .reduce((s, p) => s + Number(p.gross_amount), 0);

    return {
      packageCount: pkgRes.count ?? 0,
      clientCount: clientRes.count ?? 0,
      applicationCount: appRes.count ?? 0,
      totalSales,
      outstandingPayments: outstanding,
      posRevenue: 0, // POS revenue is in localStorage; computed by company users
      cashierIncome: 0,
      cashierExpenses: 0,
    };
  } catch (err) {
    console.error("fetchCompanyBusinessStats error:", err);
    return empty;
  }
}

// ── Subscription date helpers ──────────────────────────────

/** Days remaining until expiration (negative if expired). */
export function daysRemaining(endDate: string | null): number {
  if (!endDate) return 0;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/** Subscription progress percentage (0–100). */
export function subscriptionProgress(
  startDate: string | null,
  endDate: string | null,
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export type SubscriptionDisplayStatus =
  | "pending"
  | "active"
  | "expiring_soon"
  | "expired"
  | "suspended"
  | "cancelled";

/** Derive display status from company fields. */
export function deriveDisplayStatus(
  company: Pick<
    ConsultingCompany,
    "subscription_status" | "subscription_end_date"
  >,
): SubscriptionDisplayStatus {
  const status = company.subscription_status;
  if (status === "suspended") return "suspended";
  if (status === "cancelled") return "cancelled";
  if (status === "none" || !status) return "pending";
  if (status === "expired") return "expired";
  const days = daysRemaining(company.subscription_end_date);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring_soon";
  return "active";
}

// ── Find user by email (for manual activation) ─────────────

export interface FoundUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  user_type: UserType;
  account_status: AccountStatus;
  created_at: string | null;
  is_registered: boolean;
}

/** Find a user by email. Returns null if not registered. */
export async function findUserByEmail(email: string): Promise<FoundUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, avatar_url, user_type, account_status, created_at")
    .ilike("email", email.trim())
    .maybeSingle();
  if (error || !data) return null;
  return { ...(data as unknown as FoundUser), is_registered: true };
}

export { CONSULTING_PLANS, getPlan, computeEndDate };
