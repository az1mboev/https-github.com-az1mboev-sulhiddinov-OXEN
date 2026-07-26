import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";

import {
  fetchMyConsultingCompany,
  fetchMyMembership,
  updateMemberRole as apiUpdateMemberRole,
  updateMemberStatus as apiUpdateMemberStatus,
  removeMember as apiRemoveMember,
  logActivity as apiLogActivity,
  computeEndDate,
  type ConsultingCompany,
  type ConsultingMember,
  type MemberRole,
  type MemberStatus,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/consulting";
import {
  testUpdateMemberRole,
  testUpdateMemberStatus,
  testRemoveMember,
  testLogActivity,
} from "@/lib/consulting-test-mode";
import { useAuth } from "@/contexts/AuthContext";
import { CONSULTING_OPEN_PREVIEW_MODE, PREVIEW_COMPANY_LOGO, PREVIEW_COMPANY_NAME } from "@/lib/consulting-preview";

/* ============================================================
   ConsultingContext — current company, membership, RBAC,
   and subscription-gated access.

   Test-mode fallback: when the Supabase consulting tables are not
   yet applied (or the user has no member row), we synthesize a
   company + member from the localStorage onboarding snapshot
   written by the Checkout flow. The subscription status is tracked
   in a separate localStorage key so the expired → renew flow can
   be simulated end-to-end without a database.

   Exposed via useConsulting() + useConsultingRole().
   ============================================================ */

/** LocalStorage snapshot written by Checkout.tsx (test mode). */
interface OnboardingSnapshot {
  plan: ConsultingCompany["subscription_plan"];
  planName: string;
  price: number;
  months: number;
  company: {
    name: string;
    legalName: string;
    country: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    website: string | null;
    managerFullName: string;
    managerPhone: string;
    managerEmail: string;
    description: string;
    logoDataUrl: string | null;
  };
  card: { brand: string; last4: string; masked: string };
  createdAt: string;
  testMode: boolean;
}

const ONBOARDING_KEY = "oxen.consulting.onboarding";

/** Test-mode subscription state (separate from onboarding so renewals update it). */
interface TestSubscriptionState {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  amount: number;
  cardBrand: string;
  cardLast4: string;
  cardMasked: string;
  /** History of subscription payments for the Billing page. */
  history: Array<{
    id: string;
    date: string;
    plan: SubscriptionPlan;
    amount: number;
    cardMasked: string;
    type: "subscription" | "renewal";
  }>;
}

const TEST_SUB_KEY = "oxen.consulting.test.subscription";

/**
 * Preview-mode company: synthesized entirely client-side when
 * CONSULTING_OPEN_PREVIEW_MODE is on and the user has no real or test-mode
 * consulting company. No database rows are created. The same company id is
 * reused for the user across sessions so any test-mode data they create
 * (packages, clients, etc.) stays associated with the preview company.
 */
const PREVIEW_COMPANY_KEY = "oxen.consulting.preview.company";

interface PreviewCompanyState {
  companyId: string;
  createdAt: string;
}

function readPreviewCompany(userId: string): PreviewCompanyState | null {
  try {
    const raw = localStorage.getItem(`${PREVIEW_COMPANY_KEY}.${userId}`);
    return raw ? (JSON.parse(raw) as PreviewCompanyState) : null;
  } catch {
    return null;
  }
}

function writePreviewCompany(userId: string, state: PreviewCompanyState): void {
  try {
    localStorage.setItem(`${PREVIEW_COMPANY_KEY}.${userId}`, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/**
 * Synthesize a preview company + owner member. Uses a stable company id per
 * user so test-mode data (packages, clients, employees, etc.) persists across
 * sessions under `oxen.consulting.test.<companyId>.*` keys.
 */
function synthesizePreviewCompany(userId: string): { company: ConsultingCompany; member: ConsultingMember } {
  const existing = readPreviewCompany(userId);
  const now = new Date().toISOString();
  const companyId = existing?.companyId ?? `preview-company-${userId}`;
  if (!existing) {
    writePreviewCompany(userId, { companyId, createdAt: now });
  }
  const createdAt = existing?.createdAt ?? now;
  // Subscription is treated as "active" with a far-future end date so the
  // preview dashboard is fully usable. When the flag is flipped off, these
  // synthesized rows disappear and the real payment-gated flow takes over.
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 1);
  return {
    company: {
      id: companyId,
      owner_id: userId,
      name: PREVIEW_COMPANY_NAME,
      legal_name: PREVIEW_COMPANY_NAME,
      registration_number: null,
      country: null,
      city: null,
      address: null,
      logo_url: PREVIEW_COMPANY_LOGO,
      cover_image_url: null,
      description:
        "This is a preview consulting workspace running in demo mode. No payment was required and no real data is stored on the server.",
      contact_email: null,
      contact_phone: null,
      website: null,
      working_hours: null,
      supported_languages: null,
      destination_countries: null,
      years_experience: 0,
      manager_full_name: null,
      manager_phone: null,
      manager_email: null,
      license_info: null,
      is_published: false,
      is_verified: false,
      verification_status: "pending",
      subscription_status: "active",
      subscription_plan: "annual",
      subscription_start_date: createdAt,
      subscription_end_date: farFuture.toISOString(),
      created_at: createdAt,
      updated_at: now,
    },
    member: {
      id: `preview-member-${userId}`,
      consulting_company_id: companyId,
      user_id: userId,
      role: "owner",
      status: "active",
      invited_by: userId,
      last_active_at: now,
      created_at: createdAt,
      updated_at: now,
    },
  };
}

function readOnboarding(): OnboardingSnapshot | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? (JSON.parse(raw) as OnboardingSnapshot) : null;
  } catch {
    return null;
  }
}

function readTestSubscription(): TestSubscriptionState | null {
  try {
    const raw = localStorage.getItem(TEST_SUB_KEY);
    return raw ? (JSON.parse(raw) as TestSubscriptionState) : null;
  } catch {
    return null;
  }
}

function writeTestSubscription(state: TestSubscriptionState): void {
  try {
    localStorage.setItem(TEST_SUB_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Normalized subscription access status. Only "active" grants dashboard access. */
export type SubscriptionAccess = "active" | "expired" | "none";

/** Synthesize a ConsultingCompany + ConsultingMember from the onboarding snapshot. */
function synthesizeFromSnapshot(
  userId: string,
  snap: OnboardingSnapshot,
  sub: TestSubscriptionState | null,
): { company: ConsultingCompany; member: ConsultingMember } {
  const now = new Date().toISOString();
  const companyId = `test-company-${userId}`;
  const memberId = `test-member-${userId}`;
  const startDate = sub?.startDate ?? snap.createdAt;
  const endDate = sub?.endDate ?? computeEndDate(new Date(snap.createdAt), snap.plan).toISOString();
  const status: SubscriptionStatus = sub?.status ?? "active";
  return {
    company: {
      id: companyId,
      owner_id: userId,
      name: snap.company.name,
      legal_name: snap.company.legalName || null,
      registration_number: null,
      country: snap.company.country || null,
      city: snap.company.city || null,
      address: snap.company.address || null,
      logo_url: snap.company.logoDataUrl ?? null,
      cover_image_url: null,
      description: snap.company.description || null,
      contact_email: snap.company.email || null,
      contact_phone: snap.company.phone || null,
      website: snap.company.website ?? null,
      working_hours: null,
      supported_languages: null,
      destination_countries: null,
      years_experience: 0,
      manager_full_name: snap.company.managerFullName || null,
      manager_phone: snap.company.managerPhone || null,
      manager_email: snap.company.managerEmail || null,
      license_info: null,
      is_published: false,
      is_verified: false,
      verification_status: "pending",
      subscription_status: status,
      subscription_plan: snap.plan,
      subscription_start_date: startDate,
      subscription_end_date: endDate,
      created_at: snap.createdAt,
      updated_at: now,
    },
    member: {
      id: memberId,
      consulting_company_id: companyId,
      user_id: userId,
      role: "owner",
      status: "active",
      invited_by: userId,
      last_active_at: now,
      created_at: snap.createdAt,
      updated_at: now,
    },
  };
}

/** Derive normalized access status from a company row + current time. */
function deriveAccessStatus(
  company: ConsultingCompany | null,
  testSub: TestSubscriptionState | null,
): SubscriptionAccess {
  if (!company) return "none";
  // Test-mode override (simulated expiration)
  if (testSub) {
    if (testSub.status === "expired") return "expired";
    if (testSub.status === "active") {
      const end = new Date(testSub.endDate).getTime();
      if (end < Date.now()) return "expired";
      return "active";
    }
    if (testSub.status === "cancelled" || testSub.status === "suspended") return "expired";
  }
  const status = company.subscription_status;
  if (!status || status === "none") return "none";
  if (status === "active" || status === "trial") {
    // Also check end date hasn't passed
    if (company.subscription_end_date) {
      const end = new Date(company.subscription_end_date).getTime();
      if (end < Date.now()) return "expired";
    }
    return "active";
  }
  // past_due, expired, cancelled, suspended → blocked
  return "expired";
}

interface ConsultingContextValue {
  company: ConsultingCompany | null;
  member: ConsultingMember | null;
  role: MemberRole | null;
  loading: boolean;
  /** True if running off the localStorage test-mode snapshot (Supabase tables not ready). */
  isTestMode: boolean;
  /** True if the current user is an active member of a consulting company (regardless of subscription). */
  isMember: boolean;
  /** True if owner or administrator. */
  isAdmin: boolean;
  /** Normalized subscription access: "active" | "expired" | "none". */
  subscriptionAccess: SubscriptionAccess;
  /** True only when subscription is active and dashboard is fully accessible. */
  hasActiveSubscription: boolean;
  /** True when user has a company but subscription expired (renewal screen shown). */
  hasExpiredSubscription: boolean;
  /** ISO end date of the current subscription, or null. */
  subscriptionEndDate: string | null;
  /** Current subscription plan, or null. */
  subscriptionPlan: SubscriptionPlan | null;
  /** Permission check helper. Use '*' for full-access roles. */
  can: (permission: string) => boolean;
  /** Refresh company + membership. */
  refresh: () => void;
  /** Change a member's role (admin only). */
  changeMemberRole: (memberId: string, role: MemberRole) => Promise<boolean>;
  /** Change a member's status (admin only). */
  changeMemberStatus: (memberId: string, status: MemberStatus) => Promise<boolean>;
  /** Remove a member (set status='removed'). Admin only. */
  removeMember: (memberId: string) => Promise<boolean>;
  /** Append an activity log entry. */
  logActivity: (
    action: string,
    entityType?: string | null,
    entityId?: string | null,
    metadata?: Record<string, unknown> | null,
  ) => Promise<boolean>;
  /** Renew the subscription for the current company (preserves company id). Test mode writes to localStorage. */
  renewSubscription: (input: {
    plan: SubscriptionPlan;
    amount: number;
    cardBrand: string;
    cardLast4: string;
    cardMasked: string;
  }) => Promise<boolean>;
  /** Test-mode helper: force the current subscription into "expired" state (for testing the renewal flow). */
  simulateExpiration: () => void;
}

function useConsultingState() {
  const { user, ready: authReady } = useAuth();
  const queryClient = useQueryClient();

  const isEnabled = !!user && !user.isGuest && authReady;

  const { data: membership, isLoading: mbLoading } = useQuery({
    queryKey: ["consulting-membership", user?.id],
    queryFn: () => fetchMyMembership(user!.id),
    enabled: isEnabled,
    staleTime: 30_000,
    retry: false,
  });

  const companyId = membership?.consulting_company_id ?? null;

  const { data: company, isLoading: coLoading } = useQuery({
    queryKey: ["consulting-company", companyId ?? "none", user?.id],
    queryFn: () => fetchMyConsultingCompany(user!.id),
    enabled: isEnabled,
    staleTime: 30_000,
    retry: false,
  });

  // Test-mode fallback: if Supabase returned no membership/company but we have
  // an onboarding snapshot in localStorage, synthesize a test company so the
  // dashboard renders without crashing.
  const snapshot = useMemo(() => (isEnabled ? readOnboarding() : null), [isEnabled]);
  const useFallback = isEnabled && !membership && !company && !!snapshot;

  // Preview mode: when the flag is on and the user has no real membership and
  // no onboarding snapshot, synthesize a preview company so every signed-in
  // user can open the dashboard. This takes priority over the onboarding
  // fallback so a brand-new user (who never went through checkout) still sees
  // the dashboard.
  const usePreview =
    CONSULTING_OPEN_PREVIEW_MODE && isEnabled && !membership && !company && !useFallback;

  const previewSynthesized = useMemo(() => {
    if (!usePreview || !user) return null;
    return synthesizePreviewCompany(user.id);
  }, [usePreview, user]);

  // Read test subscription state (re-read on each render via state below)
  const testSub = useMemo(
    () => (useFallback ? readTestSubscription() : null),
    [useFallback],
  );

  const synthesized = useMemo(() => {
    if (usePreview && previewSynthesized) return previewSynthesized;
    if (!useFallback || !snapshot || !user) return null;
    return synthesizeFromSnapshot(user.id, snapshot, testSub);
  }, [usePreview, previewSynthesized, useFallback, snapshot, user, testSub]);

  const effectiveCompany = company ?? synthesized?.company ?? null;
  const effectiveMember = membership ?? synthesized?.member ?? null;
  const isTestMode = !!synthesized;

  const loading = !authReady || (isEnabled && !useFallback && (mbLoading || coLoading));

  const role = effectiveMember?.role ?? null;
  const isMember = !!effectiveMember;
  const isAdmin = role === "owner" || role === "administrator";

  const subscriptionAccess = useMemo<SubscriptionAccess>(() => {
    if (usePreview) return "active";
    return deriveAccessStatus(effectiveCompany, isTestMode ? testSub : null);
  }, [usePreview, effectiveCompany, isTestMode, testSub]);
  const hasActiveSubscription = subscriptionAccess === "active";
  const hasExpiredSubscription = subscriptionAccess === "expired";
  const subscriptionEndDate = effectiveCompany?.subscription_end_date ?? null;
  const subscriptionPlan = effectiveCompany?.subscription_plan ?? null;

  const can = useCallback(
    (permission: string): boolean => {
      if (!role) return false;
      if (role === "owner" || role === "administrator") return true;
      // Full permission map per role. "*" = all permissions.
      // Aligned with POS/Cashier spec:
      //   Owner        → full access (POS, Cashier, transactions, reports, accounts, categories)
      //   Manager      → view POS, add clients, add client payments, view assigned clients, limited cashier
      //   Employee     → view assigned clients, add notes/documents, no full company profit
      //   Cashier      → add income/expenses, receive client payments, print receipts, no owner settings
      const map: Record<MemberRole, string[]> = {
        owner: ["*"],
        administrator: ["*"],
        manager: [
          "clients:write", "clients:read", "clients:read_assigned",
          "applications:write", "applications:read", "applications:read_assigned",
          "packages:read", "packages:write",
          "pos:read", "pos:write",
          "payments:read", "payments:write",
          "employees:read",
          "members:read",
          "activity:read",
          "analytics:read",
          "cashier:read",
          "reports:read",
          "reminders:read",
        ],
        consultant: [
          "clients:read_assigned",
          "applications:read_assigned",
          "pos:read",
          "payments:read",
          "reminders:read",
          "activity:read",
        ],
        support_agent: [
          "clients:read",
          "messages:write",
          "activity:read",
        ],
        finance_manager: [
          "payments:read", "payments:write",
          "refunds:write",
          "cashier:read", "cashier:write",
          "pos:read", "pos:write",
          "reports:read",
          "reminders:read",
          "analytics:read",
          "activity:read",
        ],
        content_manager: [
          "packages:write", "packages:read",
          "posts:write", "posts:read",
          "activity:read",
        ],
        read_only: ["*:read"],
      };
      const allowed = map[role] ?? [];
      if (allowed.includes("*")) return true;
      // "*:read" matches any "<resource>:read".
      if (allowed.includes("*:read") && permission.endsWith(":read")) return true;
      if (allowed.includes(permission)) return true;
      const resource = permission.split(":")[0];
      return allowed.includes(`${resource}:*`);
    },
    [role],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["consulting-membership"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-company"] });
  }, [queryClient]);

  const changeMemberRole = useCallback(
    async (memberId: string, newRole: MemberRole): Promise<boolean> => {
      if (isTestMode) {
        const ok = !!testUpdateMemberRole(effectiveCompany?.id ?? "", memberId, newRole);
        if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
        return ok;
      }
      const ok = await apiUpdateMemberRole(memberId, newRole);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      return ok;
    },
    [queryClient, isTestMode, effectiveCompany],
  );

  const changeMemberStatus = useCallback(
    async (memberId: string, status: MemberStatus): Promise<boolean> => {
      if (isTestMode) {
        const ok = !!testUpdateMemberStatus(effectiveCompany?.id ?? "", memberId, status);
        if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
        return ok;
      }
      const ok = await apiUpdateMemberStatus(memberId, status);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      return ok;
    },
    [queryClient, isTestMode, effectiveCompany],
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      if (isTestMode) {
        const ok = testRemoveMember(effectiveCompany?.id ?? "", memberId);
        if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
        return ok;
      }
      const ok = await apiRemoveMember(memberId);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      return ok;
    },
    [queryClient, isTestMode, effectiveCompany],
  );

  const logActivity = useCallback(
    async (
      action: string,
      entityType?: string | null,
      entityId?: string | null,
      metadata?: Record<string, unknown> | null,
    ): Promise<boolean> => {
      const cid = effectiveCompany?.id;
      if (!cid) return false;
      if (isTestMode) {
        testLogActivity(cid, effectiveMember?.user_id ?? null, action, entityType, entityId, metadata);
        queryClient.invalidateQueries({ queryKey: ["consulting-activity"] });
        return true;
      }
      const ok = await apiLogActivity(cid, effectiveMember?.user_id ?? null, action, entityType, entityId, metadata);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-activity"] });
      return ok;
    },
    [effectiveCompany, effectiveMember, isTestMode, queryClient],
  );

  const renewSubscription = useCallback(
    async (input: {
      plan: SubscriptionPlan;
      amount: number;
      cardBrand: string;
      cardLast4: string;
      cardMasked: string;
    }): Promise<boolean> => {
      const cid = effectiveCompany?.id;
      if (!cid) return false;
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = computeEndDate(now, input.plan).toISOString();

      if (isTestMode) {
        const existing = readTestSubscription();
        const historyEntry = {
          id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          date: startDate,
          plan: input.plan,
          amount: input.amount,
          cardMasked: input.cardMasked,
          type: (existing ? "renewal" : "subscription") as "subscription" | "renewal",
        };
        const next: TestSubscriptionState = {
          status: "active",
          plan: input.plan,
          startDate,
          endDate,
          amount: input.amount,
          cardBrand: input.cardBrand,
          cardLast4: input.cardLast4,
          cardMasked: input.cardMasked,
          history: [...(existing?.history ?? []), historyEntry],
        };
        writeTestSubscription(next);
        queryClient.invalidateQueries({ queryKey: ["consulting-company"] });
        return true;
      }

      // Real mode: update company subscription fields + insert a new subscription row.
      // (Supabase calls go here once tables are applied; preserve company id.)
      // For now this mirrors the createConsultingAccount subscription insert pattern.
      try {
        const { supabase } = await import("@/lib/supabase");
        await supabase
          .from("consulting_companies")
          .update({
            subscription_status: "active",
            subscription_plan: input.plan,
            subscription_start_date: startDate,
            subscription_end_date: endDate,
            updated_at: now.toISOString(),
          })
          .eq("id", cid);
        await supabase.from("consulting_subscriptions").insert({
          consulting_company_id: cid,
          plan: input.plan,
          status: "active",
          start_date: startDate,
          end_date: endDate,
          auto_renewal: true,
          amount: input.amount,
          currency: "USD",
          card_brand: input.cardBrand,
          card_last4: input.cardLast4,
          created_by: effectiveMember?.user_id ?? null,
        });
        queryClient.invalidateQueries({ queryKey: ["consulting-company"] });
        return true;
      } catch (err) {
        console.error("renewSubscription error:", err);
        return false;
      }
    },
    [effectiveCompany, effectiveMember, isTestMode, queryClient],
  );

  const simulateExpiration = useCallback(() => {
    if (!isTestMode) return;
    const existing = readTestSubscription();
    if (!existing) {
      // Build one from the onboarding snapshot if missing.
      const snap = readOnboarding();
      if (!snap) return;
      const start = new Date(snap.createdAt);
      const end = computeEndDate(start, snap.plan);
      writeTestSubscription({
        status: "expired",
        plan: snap.plan,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        amount: snap.price,
        cardBrand: snap.card.brand,
        cardLast4: snap.card.last4,
        cardMasked: snap.card.masked,
        history: [],
      });
    } else {
      writeTestSubscription({ ...existing, status: "expired" });
    }
    queryClient.invalidateQueries({ queryKey: ["consulting-company"] });
  }, [isTestMode, queryClient]);

  return useMemo<ConsultingContextValue>(
    () => ({
      company: effectiveCompany,
      member: effectiveMember,
      role,
      loading,
      isTestMode,
      isMember,
      isAdmin,
      subscriptionAccess,
      hasActiveSubscription,
      hasExpiredSubscription,
      subscriptionEndDate,
      subscriptionPlan,
      can,
      refresh,
      changeMemberRole,
      changeMemberStatus,
      removeMember,
      logActivity,
      renewSubscription,
      simulateExpiration,
    }),
    [
      effectiveCompany, effectiveMember, role, loading, isTestMode, isMember, isAdmin,
      subscriptionAccess, hasActiveSubscription, hasExpiredSubscription, subscriptionEndDate,
      subscriptionPlan, can, refresh, changeMemberRole, changeMemberStatus, removeMember,
      logActivity, renewSubscription, simulateExpiration,
    ],
  );
}

const [ConsultingProvider, useConsulting] = createContextHook(useConsultingState);

export { ConsultingProvider, useConsulting };

/** RBAC helper hook — convenience around useConsulting().can(). */
export function useConsultingRole() {
  const { role, isAdmin, isMember, can, hasActiveSubscription, subscriptionAccess } = useConsulting();
  return { role, isAdmin, isMember, can, hasActiveSubscription, subscriptionAccess };
}
