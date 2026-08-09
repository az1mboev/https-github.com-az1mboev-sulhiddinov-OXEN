import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, LogIn, ArrowRight, Sparkles, Users, Package, BarChart3 } from "lucide-react";

import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";
import type { AgencyMembership } from "@/lib/consulting";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

/**
 * WorkspaceOnboarding — the multi-agency entry point.
 *
 * Shows when a user has zero agencies OR as a hub to create/join/switch.
 * Never auto-loads demo agencies.
 */
export default function WorkspaceOnboarding() {
  const navigate = useNavigate();
  const { agencies, activeAgencyId, switchAgency, loading } = useConsulting();

  useSEO({
    title: "OXEN CRM Workspace",
    description: "Create or join a travel agency workspace.",
  });

  const handleOpenAgency = (agencyId: string) => {
    switchAgency(agencyId);
    navigate("/consulting/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-transparent to-transparent" />
        <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="relative mx-auto max-w-4xl px-6 py-16 text-center lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springIn}
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15"
          >
            <Sparkles className="h-8 w-8 text-primary" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.05 }}
            className="font-display text-3xl font-extrabold text-foreground lg:text-4xl"
          >
            Welcome to OXEN CRM
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.1 }}
            className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground lg:text-base"
          >
            Manage your travel agency — clients, applications, tour packages, team, and analytics.
            Create a new agency or join an existing one to get started.
          </motion.p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* My Agencies list */}
        {agencies.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.15 }}
            className="mb-10"
          >
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">
              My Agencies <span className="text-muted-foreground">({agencies.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {agencies.map((am: AgencyMembership) => (
                <AgencyCard
                  key={am.company.id}
                  membership={am}
                  isActive={am.company.id === activeAgencyId}
                  onOpen={() => handleOpenAgency(am.company.id)}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Loading state */}
        {loading && agencies.length === 0 && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="oxen-skeleton-globe" />
          </div>
        )}

        {/* Create / Join cards */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.2 }}
        >
          {agencies.length === 0 && !loading && (
            <p className="mb-6 text-center text-sm text-muted-foreground">
              You don&apos;t belong to any agency yet. Choose an option below.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Create Agency */}
            <button
              onClick={() => navigate("/consulting/create-agency")}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Create Agency</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Start a new travel agency workspace. You become the owner and can invite team members.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
                Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

            {/* Join Agency */}
            <button
              onClick={() => navigate("/consulting/join-agency")}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
                <LogIn className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Join Existing Agency</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Have an Agency Code? Find your agency and request access. The owner will approve your request.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
                Enter code <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </div>
        </motion.section>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.25 }}
          className="mt-12 grid gap-3 sm:grid-cols-3"
        >
          {[
            { icon: Users, label: "Client Management" },
            { icon: Package, label: "Tour Packages" },
            { icon: BarChart3, label: "Analytics & Reports" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">{f.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/** Compact agency card for the My Agencies list. */
function AgencyCard({
  membership,
  isActive,
  onOpen,
}: {
  membership: AgencyMembership;
  isActive: boolean;
  onOpen: () => void;
}) {
  const { company, member } = membership;
  const logoUrl = company.logo_url ?? null;

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
        isActive
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-primary/20 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-foreground">{company.name}</p>
        <p className="truncate text-xs capitalize text-muted-foreground">
          {member.role} {company.city ? `· ${company.city}` : ""}
        </p>
      </div>
      {isActive && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
          Active
        </span>
      )}
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </button>
  );
}
