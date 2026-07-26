import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Shield,
  Crown,
  Bell,
  Lock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/contexts/AuthContext";
import { checkOwnerAccess, fetchAuditLogs } from "@/lib/owner-admin";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

/**
 * OwnerSettings — owner panel settings: owner identity, security info,
 * notification preferences (view-only for now), and protected-action
 * guardrails info. Does not allow changing owner roles (protected process).
 */
export default function OwnerSettings() {
  const { user } = useAuth();
  useSEO({ title: "Settings | OXEN Owner", description: "Owner panel settings." });

  const accessQ = useQuery({
    queryKey: ["owner-access-settings-page", user?.id],
    queryFn: () => checkOwnerAccess(),
    staleTime: 60_000,
  });

  const auditQ = useQuery({
    queryKey: ["owner-settings-audit-recent"],
    queryFn: () => fetchAuditLogs(5),
    staleTime: 30_000,
  });

  const recentAudit = auditQ.data ?? [];
  const isLinked = !!accessQ.data?.user_id;

  return (
    <OwnerShell title="Settings" subtitle="Owner panel configuration and security">
      {/* Owner identity */}
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Owner Identity
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springIn}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-amber-300">
              <Crown className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold text-foreground">{user?.name}</p>
              <p className="truncate text-sm text-muted-foreground">{accessQ.data?.email ?? user?.email}</p>
            </div>
            <span className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
              isLinked ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300",
            )}>
              {isLinked ? "Linked" : "Pending"}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Your Supabase user_id is linked to the <code className="rounded bg-white/[0.06] px-1 text-foreground">owner_admins</code> table.
            Owner access is verified server-side on every request via the <code className="rounded bg-white/[0.06] px-1 text-foreground">is_owner()</code> SQL function.
          </p>
        </motion.div>
      </section>

      {/* Two-owner protection */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Two-Owner Protection
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.05 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-amber-300" />
            <p className="font-display text-sm font-bold text-foreground">Protected Actions</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Both owner accounts have equal main access. The following sensitive actions
            require a confirmation modal with a reason:
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-foreground">
            {[
              "Blocking an account",
              "Cancelling a subscription",
              "Refunding a payment",
              "Removing Premium Consulting access",
              "Changing a subscription expiration date",
              "Changing a user role to Owner",
              "Removing an owner role",
            ].map((action) => (
              <li key={action} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {action}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
              <Lock className="h-3 w-3" /> Self-protection
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Owners cannot remove their own Owner access or the other owner's access from the
              normal UI. This requires a separate protected database process.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Audit log integrity */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Audit Log Integrity
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
            <p className="font-display text-sm font-bold text-foreground">Append-Only Records</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Audit log records are append-only — they cannot be edited or permanently deleted
            from the normal Owner Admin UI. RLS blocks all UPDATE and DELETE operations on
            the <code className="rounded bg-white/[0.06] px-1 text-foreground">owner_audit_logs</code> table.
          </p>
          {recentAudit.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recent entries</p>
              {recentAudit.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-1.5">
                  <span className="truncate text-xs text-foreground">{log.action}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{log.owner_email ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Data separation */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Data Separation
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.15 }}
          className="glass rounded-2xl p-5"
        >
          <p className="text-xs text-muted-foreground">
            OXEN platform subscription revenue is kept fully separate from consulting company
            business revenue (POS, Cashier, package sales). One consulting company cannot
            access another company's private records. Ordinary users cannot read owner or
            consulting financial records.
          </p>
        </motion.div>
      </section>

      {/* Navigation */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Panel Links
        </h3>
        <div className="glass divide-y divide-white/[0.04] rounded-2xl">
          {[
            { label: "Audit Log", to: "/owner-admin/audit", icon: SettingsIcon },
            { label: "Notifications", to: "/owner-admin/notifications", icon: Bell },
            { label: "Return to OXEN", to: "/", icon: ExternalLink },
          ].map((link) => (
            <a
              key={link.to}
              href={link.to}
              className="flex items-center gap-3 p-3.5 transition hover:bg-white/[0.02]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
                <link.icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">{link.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      </section>
    </OwnerShell>
  );
}
