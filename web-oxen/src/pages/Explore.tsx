import { motion } from "framer-motion";
import { Compass, TrendingUp, Globe2, Map, Sparkles, ArrowRight, Mountain, Waves, Building2, Landmark } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  DESTINATIONS,
  CATEGORIES,
  type DestinationCategory,
  type TrendingDestination,
} from "@/data/feedData";
import { COUNTRIES } from "@/data/countries";
import { useLanguage } from "@/contexts/LanguageContext";
import { springGentle, springCard, staggerContainer, fadeUpChild, willChangeTransform } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Category chip config — icons + localized labels                     */
/* ------------------------------------------------------------------ */

const CATEGORY_CHIPS: {
  key: DestinationCategory | "all";
  icon: typeof Compass;
  labelKey: string;
  fallback: string;
}[] = [
  { key: "all", icon: Globe2, labelKey: "explore.chipAll", fallback: "All" },
  { key: "trending", icon: TrendingUp, labelKey: "explore.trending", fallback: "Trending" },
  { key: "beaches", icon: Waves, labelKey: "explore.chipBeaches", fallback: "Beaches" },
  { key: "mountains", icon: Mountain, labelKey: "explore.chipMountains", fallback: "Mountains" },
  { key: "historical", icon: Landmark, labelKey: "explore.chipHistorical", fallback: "Historical" },
  { key: "modern-cities", icon: Building2, labelKey: "explore.chipModern", fallback: "Modern Cities" },
];

/* ── Adventures: large immersive horizontal scroller card ─────────── */

function AdventureCard({ dest, index }: { dest: TrendingDestination; index: number }) {
  const navigate = useNavigate();
  const country = COUNTRIES.find((c) => c.name === dest.country);

  const handleClick = useCallback(() => {
    if (country) navigate(`/country/${country.id}`);
  }, [country, navigate]);

  return (
    <motion.button
      initial={{ opacity: 0, x: 32, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.08, ...springCard }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      style={willChangeTransform}
      className="travel-card group relative w-[280px] shrink-0 overflow-hidden rounded-3xl text-left sm:w-[320px]"
    >
      <div className="relative h-[360px] w-full overflow-hidden sm:h-[400px]">
        <img
          src={dest.imageUrl}
          alt={`${dest.city}, ${dest.country}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg backdrop-blur-md">
          {dest.flag}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur-md">
          ★ {dest.rating}
        </span>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{dest.country}</p>
          <h3 className="font-display text-2xl font-extrabold text-white">{dest.city}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-white/50">{dest.description}</p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-white/40">
            <span className="rounded-full bg-white/10 px-2 py-0.5">{dest.visitors} visitors</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Discover: masonry-style varied-height card ────────────────────── */

const MASONRY_HEIGHTS = ["h-[240px]", "h-[300px]", "h-[200px]", "h-[280px]", "h-[260px]", "h-[320px]"];

function DiscoverCard({ dest, index }: { dest: TrendingDestination; index: number }) {
  const navigate = useNavigate();
  const country = COUNTRIES.find((c) => c.name === dest.country);
  const heightClass = MASONRY_HEIGHTS[index % MASONRY_HEIGHTS.length];

  const handleClick = useCallback(() => {
    if (country) navigate(`/country/${country.id}`);
  }, [country, navigate]);

  return (
    <motion.button
      variants={fadeUpChild}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -4 }}
      onClick={handleClick}
      style={willChangeTransform}
      className={cn(
        "travel-card group relative w-full overflow-hidden rounded-3xl text-left",
        heightClass,
      )}
    >
      <img
        src={dest.imageUrl}
        alt={`${dest.city}, ${dest.country}`}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-sm backdrop-blur-md">
        {dest.flag}
      </span>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{dest.country}</p>
        <h3 className="font-display text-base font-extrabold text-white">{dest.city}</h3>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-white/40">{dest.description}</p>
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
      transition={{ delay, ...springCard }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(to)}
      className="glass group flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition hover:border-primary/30"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/20 group-hover:scale-110">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div>
        <p className="font-display text-sm font-bold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition group-hover:translate-x-1 group-hover:text-primary" />
    </motion.button>
  );
}

/* ── Sticky section header with glass blur ────────────────────────── */

function StickySectionHeader({
  icon: Icon,
  title,
  onViewAll,
}: {
  icon: typeof Compass;
  title: string;
  onViewAll: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="sticky top-14 z-20 -mx-5 mb-4 flex items-center justify-between bg-background/60 px-5 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      </div>
      <button
        onClick={onViewAll}
        className="flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-80"
      >
        {t("common.viewAll", "View all")}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ── Main Explore page ─────────────────────────────────────────────── */

export default function Explore() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [activeCategory, setActiveCategory] = useState<DestinationCategory | "all">("all");

  // Adventures — curated: trending + most-loved
  const adventures = useMemo(
    () =>
      DESTINATIONS.filter(
        (d) => d.category === "trending" || d.category === "most-loved",
      ).slice(0, 8),
    [],
  );

  // Discover — filtered by category chip
  const discoverDestinations = useMemo(() => {
    if (activeCategory === "all") {
      return DESTINATIONS.filter(
        (d) =>
          d.category === "popular-cities" ||
          d.category === "beaches" ||
          d.category === "mountains" ||
          d.category === "historical" ||
          d.category === "modern-cities",
      ).slice(0, 12);
    }
    return DESTINATIONS.filter((d) => d.category === activeCategory).slice(0, 12);
  }, [activeCategory]);

  const handleViewAll = useCallback(
    (category?: DestinationCategory) => {
      navigate(`/travel${category ? `?cat=${category}` : ""}`);
    },
    [navigate],
  );

  return (
    <div className="min-h-screen px-5 pt-16 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
        className="mb-6"
      >
        <div className="mb-2 flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            {t("nav.explore", "Explore")}
          </span>
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

      {/* ── Adventures section ──────────────────────────────────── */}
      <section className="mb-8">
        <StickySectionHeader
          icon={TrendingUp}
          title={t("explore.adventures", "Adventures")}
          onViewAll={() => handleViewAll("trending")}
        />
        <div className="-mx-5 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-5">
            {adventures.map((dest, i) => (
              <AdventureCard key={dest.id} dest={dest} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Discover section ─────────────────────────────────────── */}
      <section className="mb-8">
        <StickySectionHeader
          icon={Compass}
          title={t("explore.discover", "Discover")}
          onViewAll={() => handleViewAll()}
        />

        {/* Category filter chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.1 }}
          className="mb-4 flex flex-wrap gap-2"
        >
          {CATEGORY_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isActive = activeCategory === chip.key;
            return (
              <motion.button
                key={chip.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(chip.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "glass text-foreground/70 hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" strokeWidth={2.2} />
                {t(chip.labelKey, chip.fallback)}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Masonry-style grid — CSS columns for varied heights */}
        <motion.div
          key={activeCategory}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="columns-2 gap-3 sm:columns-3"
        >
          {discoverDestinations.map((dest, i) => (
            <div key={dest.id} className="mb-3 break-inside-avoid">
              <DiscoverCard dest={dest} index={i} />
            </div>
          ))}
        </motion.div>

        {discoverDestinations.length === 0 && (
          <div className="glass rounded-2xl px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t("explore.noResults", "No destinations in this category yet")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
