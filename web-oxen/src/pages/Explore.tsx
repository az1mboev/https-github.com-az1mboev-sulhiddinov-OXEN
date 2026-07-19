import { motion } from "framer-motion";
import { Briefcase, Sparkles, LayoutDashboard } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

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
      navigate(`/auth?redirect=${encodeURIComponent("/consulting/checkout")}`);
      return;
    }
    navigate("/consulting/checkout");
  }, [user, navigate]);

  // If the user is already a consulting member, show a "Go to Dashboard" CTA instead.
  const showGoToDashboard = isMember && (hasActiveSubscription || hasExpiredSubscription);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 pt-16 pb-10 text-center">
      {/* Hero — single primary CTA */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={springIn}>
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
          revenue — all in one premium workspace.
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
        </motion.div>
      </motion.div>
    </div>
  );
}
