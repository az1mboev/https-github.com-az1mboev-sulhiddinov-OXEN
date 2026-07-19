import { motion } from "framer-motion";
import {
  Briefcase,
  Users,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Check,
  ArrowRight,
  LifeBuoy,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { Accordion } from "@/components/consulting/Field";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

const cardSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
  mass: 0.8,
};

const FEATURES = [
  { icon: Briefcase, title: "Company Profile", description: "A dedicated company profile on OXEN so clients can discover your consulting services." },
  { icon: Briefcase, title: "Service Packages", description: "Publish unlimited service packages with rich media, FAQ, and documents." },
  { icon: Users, title: "Client Management", description: "Track every client from lead to final result with notes, documents, and timelines." },
  { icon: Users, title: "Employee Management", description: "Invite your team, assign roles, and control access with granular permissions." },
  { icon: BarChart3, title: "Business Dashboard", description: "Real-time revenue, conversion, and success-rate insights from your real data." },
  { icon: CreditCard, title: "Payment History", description: "Every transaction recorded and exportable. Transparent commission on each sale." },
  { icon: Users, title: "Reviews", description: "Verified reviews collected only from clients who purchased a service." },
  { icon: LifeBuoy, title: "Support", description: "Dedicated OXEN support team and a help center for your team and clients." },
];

const FAQ = [
  {
    question: "What happens after I subscribe?",
    answer:
      "You'll enter your company information, add a payment method, and verify your phone. Your consulting workspace is created instantly and you can start publishing packages and inviting employees.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes. You can cancel anytime from the Subscription page. Your data is preserved and the dashboard switches to read-only mode. You can renew to restore full access.",
  },
  {
    question: "Is my payment information secure?",
    answer:
      "Card numbers and CVVs are never stored in our database. We use payment-provider tokenization and only keep the masked last four digits, card brand, and a provider payment-method ID.",
  },
  {
    question: "How many employees can I add?",
    answer:
      "The Monthly plan includes 3 employee seats, Quarterly includes 10, and Annual includes unlimited seats. You can upgrade or downgrade at any time.",
  },
  {
    question: "Do you take a commission on package sales?",
    answer:
      "OXEN takes a small platform commission on each package sale processed through the platform. Subscription fees are separate and shown transparently on every payment receipt.",
  },
];

const PLAN_SUMMARY = [
  { name: "Monthly", price: "$150", duration: "1 month" },
  { name: "Quarterly", price: "$400", duration: "3 months", badge: "Most Popular" },
  { name: "Annual", price: "$1,700", duration: "12 months", badge: "Best Value" },
];

export default function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMember, hasActiveSubscription, hasExpiredSubscription, company } = useConsulting();

  useSEO({
    title: "Premium Consulting | OXEN",
    description:
      "Grow your consulting business with OXEN. Subscribe to Premium Consulting and unlock a full consulting workspace.",
  });

  const handleBuy = useCallback(() => {
    if (user?.isGuest) {
      navigate(`/auth?redirect=${encodeURIComponent("/consulting/plans")}`);
      return;
    }
    navigate("/consulting/plans");
  }, [user, navigate]);

  const handleContactSupport = useCallback(() => {
    navigate("/support");
  }, [navigate]);

  // If the user is already an active consulting member, show a "Go to Dashboard" CTA instead.
  const showGoToDashboard = isMember && (hasActiveSubscription || hasExpiredSubscription);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-16 pb-10">
      {/* Hero — single primary CTA */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Premium Consulting</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
          Grow Your Consulting Business
          <br />
          <span className="text-gold-gradient">with OXEN</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Create a consulting company profile, publish service packages, manage clients and employees, and track your
          revenue — all in one premium workspace. Subscribe to unlock the full consulting dashboard.
        </p>

        {/* Primary CTA — one large centered button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.15 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          {showGoToDashboard ? (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/consulting/dashboard")}
                className="gold-gradient inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25"
              >
                <LayoutDashboard className="h-5 w-5" />
                Go to Consulting Dashboard
              </motion.button>
              {hasExpiredSubscription && (
                <p className="text-xs font-semibold text-amber-400">
                  Your subscription has expired —{" "}
                  <button onClick={() => navigate("/consulting/renew")} className="underline hover:opacity-80">
                    Renew now
                  </button>{" "}
                  to restore full access.
                </p>
              )}
              {hasActiveSubscription && company && (
                <p className="text-xs text-muted-foreground">
                  Signed in as <span className="font-semibold text-foreground">{company.name}</span>
                </p>
              )}
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleBuy}
              className="gold-gradient inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25"
            >
              <Sparkles className="h-5 w-5" />
              Buy Premium Consulting
            </motion.button>
          )}
          <button
            onClick={handleContactSupport}
            className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30"
          >
            <LifeBuoy className="h-4 w-4 text-primary" />
            Contact OXEN Support
          </button>
        </motion.div>
      </motion.div>

      {/* Plan summary (read-only preview; full selection on /consulting/plans) */}
      <section className="mb-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-5 flex items-center justify-center gap-2"
        >
          <h2 className="font-display text-xl font-bold sm:text-2xl">Subscription plans</h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_SUMMARY.map((plan, i) => {
            const featured = !!plan.badge;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, ...cardSpring }}
                className={
                  featured
                    ? "relative flex flex-col rounded-3xl border border-primary/40 bg-primary/[0.04] p-6 shadow-xl shadow-primary/10"
                    : "glass relative flex flex-col rounded-3xl border border-white/[0.06] p-6"
                }
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-3">
                  <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.duration}</p>
                </div>
                <div className="mb-1 flex items-end gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="mb-1.5 text-xs text-muted-foreground">USD</span>
                </div>
                <button
                  onClick={handleBuy}
                  className={
                    featured
                      ? "gold-gradient mt-4 flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95"
                      : "mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] py-3 text-sm font-bold text-foreground transition hover:bg-white/[0.1] active:scale-95"
                  }
                >
                  View plan
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Benefits */}
      <section className="mb-14">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-5 text-center font-display text-xl font-bold sm:text-2xl"
        >
          Everything you need to run your consulting business
        </motion.h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06, ...cardSpring }}
                className="glass group rounded-2xl p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-110">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <h3 className="mt-3 font-display text-sm font-bold text-foreground">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Secure payment message */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={springIn}
        className="mb-14"
      >
        <div className="flex items-center gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Secure payment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Payments are processed through a PCI-DSS-compliant tokenization flow. We never store your raw card number
              or CVV — only the masked last four digits and a provider payment-method ID. Phone OTP verification
              protects every transaction.
            </p>
          </div>
        </div>
      </motion.section>

      {/* FAQ */}
      <section className="mb-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-5 flex items-center justify-center gap-2"
        >
          <HelpCircle className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <h2 className="font-display text-xl font-bold sm:text-2xl">Frequently asked questions</h2>
        </motion.div>
        <Accordion items={FAQ} />
      </section>

      {/* Final CTA */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={springIn}
        className="mb-4 text-center"
      >
        {showGoToDashboard ? (
          <button
            onClick={() => navigate("/consulting/dashboard")}
            className="gold-gradient mx-auto inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition active:scale-95"
          >
            <LayoutDashboard className="h-4 w-4" />
            Open my consulting dashboard
          </button>
        ) : (
          <button
            onClick={handleBuy}
            className="gold-gradient mx-auto inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            Get started today
          </button>
        )}
        <button
          onClick={handleContactSupport}
          className="mt-3 text-xs font-semibold text-primary transition hover:opacity-80"
        >
          Questions? Contact OXEN Support →
        </button>
      </motion.section>
    </div>
  );
}
