import { AnimatePresence, motion } from "framer-motion";
import { Heart, MessageCircle, Play, Sparkles, Search, Share2, Bookmark, X, Flag } from "lucide-react";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import CommentsSheet from "@/components/CommentsSheet";
import DestinationModal from "@/components/DestinationModal";
import { OptimizedImage } from "@/components/OptimizedImage";
import ReportModal from "@/components/ReportModal";
import TravelOptionsPanel from "@/components/TravelOptionsPanel";
import VideoPlayer from "@/components/VideoPlayer";
import { useComments } from "@/contexts/CommentsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTravel } from "@/contexts/TravelContext";
import { FEED_POSTS, type FeedPost } from "@/data/feedData";
import { COUNTRIES, type Country } from "@/data/countries";

const OXEN_LOGO = "/logo.png";

const Globe = lazy(() => import("@/components/Globe"));

/* ------------------------------------------------------------------ */
/*  Modal flow steps                                                   */
/* ------------------------------------------------------------------ */

type ModalStep = "closed" | "destination" | "options";

/* ── Feed post card ────────────────────────────────────────────────── */

function FeedPostCard({ post, index }: { post: FeedPost; index: number }) {
  const navigate = useNavigate();
  const { getCommentCount } = useComments();
  const [liked, setLiked] = useState<boolean>(post.liked ?? false);
  const [likeCount, setLikeCount] = useState<number>(post.likes);
  const [saved, setSaved] = useState<boolean>(post.saved ?? false);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showVideo, setShowVideo] = useState<boolean>(false);

  const commentCount = getCommentCount(post.id);

  const toggleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  }, []);

  const toggleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((prev) => {
      if (!prev) toast.success("Saved to favorites");
      return !prev;
    });
  }, []);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: `${post.city}, ${post.country}`, text: post.caption }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`Check out ${post.city}, ${post.country} on OXEN!`);
      toast.success("Link copied to clipboard");
    }
  }, [post.city, post.country, post.caption]);

  const handleReport = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReport(true);
  }, []);

  const handleExplore = useCallback(() => {
    const country = COUNTRIES.find((c) => c.name === post.country);
    if (country) navigate(`/country/${country.id}`);
  }, [post.country, navigate]);

  return (
    <motion.article
      initial={{ opacity: 0, x: 48, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: index * 0.07,
        type: "spring" as const,
        stiffness: 280,
        damping: 26,
        mass: 0.85,
      }}
      whileTap={{ scale: 0.97 }}
      onClick={handleExplore}
      className="feed-card group relative w-[260px] shrink-0 cursor-pointer overflow-hidden rounded-3xl"
    >
      {/* Cover */}
      <div className="relative h-[340px] w-full overflow-hidden">
        <OptimizedImage
          src={post.coverUrl}
          alt={`${post.city}, ${post.country}`}
          placeholderType="post"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Video indicator / play button */}
        {post.isVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowVideo(true); }}
            className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition group-hover:scale-110 group-hover:bg-white/30 active:scale-90"
          >
            <Play className="h-6 w-6 fill-white text-white ml-0.5" strokeWidth={0} />
          </button>
        )}

        {/* Top-right action buttons */}
        <div className="absolute right-0 top-0 flex flex-col gap-2 p-3">
          <button
            onClick={handleShare}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-md transition hover:bg-black/60 hover:text-white active:scale-90"
            aria-label="Share"
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={toggleSave}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
              saved ? "bg-amber-500/30 text-amber-400" : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
            }`}
            aria-label="Save"
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-amber-400" : ""}`} strokeWidth={2} />
          </button>
          <button
            onClick={handleReport}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-md transition hover:bg-red-500/30 hover:text-red-400 active:scale-90"
            aria-label="Report"
          >
            <Flag className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* User row */}
        <div className="absolute left-0 right-0 top-0 flex items-center gap-2.5 p-4">
          <OptimizedImage
            src={post.avatarUrl}
            alt={post.username}
            placeholderType="avatar"
            className="h-9 w-9 rounded-full border-2 border-white/30 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-bold text-white">{post.username}</p>
            <p className="truncate text-xs text-white/60">{post.flag} {post.city}, {post.country}</p>
          </div>
        </div>

        {/* Bottom caption + stats */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="mb-3 line-clamp-2 text-sm text-white/85">{post.caption}</p>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLike}
              className="flex items-center gap-1.5 transition active:scale-90"
            >
              <Heart
                className={liked ? "h-4 w-4 fill-red-500 text-red-500" : "h-4 w-4 text-white/80"}
                strokeWidth={2}
              />
              <span className="text-xs font-semibold text-white/80">
                {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}
              </span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
              className="flex items-center gap-1.5 transition active:scale-90"
            >
              <MessageCircle className="h-4 w-4 text-white/80" strokeWidth={2} />
              <span className="text-xs font-semibold text-white/80">
                {commentCount >= 1000 ? `${(commentCount / 1000).toFixed(1)}K` : commentCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments sheet */}
      <CommentsSheet
        postId={post.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />

      {/* Report modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={post.userId}
        reportedUserName={post.username}
        reportedPostId={post.id}
      />

      {/* Video player modal */}
      {showVideo && post.videoUrl && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={() => setShowVideo(false)}
          >
            <button
              onClick={() => setShowVideo(false)}
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
              <VideoPlayer
                src={post.videoUrl}
                poster={post.coverUrl}
                autoPlay
                className="aspect-video w-full"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </motion.article>
  );
}

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

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 backdrop-blur-xl border border-white/10 text-sm text-white/60 transition hover:bg-white/12 hover:text-white active:scale-95"
            aria-label="Search destinations"
          >
            <Search className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Search destinations</span>
          </button>
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

      {/* ── Travel posts around the world ──────────── */}
      <section className="relative z-10 pt-8 pb-10">
        <div className="mb-4 flex items-center justify-between px-5">
          <div>
            <h2 className="font-display text-lg font-bold">{t("home.travelPosts", "Travel Posts Around the World")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("home.travelPostsDesc", "Community stories from across the globe")}</p>
          </div>
          <button
            onClick={() => navigate("/travel")}
            className="text-xs font-semibold text-primary transition hover:opacity-80"
          >
            {t("home.viewAll", "View all")} →
          </button>
        </div>

        <div className="-mx-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-5">
            {FEED_POSTS.map((post, i) => (
              <FeedPostCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </div>
      </section>

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
