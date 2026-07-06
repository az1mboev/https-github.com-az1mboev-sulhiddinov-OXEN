import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Search, X, ArrowRight, Compass, Plane, Sparkle } from "lucide-react";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DestinationModal from "@/components/DestinationModal";
import GlobeHint from "@/components/GlobeHint";
import PostCard, { pickFeaturedPosts } from "@/components/PostCard";
import TravelOptionsPanel from "@/components/TravelOptionsPanel";
import { APP_NAME, ICONS } from "@/lib/brand";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTravel } from "@/contexts/TravelContext";
import { COUNTRIES, type Country } from "@/data/countries";
import { springGentle, staggerContainer, fadeUpChild, willChangeTransform } from "@/lib/motion";

const Globe = lazy(() => import("@/components/Globe"));

/* ------------------------------------------------------------------ */
/*  Modal flow steps                                                   */
/* ------------------------------------------------------------------ */

type ModalStep = "closed" | "destination" | "options";

/* ── Search overlay ────────────────────────────────────────────────── */

function SearchOverlay({
  query,
  setQuery,
  onSelect,
  onClose,
}: {
  query: string;
  setQuery: (v: string) => void;
  onSelect: (country: Country) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.cities.some((city) => city.name.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [query]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: "spring" as const, stiffness: 300, damping: 28 }}
        className="mx-auto mt-20 w-full max-w-md px-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-2xl">
          <Search className="h-5 w-5 shrink-0 text-white/40" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("home.searchPlaceholder", "Search by country, city, or attraction…")}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 transition hover:bg-white/20 hover:text-white"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="glass-strong mt-3 overflow-hidden rounded-2xl shadow-2xl"
          >
            {results.map((country, i) => (
              <motion.button
                key={country.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.2 }}
                onClick={() => onSelect(country)}
                className="flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.05] last:border-0"
              >
                <span className="text-2xl">{country.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{country.name}</p>
                  <p className="truncate text-xs text-white/40">
                    {country.capital} · {country.continent}
                  </p>
                </div>
                <Sparkles className="h-4 w-4 text-white/20" strokeWidth={2} />
              </motion.button>
            ))}
          </motion.div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="glass-strong mt-3 rounded-2xl px-4 py-8 text-center shadow-2xl">
            <p className="text-sm text-white/40">
              {t("home.noResults", "No destinations found for")} "{query}"
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Quick explore action tile ─────────────────────────────────────── */

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
      variants={fadeUpChild}
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

/* ── Main Index page ───────────────────────────────────────────────── */

