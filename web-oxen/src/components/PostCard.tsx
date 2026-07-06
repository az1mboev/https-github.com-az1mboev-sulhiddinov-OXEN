import { AnimatePresence, motion } from "framer-motion";
import { Heart, MessageCircle, Play, Share2, Bookmark, X, Flag } from "lucide-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import CommentsSheet from "@/components/CommentsSheet";
import ReportModal from "@/components/ReportModal";
import VideoPlayer from "@/components/VideoPlayer";
import { useComments } from "@/contexts/CommentsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTravel } from "@/contexts/TravelContext";
import { FEED_POSTS, type FeedPost } from "@/data/feedData";
import { COUNTRIES } from "@/data/countries";
import { springCard, willChangeTransform } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  PostCard — shared travel post card with size variants               */
/*  Variants: "hero" (large featured), "side" (stacked column),         */
/*  "medium" (grid row). All share like/save/comment/report/video.      */
/* ------------------------------------------------------------------ */

type PostCardSize = "hero" | "side" | "medium";

interface PostCardProps {
  post: FeedPost;
  size?: PostCardSize;
  index?: number;
  className?: string;
}

/* ── Size config ─────────────────────────────────────────────────── */

const SIZE_CONFIG: Record<
  PostCardSize,
  { height: string; className: string; captionLines: string; titleSize: string; avatarSize: string }
> = {
  hero: {
    height: "h-[440px] sm:h-[520px]",
    className: "w-full",
    captionLines: "line-clamp-3",
    titleSize: "text-xl sm:text-2xl",
    avatarSize: "h-10 w-10",
  },
  side: {
    height: "h-[200px] sm:h-[252px]",
    className: "w-full",
    captionLines: "line-clamp-2",
    titleSize: "text-sm",
    avatarSize: "h-8 w-8",
  },
  medium: {
    height: "h-[280px] sm:h-[320px]",
    className: "w-full",
    captionLines: "line-clamp-2",
    titleSize: "text-base",
    avatarSize: "h-9 w-9",
  },
};

/* ── Main PostCard ────────────────────────────────────────────────── */

export default function PostCard({ post, size = "medium", index = 0, className }: PostCardProps) {
  const navigate = useNavigate();
  const { getCommentCount } = useComments();
  const { t } = useLanguage();
  const [liked, setLiked] = useState<boolean>(post.liked ?? false);
  const [likeCount, setLikeCount] = useState<number>(post.likes);
  const [saved, setSaved] = useState<boolean>(post.saved ?? false);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showVideo, setShowVideo] = useState<boolean>(false);

  const commentCount = getCommentCount(post.id);
  const cfg = SIZE_CONFIG[size];

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
      if (!prev) toast.success(t("common.saved", "Saved to favorites"));
      return !prev;
    });
  }, [t]);

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navigator.share) {
        navigator.share({ title: `${post.city}, ${post.country}`, text: post.caption }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(`Check out ${post.city}, ${post.country} on SAFARIO!`);
        toast.success(t("common.linkCopied", "Link copied to clipboard"));
      }
    },
    [post.city, post.country, post.caption, t],
  );

  const handleReport = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReport(true);
  }, []);

  const handleExplore = useCallback(() => {
    const country = COUNTRIES.find((c) => c.name === post.country);
    if (country) navigate(`/country/${country.id}`);
  }, [post.country, navigate]);

  const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n);

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.06, ...springCard }}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.985 }}
        onClick={handleExplore}
        style={willChangeTransform}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-3xl border border-white/[0.06] shadow-xl",
          cfg.className,
          className,
        )}
      >
        {/* Cover image */}
        <div className={cn("relative w-full overflow-hidden", cfg.height)}>
          <img
            src={post.coverUrl}
            alt={`${post.city}, ${post.country}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

          {/* Video play button */}
          {post.isVideo && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowVideo(true); }}
              className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition group-hover:scale-110 group-hover:bg-white/30 active:scale-90"
              aria-label="Play video"
            >
              <Play className="h-6 w-6 fill-white text-white ml-0.5" strokeWidth={0} />
            </button>
          )}

          {/* Top-right actions */}
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
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90",
                saved ? "bg-amber-500/30 text-amber-400" : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white",
              )}
              aria-label="Save"
            >
              <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-amber-400")} strokeWidth={2} />
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
            <img
              src={post.avatarUrl}
              alt={post.username}
              className={cn("rounded-full border-2 border-white/30 object-cover", cfg.avatarSize)}
              loading="lazy"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-white">{post.username}</p>
              <p className="truncate text-xs text-white/60">{post.flag} {post.city}, {post.country}</p>
            </div>
          </div>

          {/* Bottom caption + stats */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className={cn("mb-2 text-white/85", cfg.captionLines, size === "hero" ? "text-sm" : "text-xs")}>
              {post.caption}
            </p>
            <div className="flex items-center gap-4">
              <button onClick={toggleLike} className="flex items-center gap-1.5 transition active:scale-90">
                <Heart
                  className={liked ? "h-4 w-4 fill-red-500 text-red-500" : "h-4 w-4 text-white/80"}
                  strokeWidth={2}
                />
                <span className="text-xs font-semibold text-white/80">{formatCount(likeCount)}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                className="flex items-center gap-1.5 transition active:scale-90"
              >
                <MessageCircle className="h-4 w-4 text-white/80" strokeWidth={2} />
                <span className="text-xs font-semibold text-white/80">{formatCount(commentCount)}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.article>

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
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
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
    </>
  );
}

/* ── Helper: pick N featured posts for the showcase ───────────────── */

export function pickFeaturedPosts(count: number = 6): FeedPost[] {
  return FEED_POSTS.slice(0, count);
}
