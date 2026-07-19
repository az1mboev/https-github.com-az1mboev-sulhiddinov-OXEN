import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";

import {
  fetchMyConsultingCompany,
  fetchMyMembership,
  updateMemberRole as apiUpdateMemberRole,
  updateMemberStatus as apiUpdateMemberStatus,
  type ConsultingCompany,
  type ConsultingMember,
  type MemberRole,
  type MemberStatus,
} from "@/lib/consulting";
import { useAuth } from "@/contexts/AuthContext";

/* ============================================================
   ConsultingContext — current company, membership, RBAC.

   Test-mode fallback: when the Supabase consulting tables are not
   yet applied (or the user has no member row), we synthesize a
   company + member from the localStorage onboarding snapshot
   written by the Checkout flow. This keeps the dashboard usable
   in test mode without crashing.

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

function readOnboarding(): OnboardingSnapshot | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? (JSON.parse(raw) as OnboardingSnapshot) : null;
  } catch {
    return null;
  }
}

/** Synthesize a ConsultingCompany + ConsultingMember from the onboarding snapshot. */
function synthesizeFromSnapshot(
  userId: string,
  snap: OnboardingSnapshot,
): { company: ConsultingCompany; member: ConsultingMember } {
  const now = new Date().toISOString();
  const companyId = `test-company-${userId}`;
  const memberId = `test-member-${userId}`;
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
      subscription_status: "active",
      subscription_plan: snap.plan,
      subscription_start_date: snap.createdAt,
      subscription_end_date: null,
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

interface ConsultingContextValue {
  company: ConsultingCompany | null;
  member: ConsultingMember | null;
  role: MemberRole | null;
  loading: boolean;
  /** True if running off the localStorage test-mode snapshot (Supabase tables not ready). */
  isTestMode: boolean;
  /** True if the current user is an active member of a consulting company. */
  isMember: boolean;
  /** True if owner or administrator. */
  isAdmin: boolean;
  /** Permission check helper. Use '*' for full-access roles. */
  can: (permission: string) => boolean;
  /** Refresh company + membership. */
  refresh: () => void;
  /** Change a member's role (admin only). */
  changeMemberRole: (memberId: string, role: MemberRole) => Promise<boolean>;
  /** Change a member's status (admin only). */
  changeMemberStatus: (memberId: string, status: MemberStatus) => Promise<boolean>;
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

  const synthesized = useMemo(() => {
    if (!useFallback || !snapshot || !user) return null;
    return synthesizeFromSnapshot(user.id, snapshot);
  }, [useFallback, snapshot, user]);

  const effectiveCompany = company ?? synthesized?.company ?? null;
  const effectiveMember = membership ?? synthesized?.member ?? null;
  const isTestMode = !!synthesized;

  const loading = !authReady || (isEnabled && !useFallback && (mbLoading || coLoading));

  const role = effectiveMember?.role ?? null;
  const isMember = !!effectiveMember;
  const isAdmin = role === "owner" || role === "administrator";

  const can = useCallback(
    (permission: string): boolean => {
      if (!role) return false;
      if (role === "owner" || role === "administrator") return true;
      if (role === "read_only") return permission.endsWith(":read") || permission === "*:read";
      if (permission === "*") return false;
      const map: Record<MemberRole, string[]> = {
        owner: ["*"],
        administrator: ["*"],
        manager: ["clients:write", "clients:read", "applications:write", "applications:read", "tasks:write", "tasks:read"],
        consultant: ["clients:read_assigned", "applications:read_assigned", "tasks:read"],
        support_agent: ["clients:read", "messages:write"],
        finance_manager: ["payments:read", "refunds:write"],
        content_manager: ["packages:write", "posts:write", "packages:read", "posts:read"],
        read_only: ["*:read"],
      };
      const allowed = map[role] ?? [];
      if (allowed.includes("*")) return true;
      return allowed.includes(permission) || allowed.includes(`${permission.split(":")[0]}:*`);
    },
    [role],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["consulting-membership"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-company"] });
  }, [queryClient]);

  const changeMemberRole = useCallback(
    async (memberId: string, newRole: MemberRole): Promise<boolean> => {
      if (isTestMode) return false;
      const ok = await apiUpdateMemberRole(memberId, newRole);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      return ok;
    },
    [queryClient, isTestMode],
  );

  const changeMemberStatus = useCallback(
    async (memberId: string, status: MemberStatus): Promise<boolean> => {
      if (isTestMode) return false;
      const ok = await apiUpdateMemberStatus(memberId, status);
      if (ok) queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      return ok;
    },
    [queryClient, isTestMode],
  );

  return useMemo<ConsultingContextValue>(
    () => ({
      company: effectiveCompany,
      member: effectiveMember,
      role,
      loading,
      isTestMode,
      isMember,
      isAdmin,
      can,
      refresh,
      changeMemberRole,
      changeMemberStatus,
    }),
    [effectiveCompany, effectiveMember, role, loading, isTestMode, isMember, isAdmin, can, refresh, changeMemberRole, changeMemberStatus],
  );
}

const [ConsultingProvider, useConsulting] = createContextHook(useConsultingState);

export { ConsultingProvider, useConsulting };

/** RBAC helper hook — convenience around useConsulting().can(). */
export function useConsultingRole() {
  const { role, isAdmin, isMember, can } = useConsulting();
  return { role, isAdmin, isMember, can };
}