export default function Index() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isOpen: sidebarOpen } = useSidebar();
  const { visited, wishlist } = useTravel();

  const visitedSet = useMemo(() => new Set(visited), [visited]);
  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>("closed");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [zoomTarget, setZoomTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [globeActive, setGlobeActive] = useState<boolean>(false);

  const featuredPosts = useMemo(() => pickFeaturedPosts(6), []);
  const heroPost = featuredPosts[0];
  const sidePosts = featuredPosts.slice(1, 3);
  const mediumPosts = featuredPosts.slice(3, 6);

  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    setModalStep("destination");
  }, []);

  const handleShowOptions = useCallback(() => {
    setModalStep("options");
  }, []);

  const handleCloseAll = useCallback(() => {
    setModalStep("closed");
    setTimeout(() => setSelectedCountry(null), 350);
  }, []);

  const handleSearchSelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    setModalStep("destination");
    setZoomTarget({ lat: country.lat, lng: country.lng });
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  return (
    <div className="relative">
      {/* ── Hero globe section ──────────────────────────────────── */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 z-0"
          animate={{ x: sidebarOpen ? "28%" : "0%" }}
          transition={{ type: "spring", stiffness: 240, damping: 27, mass: 1 }}
          style={willChangeTransform}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {t("common.loading", "Loading…")}
              </div>
            }
          >
            <Globe
              onCountrySelect={handleCountrySelect}
              selectedCountry={selectedCountry}
              zoomTarget={zoomTarget}
              visitedIds={visitedSet}
              wishlistIds={wishlistSet}
              isActive={globeActive}
              onActivate={() => setGlobeActive(true)}
            />
          </Suspense>
        </motion.div>

        {/* Top bar — logo + search */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          <div className="flex items-center gap-2">
            <img
              src={ICONS.source}
              alt={APP_NAME}
              className="h-9 w-9 rounded-xl object-contain shadow-lg"
            />
            <span className="font-display text-xl font-extrabold tracking-wide">{APP_NAME}</span>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 backdrop-blur-xl border border-white/10 text-sm text-white/60 transition hover:bg-white/12 hover:text-white active:scale-95"
            aria-label={t("home.search", "Search destinations")}
          >
            <Search className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">{t("home.search", "Search destinations")}</span>
          </button>
        </motion.div>

        {/* Bottom hero copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="pointer-events-none absolute bottom-[8%] left-0 right-0 z-20 px-6 text-center"
        >
          <h1 className="font-display text-4xl font-extrabold leading-tight text-balance sm:text-5xl">
            {t("hero.title.line1", "See the world")}
            <br />
            <span className="text-gold-gradient">{t("hero.title.line2", "from above.")}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground">
            {t("hero.subtitle", "Spin the globe, discover countries, and let AI plan your next great escape.")}
          </p>
          <button
            onClick={() => navigate("/planner")}
            className="gold-gradient pointer-events-auto mx-auto mt-5 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-xl transition hover:scale-105 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            {t("hero.cta", "Plan a trip with AI")}
          </button>
        </motion.div>

        {/* Tap-to-interact hint */}
        <GlobeHint visible={!globeActive} />
      </section>

      {/* ── Travel Posts showcase ───────────────────────────────── */}
      <section className="relative z-10 px-5 pt-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={springGentle}
          className="mb-5 flex items-center justify-between"
        >
          <div>
            <h2 className="font-display text-xl font-extrabold text-foreground">
              {t("home.postsTitle", "Travel Posts Around the World")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("home.postsSubtitle", "Community stories from across the globe")}
            </p>
          </div>
          <button
            onClick={() => navigate("/travel")}
            className="flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-80"
          >
            {t("common.viewAll", "View all")}
            <ArrowRight className="h-3 w-3" />
          </button>
        </motion.div>

        {/* Premium showcase: hero + side column, then medium row */}
        {heroPost && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Large featured — 2/3 width on sm+ */}
            <div className="sm:col-span-2">
              <PostCard post={heroPost} size="hero" index={0} />
            </div>
            {/* Stacked side column — 1/3 width */}
            <div className="flex flex-col gap-4">
              {sidePosts.map((post, i) => (
                <PostCard key={post.id} post={post} size="side" index={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Medium row — 3 cards */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {mediumPosts.map((post, i) => (
            <PostCard key={post.id} post={post} size="medium" index={i} />
          ))}
        </div>
      </section>

      {/* ── Quick explore actions ───────────────────────────────── */}
      <section className="relative z-10 px-5 pt-4 pb-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springGentle}
          className="mb-4 font-display text-lg font-bold text-foreground"
        >
          {t("home.quickExplore", "Quick explore")}
        </motion.h2>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <QuickAction
            icon={Compass}
            label={t("nav.explore", "Explore")}
            description={t("explore.trendingDesc", "See what's hot right now")}
            to="/explore"
            delay={0}
          />
          <QuickAction
            icon={Sparkle}
            label={t("explore.aiPlanner", "AI Planner")}
            description={t("explore.aiPlannerDesc", "Plan a trip with AI")}
            to="/planner"
            delay={0.05}
          />
          <QuickAction
            icon={Plane}
            label={t("nav.travel", "Travel")}
            description={t("home.travelDesc", "Browse all destinations")}
            to="/travel"
            delay={0.1}
          />
          <QuickAction
            icon={Sparkles}
            label={t("nav.trips", "My Trips")}
            description={t("home.tripsDesc", "View saved itineraries")}
            to="/trips"
            delay={0.15}
          />
        </motion.div>
      </section>

      {/* ── Sign-in CTA footer ──────────────────────────────────── */}
      <section className="relative z-10 px-5 pt-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={springGentle}
          className="glass-strong rounded-3xl p-6 text-center sm:p-8"
        >
          <h3 className="font-display text-lg font-bold text-foreground">
            {t("home.signinCtaTitle", "Save your journeys")}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {t("home.signinCtaDesc", "Sign in to bookmark countries, plan trips, and share your travel stories.")}
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="mt-4 flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95"
          >
            {t("home.signin", "Sign in")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </section>

      {/* ── Search overlay ──────────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            query={searchQuery}
            setQuery={setSearchQuery}
            onSelect={handleSearchSelect}
            onClose={() => setSearchOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCountry && modalStep === "destination" && (
          <DestinationModal
            key={`dest-${selectedCountry.id}`}
            country={selectedCountry}
            open
            onClose={handleCloseAll}
            onShowOptions={handleShowOptions}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCountry && modalStep === "options" && (
          <TravelOptionsPanel
            key={`opts-${selectedCountry.id}`}
            country={selectedCountry}
            open
            onClose={handleCloseAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
