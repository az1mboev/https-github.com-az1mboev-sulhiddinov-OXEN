import { motion } from "framer-motion";
import { Compass, TrendingUp, Globe2, Map, Sparkles, ArrowRight } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { DESTINATIONS } from "@/data/feedData";
import { COUNTRIES } from "@/data/countries";
import { useLanguage } from "@/contexts/LanguageContext";

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

/* ── Featured hero card ────────────────────────────────────────────── */

function FeaturedCard({ dest, index }: { dest: typeof DESTINATIONS[0]; index: number }) {
  const navigate = useNavigate();
  const country = COUNTRIES.find((c) => c.name === dest.country);

  const handleClick = useCallback(() => {
    if (country) navigate(`/country/${country.id}`);
  }, [country, navigate]);

  return (
    <motion.button
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, ...cardSpring }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className="travel-card group relative w-[240px] shrink-0 overflow-hidden rounded-3xl text-left"
    >
      <div className="relative h-[320px] w-full overflow-hidden">
        <img
          src={dest.imageUrl}
          alt={`${dest.city}, ${dest.country}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-lg backdrop-blur-md">
          {dest.flag}
        </span>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{dest.country}</p>
          <h3 className="font-display text-xl font-extrabold text-white">{dest.city}</h3>
          <p className="mt-1 line-clamp-1 text-xs text-white/50">{dest.description}</p>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Quick action tile ─────────────────────────────────────────────── */

function QuickAction({
  icon: Icon,
  label,
  description,
  to,
  delay,
}: {
  icon: typeof Compass;
  label: string;
  description: string;
  to: string;
  delay: number;
}) {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, ...cardSpring }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(to)}
      className="glass group flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition hover:border-primary/30"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/20 group-hover:scale-110">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div>
        <p className="font-display text-sm font-bold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition group-hover:translate-x-1 group-hover:text-primary" />
    </motion.button>
  );
}

/* ── Main Explore page ─────────────────────────────────────────────── */

export default function Explore() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const trending = DESTINATIONS.filter((d) => d.category === "trending").slice(0, 6);
  const popular = DESTINATIONS.filter((d) => d.category === "popular-cities").slice(0, 4);

  return (
    <div className="min-h-screen px-5 pt-16 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <Compass className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">{t("nav.explore", "Explore")}</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          {t("explore.heading", "Discover your next")}
          <br />
          <span className="text-gold-gradient">{t("explore.headingAccent", "great adventure")}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("explore.subtitle", "From trending destinations to hidden gems — start your journey here.")}
        </p>
      </motion.div>

      {/* Quick actions grid */}
      <div className="mb-8 grid grid-cols-2 gap-3">
        <QuickAction
          icon={Globe2}
          label={t("explore.3dGlobe", "3D Globe")}
          description={t("explore.3dGlobeDesc", "Explore the world interactively")}
          to="/"
          delay={0.1}
        />
        <QuickAction
          icon={Sparkles}
          label={t("explore.aiPlanner", "AI Planner")}
          description={t("explore.aiPlannerDesc", "Plan a trip with AI")}
          to="/planner"
          delay={0.15}
        />
        <QuickAction
          icon={TrendingUp}
          label={t("explore.trending", "Trending")}
          description={t("explore.trendingDesc", "See what's hot right now")}
          to="/travel"
          delay={0.2}
        />
        <QuickAction
          icon={Map}
          label={t("nav.trips", "My Trips")}
          description={t("explore.myTripsDesc", "View saved itineraries")}
          to="/trips"
          delay={0.25}
        />
      </div>

      {/* Trending destinations */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2.2} />
            <h2 className="font-display text-lg font-bold">{t("explore.trendingNow", "Trending Now")}</h2>
          </div>
          <button
            onClick={() => navigate("/travel")}
            className="text-xs font-semibold text-primary transition hover:opacity-80"
          >
            {t("common.viewAll", "View all")} →
          </button>
        </div>
        <div className="-mx-5 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-5">
            {trending.map((dest, i) => (
              <FeaturedCard key={dest.id} dest={dest} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular cities */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{t("explore.popularCities", "Popular Cities")}</h2>
          <button
            onClick={() => navigate("/travel")}
            className="text-xs font-semibold text-primary transition hover:opacity-80"
          >
            {t("common.viewAll", "View all")} →
          </button>
        </div>
        <div className="-mx-5 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-5">
            {popular.map((dest, i) => (
              <FeaturedCard key={dest.id} dest={dest} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
