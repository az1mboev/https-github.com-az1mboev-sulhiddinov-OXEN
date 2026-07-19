import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  UserCog,
  Plus,
  Mail,
  Phone,
  Trash2,
  Ban,
  CheckCircle2,
  Loader2,
  X,
  Send,
  Shield,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { DataTable, type Column } from "@/components/consulting/DataTable";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { EmptyState } from "@/components/consulting/EmptyState";
import { SlideOver } from "@/components/consulting/SlideOver";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchMembers,
  fetchInvitations,
  inviteMember,
  revokeInvitation,
  type ConsultingMember,
  type ConsultingInvitation,
  type MemberRole,
  type MemberStatus,
} from "@/lib/consulting";

const ROLES: { value: MemberRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "administrator", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "consultant", label: "Consultant" },
  { value: "support_agent", label: "Support Agent" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "content_manager", label: "Content Manager" },
  { value: "read_only", label: "Read Only" },
];

const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: "Full company access, including deleting the company.",
  administrator: "Full access except deleting the company.",
  manager: "Manage clients, applications, and tasks.",
  consultant: "Manage only clients assigned to them.",
  support_agent: "View clients and send messages.",
  finance_manager: "Access payments and refunds. No company profile deletion.",
  content_manager: "Create posts and packages. No payment details.",
  read_only: "View only — no edits.",
};

