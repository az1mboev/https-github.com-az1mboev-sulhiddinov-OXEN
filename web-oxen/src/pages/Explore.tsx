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
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CONSULTING_PLANS, type SubscriptionPlan } from "@/lib/consulting";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
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

export default function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agreedTerms, setAgreedTerms] = useState(false);

  useSEO({
    title: "Consulting Business | OXEN",
    description:
      "Grow your consulting business with OXEN. Create a consulting company profile and manage your services through OXEN.",
  });

  const handleSelectPlan = useCallback(
    (plan: SubscriptionPlan) => {
      if (user?.isGuest) {
        navigate(`/auth?redirect=${encodeURIComponent(`/consulting/checkout?plan=${plan}`)}`);
        return;
      }
      if (!agreedTerms) {
        toast({
          title: "Please accept the Terms & Conditions first",
          variant: "destructive",
        });
        document.getElementById("terms-checkbox")?.focus();
        return;
      }
      navigate(`/consulting/checkout?plan=${plan}`);
    },
    [user, agreedTerms, navigate],
  );

  const handleContactSupport = useCallback(() => {
    navigate("/support");
  }, [navigate]);

  const renewalInfo = useMemo(
    () =>
      CONSULTING_PLANS.map((p) => {
        const date = new Date();
        date.setMonth(date.getMonth() + p.months);
        return { id: p.id, renewalDate: date.toLocaleDateString() };
      }),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-5 pt-16 pb-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Consulting Business</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Grow Your Consulting Business
          <br />
          <span className="text-gold-gradient">with OXEN</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Create a consulting company profile and manage your services through OXEN.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelectPlan("quarterly")}
            className="gold-gradient flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Sparkles className="h-4 w-4" />
            Buy Consulting Subscription
          </motion.button>
          <button
            onClick={handleContactSupport}
            className="glass flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30"
          >
            <LifeBuoy className="h-4 w-4 text-primary" />
            Contact OXEN Support
          </button>
        </div>
      </motion.div>

      {/* Plans */}
      <section className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-5 flex items-center gap-2"
        >
          <h2 className="font-display text-xl font-bold sm:text-2xl">Choose your plan</h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONSULTING_PLANS.map((plan, i) => {
            const renewal = renewalInfo.find((r) => r.id === plan.id);
            const featured = !!plan.badge;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, ...cardSpring }}
                whileTap={{ scale: 0.98 }}
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
                  <p className="text-xs text-muted-foreground">{plan.months} month{plan.months > 1 ? "s" : ""}</p>
                </div>
                <div className="mb-1 flex items-end gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-foreground">
                    ${plan.price.toLocaleString()}
                  </span>
                  <span className="mb-1.5 text-xs text-muted-foreground">USD</span>
                </div>
                {plan.savingsLabel && (
                  <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {plan.savingsLabel}
                  </span>
                )}

                <ul className="mb-5 mt-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mb-4 mt-auto space-y-1.5 border-t border-white/[0.06] pt-3 text-[10px] text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground/70">Renews:</span>{" "}
                    {renewal?.renewalDate} · auto-renewal on
                  </p>
                  <p>
                    <span className="font-semibold text-foreground/70">Cancel:</span> anytime from your dashboard
                  </p>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={
                    featured
                      ? "gold-gradient flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95"
                      : "flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] py-3 text-sm font-bold text-foreground transition hover:bg-white/[0.1] active:scale-95"
                  }
                >
                  Select Plan
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Terms checkbox */}
        <motion.label
          id="terms-checkbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-xs text-muted-foreground">
            I agree to the OXEN Consulting{" "}
            <span className="font-semibold text-primary">Terms & Conditions</span>, including the subscription
            auto-renewal policy, platform commission on package sales, and acceptable use guidelines. I understand I
            can cancel anytime and my data is preserved in read-only mode after expiry.
          </span>
        </motion.label>
      </section>

      {/* Features overview */}
      <section className="mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-5 font-display text-xl font-bold sm:text-2xl"
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
        className="mb-12"
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
      <section className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-5 flex items-center gap-2"
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
        <button
          onClick={() => handleSelectPlan("quarterly")}
          className="gold-gradient mx-auto flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          Get started today
        </button>
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
