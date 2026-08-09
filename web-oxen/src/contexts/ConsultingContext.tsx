import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";

import {
  fetchUserAgencies,
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
  type AgencyMembership,
} from "@/lib/consulting";
import { useAuth } from "@/contexts/AuthContext";
import { checkApprovedApplication } from "@/lib/agency-applications";

/* ============================================================
   ConsultingContext — current company, membership, RBAC,
   and subscription-gated access.

   REAL DATA ONLY. No demo/fallback/test-mode synthesis.
   All agency data comes from Supabase via fetchUserAgencies().
   The active agency is controlled by activeAgencyId (persisted
   in localStorage per user). Users with zero agencies are
   redirected to /consulting/workspace by RequireConsultingMember.

   Exposed via useConsulting() + useConsultingRole().
   ============================================================ */

/** Normalized subscription access status. Only "active" grants dashboard access. */
export type SubscriptionAccess = "active" | "expired" | "none";

interface ConsultingContextValue {
  company: ConsultingCompany | null;
  member: ConsultingMember | null;
  role: MemberRole | null;
  loading: boolean;
  /** Always false — no test mode. Kept for API compatibility. */
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
  /** Renew the subscription for the current company. */
  renewSubscription: (input: {
    plan: SubscriptionPlan;
    amount: number;
    cardBrand: string;
    cardLast4: string;
    cardMasked: string;
  }) => Promise<boolean>;
  /** No-op when not in test mode. Kept for API compatibility. */
  simulateExpiration: () => void;
  // ── Multi-Agency Workspace ──
  /** All agencies the current user belongs to. */
  agencies: AgencyMembership[];
  /** The active agency ID (persisted in localStorage). */
  activeAgencyId: string | null;
  /** Switch the active agency context. */
  switchAgency: (agencyId: string) => void;
  /** True if user belongs to zero agencies (first-time CRM experience). */
  hasNoAgencies: boolean;
  /** True if the user has an approved agency application (via RPC). CRM access depends on this. */
  isApproved: boolean;
}

const ACTIVE_AGENCY_KEY = "oxen.consulting.activeAgencyId";

function readActiveAgencyId(userId: string): string | null {
  try {
    return localStorage.getItem(`${ACTIVE_AGENCY_KEY}.${userId}`);
  } catch {
    return null;
  }
}

function writeActiveAgencyId(userId: string, agencyId: string): void {
  try {
    localStorage.setItem(`${ACTIVE_AGENCY_KEY}.${userId}`, agencyId);
  } catch {
    /* ignore */
  }
}

/** Derive normalized access status from a company row + current time. */
function deriveAccessStatus(company: ConsultingCompany | null): SubscriptionAccess {
  if (!company) return "none";
  const status = company.subscription_status;
  if (!status || status === "none") return "none";
  if (status === "active" || status === "trial") {
    if (company.subscription_end_date) {
      const end = new Date(company.subscription_end_date).getTime();
      if (end < Date.now()) return "expired";
    }
    return "active";
  }
  // past_due, expired, cancelled, suspended → blocked
  return "expired";
}