export default function ConsultingEmployees() {
  const { company, isAdmin, changeMemberRole, changeMemberStatus } = useConsulting();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [profile, setProfile] = useState<ConsultingMember | null>(null);
  const [roleTarget, setRoleTarget] = useState<ConsultingMember | null>(null);
  const [newRole, setNewRole] = useState<MemberRole>("consultant");
  const [statusTarget, setStatusTarget] = useState<ConsultingMember | null>(null);
  const [newStatus, setNewStatus] = useState<MemberStatus>("suspended");
  const [revoking, setRevoking] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ConsultingInvitation | null>(null);

  useSEO({ title: "Employees | OXEN Consulting", description: "Manage your team" });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["consulting-members", companyId],
    queryFn: () => fetchMembers(companyId),
    enabled: !!companyId,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["consulting-invitations", companyId],
    queryFn: () => fetchInvitations(companyId),
    enabled: !!companyId && isAdmin,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: MemberRole }) =>
      inviteMember(companyId, email, role, ""),
    onSuccess: () => {
      toast({ title: "Invitation sent" });
      setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["consulting-invitations"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: MemberRole }) =>
      changeMemberRole(memberId, role),
    onSuccess: () => {
      toast({ title: "Role updated" });
      setRoleTarget(null);
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: MemberStatus }) =>
      changeMemberStatus(memberId, status),
    onSuccess: () => {
      toast({ title: "Status updated" });
      setStatusTarget(null);
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const columns: Column<ConsultingMember>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Employee",
        render: (m) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
              {m.profile?.avatar_url ? (
                <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {(m.profile?.name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {m.profile?.name ?? "Unknown"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{m.profile?.email ?? "—"}</p>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (m) => <span className="text-xs capitalize text-foreground">{m.role.replace(/_/g, " ")}</span>,
      },
      {
        key: "phone",
        header: "Phone",
        hideOnMobile: true,
        render: (m) => <span className="text-xs text-muted-foreground">{m.profile?.email ?? "—"}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (m) => <StatusBadge status={m.status} />,
      },
      {
        key: "last_active",
        header: "Last active",
        hideOnMobile: true,
        render: (m) => (
          <span className="text-xs text-muted-foreground">
            {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (m) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProfile(m);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
              aria-label="View profile"
            >
              <UserCog className="h-3.5 w-3.5" />
            </button>
            {isAdmin && m.role !== "owner" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRoleTarget(m);
                    setNewRole(m.role);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
                  aria-label="Change role"
                >
                  <Shield className="h-3.5 w-3.5" />
                </button>
                {m.status === "active" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusTarget(m);
                      setNewStatus("suspended");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition hover:bg-amber-500/20"
                    aria-label="Suspend"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusTarget(m);
                      setNewStatus("active");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20"
                    aria-label="Activate"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        ),
      },
    ],
    [isAdmin],
  );

  return (
    <DashboardShell
      title="Employees"
      subtitle="Your team members and their access levels"
      actions={
        isAdmin && (
          <button
            onClick={() => setInviteOpen(true)}
            className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Invite Employee
          </button>
        )
      }
    >
      {/* Pending invitations */}
      {isAdmin && invitations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 glass rounded-2xl p-4"
        >
          <h3 className="mb-3 font-display text-sm font-bold">Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{inv.email}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {inv.role.replace(/_/g, " ")} · invited {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setRevokeTarget(inv)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                  aria-label="Revoke"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No employees yet"
          description="Invite team members to help manage clients, applications, and packages. Each role has specific permissions."
          action={isAdmin ? { label: "Invite your first employee", onClick: () => setInviteOpen(true) } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={members}
          rowKey={(m) => m.id}
          onRowClick={(m) => setProfile(m)}
        />
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onSubmit={(email, role) => inviteMutation.mutate({ email, role })}
          loading={inviteMutation.isPending}
        />
      )}

      {/* Profile slide-over */}
      <SlideOver
        open={!!profile}
        onClose={() => setProfile(null)}
        title={profile?.profile?.name ?? "Employee"}
        subtitle={profile?.profile?.email ?? undefined}
      >
        {profile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/15">
                {profile.profile?.avatar_url ? (
                  <img src={profile.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-xl font-bold text-primary">
                    {(profile.profile?.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold">{profile.profile?.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={profile.role} label={profile.role.replace(/_/g, " ")} />
                  <StatusBadge status={profile.status} />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-primary/[0.06] p-3 text-xs text-foreground/90">
              <Shield className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
              {ROLE_DESCRIPTIONS[profile.role]}
            </div>

            <div className="space-y-2">
              <Row icon={Mail} label="Email" value={profile.profile?.email ?? "—"} />
              <Row icon={Phone} label="Joined" value={new Date(profile.created_at).toLocaleDateString()} />
              <Row
                icon={CheckCircle2}
                label="Last active"
                value={profile.last_active_at ? new Date(profile.last_active_at).toLocaleString() : "—"}
              />
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <h4 className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Performance
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Stat label="Active clients" value="0" />
                <Stat label="Total clients" value="0" />
                <Stat label="Successful" value="0" />
                <Stat label="Revenue" value="$0" />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Per-employee client counts — populated as clients are assigned. Activity history & tasks: Phase 2.
              </p>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Change role dialog */}
      <ConfirmDialog
        open={!!roleTarget}
        title="Change role"
        message={
          roleTarget
            ? `Change ${roleTarget.profile?.name ?? "this employee"}'s role. New permissions apply immediately.`
            : ""
        }
        confirmLabel="Update Role"
        onConfirm={() => roleTarget && roleMutation.mutate({ memberId: roleTarget.id, role: newRole })}
        onCancel={() => setRoleTarget(null)}
        loading={roleMutation.isPending}
      />
      {roleTarget && (
        <div className="fixed inset-0 z-[89] flex items-center justify-center" style={{ pointerEvents: "none" }}>
          <div className="glass-strong w-[calc(100%-2.5rem)] max-w-xs rounded-2xl p-4" style={{ pointerEvents: "auto" }}>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Select new role</p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as MemberRole)}
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {ROLES.filter((r) => r.value !== "owner").map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-muted-foreground">{ROLE_DESCRIPTIONS[newRole]}</p>
          </div>
        </div>
      )}

      {/* Status change dialog */}
      <ConfirmDialog
        open={!!statusTarget}
        title={newStatus === "suspended" ? "Suspend employee" : "Activate employee"}
        message={
          statusTarget
            ? newStatus === "suspended"
              ? `Suspend ${statusTarget.profile?.name ?? "this employee"}? They'll lose access immediately.`
              : `Restore access for ${statusTarget.profile?.name ?? "this employee"}?`
            : ""
        }
        confirmLabel={newStatus === "suspended" ? "Suspend" : "Activate"}
        destructive={newStatus === "suspended"}
        onConfirm={() => statusTarget && statusMutation.mutate({ memberId: statusTarget.id, status: newStatus })}
        onCancel={() => setStatusTarget(null)}
        loading={statusMutation.isPending}
      />

      {/* Revoke invitation */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke invitation"
        message={`Revoke the invitation sent to ${revokeTarget?.email}? They won't be able to join.`}
        confirmLabel="Revoke"
        destructive
        loading={revoking}
        onConfirm={async () => {
          if (!revokeTarget) return;
          setRevoking(true);
          try {
            await revokeInvitation(revokeTarget.id);
            toast({ title: "Invitation revoked" });
            setRevokeTarget(null);
            queryClient.invalidateQueries({ queryKey: ["consulting-invitations"] });
          } catch {
            toast({ title: "Failed", variant: "destructive" });
          } finally {
            setRevoking(false);
          }
        }}
        onCancel={() => setRevokeTarget(null)}
      />
    </DashboardShell>
  );
}

/* ── Invite modal ────────────────────────────────────────── */

function InviteModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (email: string, role: MemberRole) => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("consultant");

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Invite Employee</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <Field
              label="Email address"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="colleague@example.com"
              required
            />
            <SelectField<MemberRole>
              label="Role"
              value={role}
              onChange={setRole}
              options={ROLES.filter((r) => r.value !== "owner")}
            />
            <div className="rounded-xl bg-primary/[0.06] p-3 text-[11px] text-foreground/90">
              {ROLE_DESCRIPTIONS[role]}
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  toast({ title: "Enter a valid email", variant: "destructive" });
                  return;
                }
                onSubmit(email, role);
              }}
              disabled={loading || !email.trim()}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Invite
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="truncate text-right text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.02] p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-sm font-bold">{value}</p>
    </div>
  );
}
