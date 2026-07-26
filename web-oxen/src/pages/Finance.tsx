import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Download,
  RefreshCw,
  CalendarClock,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  TrendingUp,
  Sparkles,
} from "lucide-react";

import { useConsulting } from "@/contexts/ConsultingContext";
import { getPlan, type SubscriptionPlan } from "@/lib/consulting";
import { useSEO } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";
import {
  fetchInvoices,
  downloadInvoice,
  type InvoiceRecord,
} from "@/lib/consulting-posts";
import { ExploreBackButton, saveExploreScroll, useRestoreExploreScroll } from "@/components/ExploreBackButton";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

interface TestSubscriptionState {
  status: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  amount: number;
  cardBrand: string;
  cardLast4: string;
  cardMasked: string;
  history: Array<{
    id: string;
    date: string;
    plan: SubscriptionPlan;
    amount: number;
    cardMasked: string;
    type: "subscription" | "renewal";
  }>;
}

function readTestSub(): TestSubscriptionState | null {
  try {
    const raw = localStorage.getItem("oxen.consulting.test.subscription");
    return raw ? (JSON.parse(raw) as TestSubscriptionState) : null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Finance() {
  const navigate = useNavigate();
  const { company, subscriptionPlan, subscriptionEndDate, subscriptionAccess, isTestMode } =
    useConsulting();
  const [invoices] = useState<InvoiceRecord[]>(() => fetchInvoices());

  useSEO({
    title: "Finance & Billing | OXEN Consulting",
    description: "Manage your subscription, payments, and invoices.",
  });

  useRestoreExploreScroll("/explore/finance");

  const testSub = useMemo(() => (isTestMode ? readTestSub() : null), [isTestMode]);
  const plan = subscriptionPlan ? getPlan(subscriptionPlan) : null;
  const history = testSub?.history ?? [];

  const totalPayments = useMemo(
    () => history.reduce((sum, h) => sum + h.amount, 0),
    [history],
  );

  const nextRenewalDays = subscriptionEndDate ? daysUntil(subscriptionEndDate) : null;

  const handleDownload = useCallback((inv: InvoiceRecord) => {
    downloadInvoice(inv);
  }, []);

  const handleBack = useCallback(() => {
    saveExploreScroll("/explore/finance");
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/explore");
    }
  }, [navigate]);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-16">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={springIn}
        whileTap={{ scale: 0.94 }}
        onClick={handleBack}
        className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur-xl transition hover:bg-white/[0.1]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
        Back
      </motion.button>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="mb-6"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">Finance</h1>
            <p className="text-xs text-muted-foreground">Subscription, payments & invoices</p>
          </div>
        </div>
      </motion.div>

      {/* Company card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="glass mb-5 flex items-center gap-3 rounded-3xl p-4"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-foreground">
            {company?.name ?? "Your company"}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Account</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            subscriptionAccess === "active"
              ? "bg-emerald-500/15 text-emerald-400"
              : subscriptionAccess === "expired"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-white/[0.06] text-muted-foreground",
          )}
        >
          {subscriptionAccess === "active" ? "Active" : subscriptionAccess === "expired" ? "Expired" : "None"}
        </span>
      </motion.div>

      {/* Current subscription summary */}
      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.05 }}
          className="glass mb-5 rounded-3xl p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-foreground">Current Subscription</h2>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Plan</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{plan.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Amount</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                ${plan.price.toLocaleString()} USD
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> Start date
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {testSub
                  ? formatDate(testSub.startDate)
                  : formatDate(company?.subscription_start_date ?? new Date().toISOString())}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> Expiration date
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {formatDate(subscriptionEndDate ?? new Date().toISOString())}
              </dd>
            </div>
          </dl>

          {/* Next renewal info */}
          {nextRenewalDays !== null && subscriptionAccess === "active" && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-primary/[0.06] px-4 py-2.5">
              <RefreshCw className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">
                Next renewal in{" "}
                <span className="font-bold text-foreground">
                  {nextRenewalDays > 0 ? `${nextRenewalDays} days` : "today"}
                </span>
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            {subscriptionAccess === "active" ? (
              <button
                onClick={() => navigate("/consulting/renew")}
                className="glass-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Renew Subscription
              </button>
            ) : subscriptionAccess === "expired" ? (
              <button
                onClick={() => navigate("/consulting/renew")}
                className="gold-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Renew Now
              </button>
            ) : (
              <button
                onClick={() => navigate("/explore")}
                className="gold-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Purchase Subscription
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.1 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total Payments
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-extrabold text-foreground">
            ${totalPayments.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">USD</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.15 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Invoices
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-extrabold text-foreground">
            {invoices.length}
          </p>
          <p className="text-[10px] text-muted-foreground">documents</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.2 }}
          className="glass col-span-2 rounded-2xl p-4 sm:col-span-1"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Payment Status
            </span>
          </div>
          <p
            className={cn(
              "mt-2 font-display text-sm font-extrabold",
              subscriptionAccess === "active"
                ? "text-emerald-400"
                : subscriptionAccess === "expired"
                  ? "text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            {subscriptionAccess === "active"
              ? "Up to date"
              : subscriptionAccess === "expired"
                ? "Past due"
                : "No subscription"}
          </p>
        </motion.div>
      </div>

      {/* Payment history */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.25 }}
        className="glass mb-5 rounded-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">Payment History</h2>
          <span className="text-[11px] text-muted-foreground">
            {history.length} transaction{history.length === 1 ? "" : "s"}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CreditCard className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">No payments yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Your subscription payments will appear here once your subscription is active.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.04]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {getPlan(h.plan).name} plan
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(h.date)} · {h.type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">${h.amount.toLocaleString()}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{h.cardMasked}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Invoice history */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.3 }}
        className="glass rounded-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">Invoice History</h2>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </div>

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Receipt className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">No invoices yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Invoices are generated automatically with each subscription payment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3 font-semibold">Invoice #</th>
                  <th className="pb-2 pr-3 font-semibold">Date</th>
                  <th className="pb-2 pr-3 font-semibold">Plan</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Amount</th>
                  <th className="pb-2 pr-3 font-semibold">Status</th>
                  <th className="pb-2 text-right font-semibold">Download</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-3 font-mono text-[11px] text-muted-foreground">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3 pr-3 font-semibold text-foreground">
                      {getPlan(inv.plan as SubscriptionPlan).name}
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold text-foreground">
                      ${inv.amount.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          inv.status === "paid"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : inv.status === "pending"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-rose-500/15 text-rose-400",
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDownload(inv)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:opacity-80"
                      >
                        <Download className="h-3 w-3" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Security note */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        <p className="text-xs text-muted-foreground">
          We never store your full card number or CVV. Only the masked last four digits and card brand
          are kept for display. {isTestMode && "Test Mode — no real charges are made."}
        </p>
      </div>
    </div>
  );
}
