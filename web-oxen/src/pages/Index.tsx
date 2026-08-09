import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Search, X } from "lucide-react";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DestinationModal from "@/components/DestinationModal";
import GlobeFilterPanel, { FilterButton } from "@/components/GlobeFilterPanel";
import TravelOptionsPanel from "@/components/TravelOptionsPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTravel } from "@/contexts/TravelContext";
import { COUNTRIES, type Country } from "@/data/countries";

const OXEN_LOGO = "/logo.png";

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
        {/* Search bar */}
        <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-2xl">
          <Search className="h-5 w-5 shrink-0 text-white/40" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by country, city, or attraction..."
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

        {/* Results */}
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
            <p className="text-sm text-white/40">No destinations found for "{query}"</p>
          </div>
        )}
      </motion.div>
    </motion.div>
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
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

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

  // Tapping ocean on the globe closes the open panel (but keeps the globe
  // fully interactive — rotate/drag/zoom are never blocked).
  const handleBackgroundTap = useCallback(() => {
    if (modalStep !== "closed") handleCloseAll();
  }, [modalStep, handleCloseAll]);

  const handleSearchSelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    setModalStep("destination");
    setZoomTarget({ lat: country.lat, lng: country.lng });
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  return (
    <div className="relative">
      {/* ── Hero globe ─────────────────────────────── */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 z-0"
          animate={{ x: sidebarOpen ? "28%" : "0%" }}
          transition={{ type: "spring", stiffness: 240, damping: 27, mass: 1 }}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading globe…
              </div>
            }
          >
            <Globe
              onCountrySelect={handleCountrySelect}
              onBackgroundTap={handleBackgroundTap}
              selectedCountry={selectedCountry}
              zoomTarget={zoomTarget}
              visitedIds={visitedSet}
              wishlistIds={wishlistSet}
            />
          </Suspense>
        </motion.div>

        {/* Top bar — logo + search */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 pt-6"
        >
          <div className="flex items-center gap-2">
            <img
              src={OXEN_LOGO}
              alt="OXEN"
              className="h-9 w-9 rounded-xl object-contain shadow-lg"
              loading="lazy"
              onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
            />
            <span className="font-display text-xl font-extrabold tracking-wide">OXEN</span>
          </div>

          {/* Search + Filter buttons */}
          <div className="pointer-events-auto flex items-center gap-2">
            <FilterButton onClick={() => setFilterOpen(true)} />
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 backdrop-blur-xl border border-white/10 text-sm text-white/60 transition hover:bg-white/12 hover:text-white active:scale-95"
              aria-label="Search destinations"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Search destinations</span>
            </button>
          </div>
        </motion.div>

        {/* Bottom hero copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="pointer-events-none absolute bottom-[6%] left-0 right-0 z-20 px-6 text-center"
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
      </section>

      {/* ── Globe filter panel ─────────────────────── */}
      <GlobeFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onViewGlobe={(country) => {
          setSelectedCountry(country);
          setModalStep("destination");
          setZoomTarget({ lat: country.lat, lng: country.lng });
        }}
      />

      {/* ── Search overlay ─────────────────────────── */}
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

      {/* ── Modals ──────────────────────────────────── */}
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
