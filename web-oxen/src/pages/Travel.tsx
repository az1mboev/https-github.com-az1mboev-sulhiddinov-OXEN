import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Users, Bookmark, Star, Search, Flame, Trophy, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { OptimizedImage } from "@/components/OptimizedImage";
import VideoPlayer from "@/components/VideoPlayer";
import { CATEGORIES, DESTINATIONS, getDestinationsByCategory, type TrendingDestination, type DestinationCategory } from "@/data/feedData";
import { COUNTRIES } from "@/data/countries";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/* ── Animation presets ────────────────────────────────────────────── */

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, type: "spring" as const, stiffness: 260, damping: 24, mass: 0.8 },
  }),
};

/* ── Category section ─────────────────────────────────────────────── */

function DestinationSection({
  category,
  saved,
  onToggleSave,
  onWatchVideo,
}: {
  category: { key: DestinationCategory; emoji: string; labelKey: string };
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  onWatchVideo: (dest: TrendingDestination) => void;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const items = getDestinationsByCategory(category.key);

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2.5 px-5">
        <span className="text-xl">{category.emoji}</span>
        <h2 className="font-display text-lg font-bold">{t(category.labelKey)}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} {t("travel.places", "places")}</span>
      </div>

      {/* Horizontal scroll cards */}
      <div className="-mx-5 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 px-5">
          <AnimatePresence mode="popLayout">
            {items.map((dest, i) => (
              <DestinationCard
                key={dest.id}
                dest={dest}
                index={i}
                saved={saved.has(dest.id)}
                onToggleSave={onToggleSave}
                onWatchVideo={onWatchVideo}
                onNavigate={(countryName) => {
                  const country = COUNTRIES.find((c) => c.name === countryName);
                  if (country) navigate(`/country/${country.id}`);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ── Destination card ─────────────────────────────────────────────── */

function DestinationCard({
  dest,
  index,
  saved,
  onToggleSave,
  onNavigate,
  onWatchVideo,
}: {
  dest: TrendingDestination;
  index: number;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onNavigate: (countryName: string) => void;
  onWatchVideo: (dest: TrendingDestination) => void;
}) {
  const { t } = useLanguage();
  return (
    <motion.article
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: 0.97 }}
      className="travel-card group relative w-[280px] shrink-0 overflow-hidden rounded-3xl"
    >
      {/* Cover image */}
      <div className="relative h-[380px] w-full overflow-hidden">
        <OptimizedImage
          src={dest.imageUrl}
          alt={`${dest.city}, ${dest.country}`}
          placeholderType="post"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        {/* Top row — flag + visitor count + rating */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-xl backdrop-blur-md">
            {dest.flag}
          </span>
          <div className="flex items-center gap-2">
            {dest.rating >= 4.9 && (
              <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1.5 backdrop-blur-md">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={0} />
                <span className="text-xs font-bold text-amber-300">{dest.rating}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
              <Users className="h-3.5 w-3.5 text-white/70" strokeWidth={2} />
              <span className="text-xs font-semibold text-white/90">{dest.visitors}</span>
            </div>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.06, duration: 0.4 }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{dest.country}</p>
            <h3 className="font-display text-2xl font-extrabold text-white">{dest.city}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-white/70">{dest.description}</p>
          </motion.div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center gap-2.5">
            <button
              onClick={() => onWatchVideo(dest)}
              disabled={!dest.videoUrl}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold backdrop-blur-md transition active:scale-95",
                dest.videoUrl
                  ? "bg-white/15 text-white hover:bg-white/25"
                  : "bg-white/5 text-white/30 cursor-not-allowed",
              )}
            >
              <Play className="h-4 w-4 fill-white" strokeWidth={0} />
              {dest.videoUrl ? t("travel.watchVideo", "Watch Video") : t("travel.noVideo", "No Video")}
            </button>
            <button
              onClick={() => onToggleSave(dest.id)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl backdrop-blur-md transition active:scale-90",
                saved
                  ? "bg-primary/30 text-primary"
                  : "bg-white/15 text-white hover:bg-white/25",
              )}
              aria-label="Save destination"
            >
              <Bookmark className={cn("h-5 w-5", saved && "fill-primary")} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ── Main Travel page ─────────────────────────────────────────────── */

export default function Travel() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState<string>("");
  const [videoDest, setVideoDest] = useState<TrendingDestination | null>(null);

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleWatchVideo = useCallback((dest: TrendingDestination) => {
    if (dest.videoUrl) setVideoDest(dest);
  }, []);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    const q = query.toLowerCase();
    // If searching, filter destinations across all categories
    const hasMatches = DESTINATIONS.some(
      (d) =>
        d.country.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    );
    return hasMatches ? CATEGORIES : [];
  }, [query]);

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
          <Flame className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">{t("travel.discover", "Discover")}</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          {t("travel.heading", "Explore the world's")}
          <br />
          <span className="text-gold-gradient">{t("travel.headingAccent", "most amazing places")}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("travel.subtitle", "Trending destinations, hidden gems, and bucket-list spots curated by millions of travelers.")}
        </p>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="glass mb-6 flex items-center gap-3 rounded-2xl px-4 py-3"
      >
        <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("travel.searchPlaceholder", "Search destinations...")}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("common.clear", "Clear")}
          </button>
        )}
      </motion.div>

      {/* Category sections */}
      {filteredCategories.length > 0 ? (
        filteredCategories.map((cat) => (
          <DestinationSection
            key={cat.key}
            category={cat}
            saved={saved}
            onToggleSave={toggleSave}
            onWatchVideo={handleWatchVideo}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-foreground">{t("travel.noResults", "No destinations found for")} "{query}"</p>
          <button
            onClick={() => setQuery("")}
            className="mt-4 rounded-full bg-white/5 px-5 py-2 text-sm font-medium text-foreground transition hover:bg-white/10"
          >
            {t("travel.clearSearch", "Clear search")}
          </button>
        </div>
      )}

      {/* Video player modal */}
      {videoDest && videoDest.videoUrl && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={() => setVideoDest(null)}
          >
            <button
              onClick={() => setVideoDest(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 26 }}
              className="w-full max-w-2xl px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{videoDest.flag} {videoDest.country}</p>
                <h3 className="font-display text-2xl font-extrabold text-white">{videoDest.city}</h3>
              </div>
              <VideoPlayer
                src={videoDest.videoUrl}
                poster={videoDest.imageUrl}
                autoPlay
                className="aspect-video w-full"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
