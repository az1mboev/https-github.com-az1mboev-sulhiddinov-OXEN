import { motion } from "framer-motion";
import {
  Users,
  FileStack,
  CheckCircle2,
  Clock,
  DollarSign,
  PackagePlus,
  Building2,
  UserPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { StatCard } from "@/components/consulting/StatCard";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

/**
 * DashboardHome — consulting dashboard overview.
 *
 * Phase 3 shows real zero values (no fake numbers) sourced from the
 * ConsultingContext company. Three empty-state action cards help the
 * owner bootstrap: create a service package, complete company profile,
 * invite the first employee.
 */
export default function DashboardHome() {
  const { company, isTestMode } = useConsulting();
  const navigate = useNavigate();

  useSEO({
    title: "Dashboard | OXEN Consulting",
    description: "Your consulting business overview.",
  });

  // Real zeros — no fake data. When Supabase tables are connected and
  // populated, these will be replaced with real counts from fetchDashboardStats.
  const totalClients = 0;
  const activeApplications = 0;
  const successfulClients = 0;
  const pendingClients = 0;
  const monthlyRevenue = 0;

  const actions = [
    {
      icon: PackagePlus,
      title: "Create your first service package",
      description: "Publish a visa, travel, or consultation package so clients can find and buy it.",
      cta: "Create package",
      to: "/consulting/packages",
    },
    {
      icon: Building2,
      title: "Complete your company profile",
      description: "Add your logo, description, working hours, and destination countries.",
      cta: "Edit profile",
      to: "/consulting/company-profile",
    },
    {
      icon: UserPlus,
      title: "Invite your first employee",
      description: "Add consultants and managers to help handle client applications.",
      cta: "Invite employee",
      to: "/consulting/employees",
    },
  ];

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Business overview"
      actions={
        <button
          onClick={() => navigate("/consulting/company-profile")}
          className="hidden items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1] sm:inline-flex"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Complete profile
        </button>
      }
    >
      {isTestMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/90"
        >
          <span className="font-bold">Test Mode:</span> Your onboarding was saved locally. The Supabase
          consulting tables are not connected yet, so the dashboard shows real zero values. Apply the
          migration to start storing real data.
        </motion.div>
      )}

      {/* Stat cards — real zeros */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Clients" value={totalClients} icon={Users} accent="gold" delay={0} />
        <StatCard
          label="Active Applications"
          value={activeApplications}
          icon={FileStack}
          accent="blue"
          delay={0.05}
        />
        <StatCard
          label="Successful Clients"
          value={successfulClients}
          icon={CheckCircle2}
          accent="green"
          delay={0.1}
        />
        <StatCard
          label="Pending Clients"
          value={pendingClients}
          icon={Clock}
          accent="blue"
          delay={0.15}
        />
        <StatCard
          label="Monthly Revenue"
          value={`$${monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          accent="gold"
          delay={0.2}
        />
      </div>

      {/* Welcome / empty-state actions */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.1 }}
        className="glass mb-6 rounded-3xl p-6"
      >
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold text-foreground">
            Welcome{company ? `, ${company.name}` : ""} 👋
          </h3>
          <p className="text-sm text-muted-foreground">
            Your dashboard is ready. Start by setting up the three building blocks below — every section
            fills with real data as your business grows.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springIn, delay: 0.15 + i * 0.07 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(a.to)}
              className="glass group flex flex-col items-start gap-3 rounded-3xl p-5 text-left transition hover:bg-white/[0.05]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <h4 className="font-display text-sm font-bold text-foreground">{a.title}</h4>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary transition group-hover:gap-2">
                {a.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Getting-started checklist */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.4 }}
        className="glass mt-6 rounded-3xl p-6"
      >
        <h3 className="mb-4 font-display text-sm font-bold text-foreground">Getting started</h3>
        <ul className="space-y-2.5">
          {[
            { label: "Complete your company profile", done: false, to: "/consulting/company-profile" },
            { label: "Create your first service package", done: false, to: "/consulting/packages" },
            { label: "Invite team members", done: false, to: "/consulting/employees" },
            { label: "Publish your public profile", done: false, to: "/consulting/company-profile" },
          ].map((step) => (
            <li key={step.label}>
              <button
                onClick={() => navigate(step.to)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.04]"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    step.done
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                      : "border-white/15 text-transparent"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                <span className={step.done ? "text-muted-foreground line-through" : "text-foreground"}>
                  {step.label}
                </span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </DashboardShell>
  );
}
