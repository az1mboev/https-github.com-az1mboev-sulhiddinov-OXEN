import { motion } from "framer-motion";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { CONSULTING_PLANS, getPlan, type SubscriptionPlan } from "@/lib/consulting";
import { useSEO } from "@/hooks/use-seo";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

const VALID_PLANS: SubscriptionPlan[] = ["monthly", "quarterly", "annual"];

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawPlan = params.get("plan") as SubscriptionPlan | null;
  const planId: SubscriptionPlan = VALID_PLANS.includes(rawPlan!) ? rawPlan! : "quarterly";
  const plan = useMemo(() => getPlan(planId), [planId]);

  useSEO({
    title: `Checkout — ${plan.name} | OXEN Consulting`,
    description: "Review your OXEN Consulting subscription plan. Real payment integration coming soon.",
  });

  return (
    <div className="mx-auto max-w-2xl px-5 pt-16 pb-10">
      <button
        onClick={() => navigate("/explore")}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to plans
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="glass rounded-3xl p-7 sm:p-9"
      >
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Checkout</span>
        </div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{plan.name} Plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You selected the <span className="font-semibold text-foreground">{plan.name}</span> plan ({plan.months} month
          {plan.months > 1 ? "s" : ""}).
        </p>

        <div className="my-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total due today</p>
              <p className="mt-1 font-display text-4xl font-extrabold text-foreground">
                ${plan.price.toLocaleString()}
                <span className="ml-1 text-sm font-medium text-muted-foreground">USD</span>
              </p>
            </div>
            {plan.savingsLabel && (
              <span className="mb-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {plan.savingsLabel}
              </span>
            )}
          </div>

          <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-center">
          <p className="text-sm font-semibold text-amber-300">Coming soon</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Real payment integration is not available yet. This page is a preview of the checkout experience. No charge
            will be made.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            onClick={() => navigate("/explore")}
            className="rounded-full bg-white/[0.06] px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.1]"
          >
            Choose a different plan
          </button>
          <button
            disabled
            className="cursor-not-allowed rounded-full bg-white/[0.04] px-5 py-3 text-sm font-bold text-muted-foreground"
          >
            Pay ${plan.price.toLocaleString()} — coming soon
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Plans:{" "}
          {CONSULTING_PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/consulting/checkout?plan=${p.id}`)}
              className="mx-1 font-semibold text-primary transition hover:opacity-80"
            >
              {p.name}
            </button>
          ))}
        </p>
      </motion.div>
    </div>
  );
}
