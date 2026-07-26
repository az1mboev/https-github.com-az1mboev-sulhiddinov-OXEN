import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchPostById,
  togglePostLike,
  togglePostSave,
  incrementPostShare,
  incrementPostViews,
  type ConsultingPost,
} from "@/lib/consulting-posts";
import { ExploreBackButton, saveExploreScroll, useRestoreExploreScroll } from "@/components/ExploreBackButton";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function PostDetail() {
  const { postId = "" } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<ConsultingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useSEO({
    title: post ? `${post.company_name} — Post | OXEN` : "Post | OXEN",
    description: post?.content.slice(0, 140) ?? "Consulting post on OXEN.",
    image: post?.media[0]?.url,
  });

  useRestoreExploreScroll(`/explore/post/${postId}`);

  // Fetch post
  useEffect(() => {
    if (!postId) return;
    const p = fetchPostById(postId, user?.id);
    setPost(p);
    if (p) {
      setLiked(Boolean((p.metadata as { liked_by_me?: boolean }).liked_by_me));
      setSaved(Boolean((p.metadata as { saved_by_me?: boolean }).saved_by_me));
      setLikeCount(p.likes_count);
      setSaveCount(p.saves_count);
      incrementPostViews(postId);
    }
    setLoading(false);
  }, [postId, user?.id]);

  const handleLike = useCallback(() => {
    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }
    const isLiking = togglePostLike(postId, user.id);
    setLiked(isLiking);
    setLikeCount((c) => Math.max(0, c + (isLiking ? 1 : -1)));
  }, [postId, user]);

  const handleSave = useCallback(() => {
    if (!user) {
      toast.error("Sign in to save posts");
      return;
    }
    const isSaving = togglePostSave(postId, user.id);
    setSaved(isSaving);
    setSaveCount((c) => Math.max(0, c + (isSaving ? 1 : -1)));
    toast.success(isSaving ? "Post saved" : "Post removed");
  }, [postId, user]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: post?.company_name ?? "OXEN Post", url }).catch(() => void 0);
    } else {
      void navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
    incrementPostShare(postId);
  }, [postId, post]);

  const handleBack = useCallback(() => {
    saveExploreScroll(`/explore/post/${postId}`);
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/explore");
    }
  }, [navigate, postId]);

  const media = post?.media ?? [];
  const currentMedia = media[mediaIndex];

  const nextMedia = useCallback(() => {
    setMediaIndex((i) => (i + 1) % media.length);
  }, [media.length]);

  const prevMedia = useCallback(() => {
    setMediaIndex((i) => (i - 1 + media.length) % media.length);
  }, [media.length]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="oxen-skeleton-globe" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="font-display text-xl font-bold text-foreground">Post not found</p>
        <p className="mt-2 text-sm text-muted-foreground">This post may have been deleted.</p>
        <ExploreBackButton className="mt-5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-20 sm:px-5 sm:pt-6">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={springIn}
        whileTap={{ scale: 0.94 }}
        onClick={handleBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur-xl transition hover:bg-white/[0.1]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
        Back
      </motion.button>

      {/* Post card */}
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="glass overflow-hidden rounded-3xl"
      >
        {/* Company header */}
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => navigate(`/consulting/company/${post.consulting_company_id}`)}
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15"
          >
            {post.company_logo ? (
              <img
                src={post.company_logo}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-primary">
                {post.company_name.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => navigate(`/consulting/company/${post.consulting_company_id}`)}
              className="block truncate text-left text-sm font-bold text-foreground transition hover:opacity-80"
            >
              {post.company_name}
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatFullDate(post.created_at)}
            </div>
          </div>
        </div>

        {/* Media gallery */}
        {media.length > 0 && (
          <div className="relative aspect-square overflow-hidden bg-black/20 sm:aspect-[4/3]">
            <AnimatePresence mode="wait">
              <motion.div
                key={mediaIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full"
              >
                {currentMedia.type === "image" ? (
                  <img
                    src={currentMedia.url}
                    alt=""
                    className="h-full w-full cursor-zoom-in object-cover"
                    onClick={() => setLightboxOpen(true)}
                    loading="lazy"
                  />
                ) : (
                  <div className="relative h-full w-full">
                    <video
                      src={currentMedia.url}
                      poster={currentMedia.poster ?? undefined}
                      controls
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Gallery nav */}
            {media.length > 1 && (
              <>
                <button
                  onClick={prevMedia}
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextMedia}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {media.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === mediaIndex ? "w-4 bg-white" : "w-1.5 bg-white/50",
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center gap-1 px-4 py-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition",
              liked ? "text-rose-400" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Like"
          >
            <Heart className={cn("h-5 w-5", liked && "fill-current")} />
          </motion.button>
          <span className="min-w-[2ch] text-xs font-semibold text-muted-foreground">
            {likeCount}
          </span>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSave}
            className={cn(
              "ml-2 flex h-10 w-10 items-center justify-center rounded-full transition",
              saved ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Save"
          >
            <Bookmark className={cn("h-5 w-5", saved && "fill-current")} />
          </motion.button>
          <span className="min-w-[2ch] text-xs font-semibold text-muted-foreground">
            {saveCount}
          </span>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </motion.button>

          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            {post.views_count + 1} views
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {post.content}
          </p>

          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="mt-4 text-[11px] text-muted-foreground">{formatRelative(post.created_at)}</p>
        </div>
      </motion.article>

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {lightboxOpen && currentMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={currentMedia.url}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {media.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevMedia();
                  }}
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextMedia();
                  }}
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