function useConsultingState() {
  const { user, ready: authReady } = useAuth();
  const queryClient = useQueryClient();

  const isEnabled = !!user && !user.isGuest && authReady;

  // ── Multi-agency: fetch ALL agencies the user belongs to ──
  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ["consulting-agencies", user?.id],
    queryFn: () => fetchUserAgencies(user!.id),
    enabled: isEnabled,
    staleTime: 30_000,
    retry: false,
  });

  // ── Agency application approval check ──
  // CRM access is granted ONLY when this returns true.
  // Uses the security-definer RPC has_approved_agency_application().
  const { data: isApprovedData, isLoading: approvalLoading } = useQuery({
    queryKey: ["agency-application-approved", user?.id],
    queryFn: () => checkApprovedApplication(user!.id),
    enabled: isEnabled,
    staleTime: 60_000,
    retry: false,
  });

  const isApproved = isApprovedData === true;

  const agencyList = agencies ?? [];
  const hasNoAgencies = isEnabled && !agenciesLoading && agencyList.length === 0;

  // Determine the active agency ID
  const storedActiveId = useMemo(
    () => (isEnabled && user ? readActiveAgencyId(user.id) : null),
    [isEnabled, user],
  );

  const activeAgencyId = useMemo(() => {
    if (!agencyList.length) return null;
    // If stored ID is in the list, use it
    if (storedActiveId && agencyList.some((a) => a.company.id === storedActiveId)) {
      return storedActiveId;
    }
    // Default to first agency
    return agencyList[0].company.id;
  }, [agencyList, storedActiveId]);

  // Persist active agency ID
  useEffect(() => {
    if (activeAgencyId && user) {
      writeActiveAgencyId(user.id, activeAgencyId);
    }
  }, [activeAgencyId, user]);

  // Find the active agency's company + member from the list
  const activeAgency = useMemo(() => {
    if (!activeAgencyId) return null;
    return agencyList.find((a) => a.company.id === activeAgencyId) ?? null;
  }, [agencyList, activeAgencyId]);

  // ── Real data only — no fallback synthesis ──
  const effectiveCompany = activeAgency?.company ?? null;
  const effectiveMember = activeAgency?.member ?? null;
  const isTestMode = false;

  const loading = !authReady || (isEnabled && approvalLoading) || (isApproved && agenciesLoading);

  const role = effectiveMember?.role ?? null;
  const isMember = !!effectiveMember;
  const isAdmin = role === "owner" || role === "administrator";

  const subscriptionAccess = useMemo<SubscriptionAccess>(
    () => deriveAccessStatus(effectiveCompany),
    [effectiveCompany],
  );
  const hasActiveSubscription = subscriptionAccess === "active";
  const hasExpiredSubscription = subscriptionAccess === "expired";
  const subscriptionEndDate = effectiveCompany?.subscription_end_date ?? null;
  const subscriptionPlan = effectiveCompany?.subscription_plan ?? null;

  const can = useCallback(
    (permission: string): boolean => {
      if (!role) return false;
      if (role === "owner" || role === "administrator") return true;
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
      if (allowed.includes("*:read") && permission.endsWith(":read")) return true;
      if (allowed.includes(permission)) return true;
      const resource = permission.split(":")[0];
      return allowed.includes(`${resource}:*`);
    },
    [role],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["consulting-agencies"] });
  }, [queryClient]);

  // ── Multi-Agency: switch active agency context ──
  const switchAgency = useCallback(
    (agencyId: string) => {
      if (!user) return;
      writeActiveAgencyId(user.id, agencyId);
      queryClient.invalidateQueries({ queryKey: ["consulting-agencies"] });
    },
    [user, queryClient],
  );

  const changeMemberRole = useCallback(
    async (memberId: string, newRole: MemberRole): Promise<boolean> => {
      const ok = await apiUpdateMemberRole(memberId, newRole);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      return ok;
    },
    [queryClient],
  );

  const changeMemberStatus = useCallback(
    async (memberId: string, status: MemberStatus): Promise<boolean> => {
      const ok = await apiUpdateMemberStatus(memberId, status);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      return ok;
    },
    [queryClient],
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      const ok = await apiRemoveMember(memberId);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      return ok;
    },
    [queryClient],
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
      const ok = await apiLogActivity(cid, effectiveMember?.user_id ?? null, action, entityType, entityId, metadata);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-activity"] });
      return ok;
    },
    [effectiveCompany, effectiveMember, queryClient],
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
        queryClient.invalidateQueries({ queryKey: ["consulting-agencies"] });
        return true;
      } catch (err) {
        console.error("renewSubscription error:", err);
        return false;
      }
    },
    [effectiveCompany, effectiveMember, queryClient],
  );

  const simulateExpiration = useCallback(() => {
    // No-op — test mode disabled
  }, []);

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
      agencies: agencyList,
      activeAgencyId,
      switchAgency,
      hasNoAgencies,
      isApproved,
    }),
    [
      effectiveCompany, effectiveMember, role, loading, isTestMode, isMember, isAdmin,
      subscriptionAccess, hasActiveSubscription, hasExpiredSubscription, subscriptionEndDate,
      subscriptionPlan, can, refresh, changeMemberRole, changeMemberStatus, removeMember,
      logActivity, renewSubscription, simulateExpiration,
      agencyList, activeAgencyId, switchAgency, hasNoAgencies, isApproved,
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
