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
   Exposed via useConsulting() + useConsultingRole().
   ============================================================ */

interface ConsultingContextValue {
  company: ConsultingCompany | null;
  member: ConsultingMember | null;
  role: MemberRole | null;
  loading: boolean;
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
  });

  const companyId = membership?.consulting_company_id ?? null;

  const { data: company, isLoading: coLoading } = useQuery({
    queryKey: ["consulting-company", companyId],
    queryFn: () => fetchMyConsultingCompany(user!.id),
    enabled: isEnabled,
    staleTime: 30_000,
  });

  const loading = !authReady || (isEnabled && (mbLoading || coLoading));

  const role = membership?.role ?? null;
  const isMember = !!membership;
  const isAdmin = role === "owner" || role === "administrator";

  const can = useCallback(
    (permission: string): boolean => {
      if (!role) return false;
      if (role === "owner" || role === "administrator") return true;
      // read_only can read anything
      if (role === "read_only") return permission.endsWith(":read") || permission === "*:read";
      // Other roles: coarse mapping for Phase 1
      if (permission === "*") return false;
      const map: Record<MemberRole, string[]> = {
        owner: ["*"],
        administrator: ["*"],
        manager: ["clients:write", "clients:read", "applications:write", "applications:read", "tasks:write", "tasks:read"],
        consultant: ["clients:read_assigned", "applications:read_assigned", "tasks:read"],
        support_agent: ["clients:read", "messages:write"],
        finance_manager: ["payments:read", "refunds:write", "payments:read"],
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
      const ok = await apiUpdateMemberRole(memberId, newRole);
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      }
      return ok;
    },
    [queryClient],
  );

  const changeMemberStatus = useCallback(
    async (memberId: string, status: MemberStatus): Promise<boolean> => {
      const ok = await apiUpdateMemberStatus(memberId, status);
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
      }
      return ok;
    },
    [queryClient],
  );

  return useMemo<ConsultingContextValue>(
    () => ({
      company: company ?? null,
      member: membership ?? null,
      role,
      loading,
      isMember,
      isAdmin,
      can,
      refresh,
      changeMemberRole,
      changeMemberStatus,
    }),
    [company, membership, role, loading, isMember, isAdmin, can, refresh, changeMemberRole, changeMemberStatus],
  );
}

const [ConsultingProvider, useConsulting] = createContextHook(useConsultingState);

export { ConsultingProvider, useConsulting };

/** RBAC helper hook — convenience around useConsulting().can(). */
export function useConsultingRole() {
  const { role, isAdmin, isMember, can } = useConsulting();
  return { role, isAdmin, isMember, can };
}
