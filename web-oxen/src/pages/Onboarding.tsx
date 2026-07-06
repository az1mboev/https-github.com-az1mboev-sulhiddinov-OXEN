import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Globe2, Sparkles, Plane } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { APP_NAME, ICONS } from "@/lib/brand";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  springGentle,
  springSnappy,
  staggerContainer,
  fadeUpChild,
  willChangeTransform,
} from "@/lib/motion";

const LanguagePicker = lazy(() => import("@/components/LanguagePicker"));

/* ------------------------------------------------------------------ */
/*  Onboarding — full-screen cinematic welcome experience               */
/*  Three steps: Hero → Language selection → Start exploring            */
/* ------------------------------------------------------------------ */

const ONBOARDING_KEY = "safario.onboardingSeen";

export function getOnboardingSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // ignore
  }
}

/* ── Background visuals (Unsplash travel imagery) ─────────────────── */

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1500052326671-9d3b78b6f83b?w=1200&h=1600&fit=crop",
  "https://images.unsplash.com/photo-1518684079-3e8a8db71f38?w=1200&h=1600&fit=crop",
  "https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1200&h=1600&fit=crop",
];

type Step = 0 | 1 | 2;

export default function Onboarding() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [step, setStep] = useState<Step>(0);
  const [bgIndex, setBgIndex] = useState(0);

  // Cycle background images on the hero step
  useEffect(() => {
    if (step !== 0) return;
    const timer = setInterval(() => {
      setBgIndex((p) => (p + 1) % BG_IMAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [step]);

  const handleFinish = useCallback(() => {
    setOnboardingSeen();
    navigate("/");
  }, [navigate]);

  const handleSignIn = useCallback(() => {
    setOnboardingSeen();
    navigate("/auth");
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background safe-x">
      {/* ── Animated background ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={step === 0 ? `bg-${bgIndex}` : `bg-static`}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <img
              src={step === 0 ? BG_IMAGES[bgIndex] : BG_IMAGES[0]}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/30" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Top bar — logo + Sign In ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.2 }}
        className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        <div className="flex items-center gap-2">
          <img
            src={ICONS.source}
            alt={APP_NAME}
            className="h-10 w-10 rounded-xl object-contain shadow-lg"
          />
          <span className="font-display text-xl font-extrabold tracking-wide text-foreground">
            {APP_NAME}
          </span>
        </div>
        <button
          onClick={handleSignIn}
          className="glass-strong rounded-full px-4 py-2 text-xs font-bold text-foreground transition hover:scale-105 active:scale-95"
        >
          {t("home.signin", "Sign in")}
        </button>
      </motion.div>

      {/* ── Step content ─────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5">
        <AnimatePresence mode="wait">
          {/* Step 0 — Hero */}
          {step === 0 && (
            <motion.div
              key="step-0"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              className="flex flex-col items-center text-center"
              style={willChangeTransform}
            >
              <motion.div variants={fadeUpChild} className="mb-6">
                <span className="glass-strong inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-foreground/80">
                  <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
                  {t("onboarding.badge", "Your journey starts here")}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUpChild}
                className="font-display text-4xl font-extrabold leading-tight text-balance text-foreground sm:text-5xl"
              >
                {t("onboarding.title1", "Explore the world")}
                <br />
                <span className="text-gold-gradient">
                  {t("onboarding.title2", "from your fingertips")}
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUpChild}
                className="mt-4 max-w-sm text-sm text-muted-foreground sm:text-base"
              >
                {t(
                  "onboarding.subtitle",
                  "Spin a 3D globe, discover 200+ countries, and let AI plan your next great escape.",
                )}
              </motion.p>

              <motion.div variants={fadeUpChild} className="mt-8 flex flex-col items-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="gold-gradient flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-xl transition hover:scale-105 active:scale-95"
                >
                  {t("onboarding.start", "Get started")}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button
                  onClick={handleFinish}
                  className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {t("onboarding.skip", "Skip for now")}
                </button>
              </motion.div>

              {/* Feature pills */}
              <motion.div
                variants={fadeUpChild}
                className="mt-12 flex flex-wrap items-center justify-center gap-2"
              >
                {[
                  { icon: Globe2, label: t("onboarding.feat1", "3D Globe") },
                  { icon: Sparkles, label: t("onboarding.feat2", "AI Planner") },
                  { icon: Plane, label: t("onboarding.feat3", "200+ Countries") },
                ].map((feat, i) => (
                  <motion.span
                    key={feat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...springSnappy, delay: 0.6 + i * 0.1 }}
                    className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/70"
                  >
                    <feat.icon className="h-3 w-3 text-primary" strokeWidth={2.2} />
                    {feat.label}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Step 1 — Language selection */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40, transition: { duration: 0.3 } }}
              transition={springGentle}
              className="w-full max-w-md"
              style={willChangeTransform}
            >
              <div className="glass-strong rounded-3xl p-6 shadow-2xl">
                <div className="mb-5 text-center">
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={springSnappy}
                    className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"
                  >
                    <Globe2 className="h-6 w-6" strokeWidth={2.2} />
                  </motion.span>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {t("onboarding.languageTitle", "Choose your language")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                      "onboarding.languageSubtitle",
                      "You can change this anytime in Settings.",
                    )}
                  </p>
                </div>

                <Suspense
                  fallback={
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      {t("common.loading", "Loading…")}
                    </div>
                  }
                >
                  <LanguagePicker />
                </Suspense>

                <button
                  onClick={() => setStep(2)}
                  className="gold-gradient mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-xl transition hover:scale-[1.02] active:scale-95"
                >
                  {t("onboarding.continue", "Continue")}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Ready to explore */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
              className="flex flex-col items-center text-center"
              style={willChangeTransform}
            >
              <motion.div variants={fadeUpChild} className="mb-6">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springSnappy, delay: 0.2 }}
                  className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/15 text-primary"
                >
                  <Plane className="h-8 w-8" strokeWidth={2} />
                </motion.span>
              </motion.div>

              <motion.h2
                variants={fadeUpChild}
                className="font-display text-3xl font-extrabold text-balance text-foreground sm:text-4xl"
              >
                {t("onboarding.readyTitle", "You're all set!")}
              </motion.h2>
              <motion.p
                variants={fadeUpChild}
                className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base"
              >
                {t(
                  "onboarding.readySubtitle",
                  "Spin the globe, discover new places, and let AI craft your perfect itinerary.",
                )}
              </motion.p>

              <motion.div variants={fadeUpChild} className="mt-8 flex flex-col items-center gap-3">
                <button
                  onClick={handleFinish}
                  className="gold-gradient flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-xl transition hover:scale-105 active:scale-95"
                >
                  {t("onboarding.explore", "Start exploring")}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button
                  onClick={handleSignIn}
                  className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {t("home.signin", "Sign in")} →
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Step indicators ──────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{
              width: step === i ? 24 : 8,
              opacity: step === i ? 1 : 0.4,
            }}
            transition={springSnappy}
            className="h-2 rounded-full bg-foreground"
          />
        ))}
      </div>
    </div>
  );
}
