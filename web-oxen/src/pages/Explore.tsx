import { AnimatePresence, motion } from "framer-motion";
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Sparkles,
  LayoutDashboard,
  Heart,
  Bookmark,
  Share2,
  Play,
  Clock,
  Plus,
  CreditCard,
  Newspaper,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { CONSULTING_OPEN_PREVIEW_MODE } from "@/lib/consulting-preview";
import {
  fetchExplorePosts,
  togglePostLike,
  togglePostSave,
  incrementPostShare,
  type ConsultingPost,
} from "@/lib/consulting-posts";
import { cn } from "@/lib/utils";

// Lazy-load the post creator modal so it doesn't bloat the Explore bundle
const ConsultingPostCreator = lazy(() => import("@/components/ConsultingPostCreator"));

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
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

type Tab = "feed" | "finance";

/* ── Post Card (memoized) ────────────────────────────────────── */

interface PostCardProps {
  post: ConsultingPost;
  userId: string | undefined;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onShare: (postId: string) => void;
  onOpen: (postId: string) => void;
}

function PostCardInner({ post, userId, onLike, onSave, onShare, onOpen }: PostCardProps) {
  const liked = Boolean((post.metadata as { liked_by_me?: boolean }).liked_by_me);
  const saved = Boolean((post.metadata as { saved_by_me?: boolean }).saved_by_me);
  const firstMedia = post.media[0];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springIn}
      className="glass overflow-hidden rounded-3xl"
    >
      {/* Company header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
          {post.company_logo ? (
            <img src={post.company_logo} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-primary">
              {post.company_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{post.company_name}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelative(post.created_at)}
          </div>
        </div>
      </div>

      {/* Media — single thumbnail, tap to open full post */}
      {firstMedia && (
        <button
          onClick={() => onOpen(post.id)}
          className="relative block aspect-[4/3] w-full overflow-hidden bg-black/20"
        >
          {firstMedia.type === "image" ? (
            <img
              src={firstMedia.url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
            />
          ) : (
            <>
              <video
                src={firstMedia.url}
                poster={firstMedia.poster ?? undefined}
                preload="metadata"
                className="h-full w-full object-cover"
                muted
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white" />
                </span>
              </span>
            </>
          )}
          {post.media.length > 1 && (
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              +{post.media.length - 1}
            </span>
          )}
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2.5">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onLike(post.id)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition",
            liked ? "text-rose-400" : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Like"
        >
          <Heart className={cn("h-[18px] w-[18px]", liked && "fill-current")} />
        </motion.button>
        <span className="min-w-[2ch] text-[11px] font-semibold text-muted-foreground">
          {post.likes_count}
        </span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onSave(post.id)}
          className={cn(
            "ml-1 flex h-9 w-9 items-center justify-center rounded-full transition",
            saved ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Save"
        >
          <Bookmark className={cn("h-[18px] w-[18px]", saved && "fill-current")} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onShare(post.id)}
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
          aria-label="Share"
        >
          <Share2 className="h-[18px] w-[18px]" />
        </motion.button>

        <button
          onClick={() => onOpen(post.id)}
          className="ml-auto rounded-full bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-white/[0.08]"
        >
          View
        </button>
      </div>

      {/* Content preview */}
      <button onClick={() => onOpen(post.id)} className="block w-full px-4 pb-4 text-left">
        <p className="line-clamp-3 text-sm leading-relaxed text-foreground">{post.content}</p>
        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </button>
    </motion.article>
  );
}

const PostCard = React.memo(PostCardInner);

/* ── Lazy feed section ───────────────────────────────────────── */

function LazySection({
  children,
  className,
  minHeight = 200,
}: {
  children: React.ReactNode;
  className?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : null}
    </div>
  );
}

/* ── Main Explore Page ───────────────────────────────────────── */

export default function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMember, hasActiveSubscription, hasExpiredSubscription, company } = useConsulting();
  const [tab, setTab] = useState<Tab>("feed");
  const [posts, setPosts] = useState<ConsultingPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [postsLimit, setPostsLimit] = useState(8);

  useSEO({
    title: "Premium Consulting | OXEN",
    description:
      "Grow your consulting business with OXEN. Discover consulting companies, posts, and subscribe to Premium Consulting.",
  });

  // Fetch posts
  const loadPosts = useCallback(() => {
    setLoadingPosts(true);
    const data = fetchExplorePosts({ userId: user?.id });
    setPosts(data);
    setLoadingPosts(false);
  }, [user?.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleBuy = useCallback(() => {
    const target = CONSULTING_OPEN_PREVIEW_MODE ? "/consulting/dashboard" : "/consulting/checkout";
    if (user?.isGuest) {
      navigate(`/auth?redirect=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  }, [user, navigate]);

  const showGoToDashboard = isMember && (hasActiveSubscription || hasExpiredSubscription);

  // Post actions
  const handleLike = useCallback(
    (postId: string) => {
      if (!user) {
        toast.error("Sign in to like posts");
        return;
      }
      togglePostLike(postId, user.id);
      loadPosts();
    },
    [user, loadPosts],
  );

  const handleSave = useCallback(
    (postId: string) => {
      if (!user) {
        toast.error("Sign in to save posts");
        return;
      }
      const isSaving = togglePostSave(postId, user.id);
      toast.success(isSaving ? "Post saved" : "Post removed");
      loadPosts();
    },
    [user, loadPosts],
  );

  const handleShare = useCallback(
    (postId: string) => {
      const url = `${window.location.origin}/explore/post/${postId}`;
      if (navigator.share) {
        void navigator.share({ title: "OXEN Consulting Post", url }).catch(() => void 0);
      } else {
        void navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
      incrementPostShare(postId);
    },
    [],
  );

  const handleOpenPost = useCallback(
    (postId: string) => {
      navigate(`/explore/post/${postId}`);
    },
    [navigate],
  );

  const handleOpenFinance = useCallback(() => {
    navigate("/explore/finance");
  }, [navigate]);

  const visiblePosts = useMemo(() => posts.slice(0, postsLimit), [posts, postsLimit]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-20 sm:px-5">
      {/* Hero — preserved from original */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={springIn}>
        <div className="mb-4 flex items-center justify-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Premium Consulting
          </span>
        </div>
        <h1 className="text-center font-display text-2xl font-extrabold leading-tight sm:text-4xl">
          Grow Your Consulting Business
          <br />
          <span className="text-gold-gradient">with OXEN</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          Create a consulting company profile, publish posts and service packages, manage clients and
          employees, and track your revenue — all in one premium workspace.
        </p>

        {/* Primary CTA — preserved logic */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.15 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          {showGoToDashboard ? (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/consulting/dashboard")}
                className="gold-gradient inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25"
              >
                <LayoutDashboard className="h-5 w-5" />
                Go to Consulting Dashboard
              </motion.button>
              {hasExpiredSubscription && (
                <p className="text-xs font-semibold text-amber-400">
                  Your subscription has expired —{" "}
                  <button
                    onClick={() => navigate("/consulting/renew")}
                    className="underline hover:opacity-80"
                  >
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
              className="gold-gradient inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25"
            >
              <Sparkles className="h-5 w-5" />
              Buy Premium Consulting
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* Tab switcher */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.25 }}
        className="mt-8 flex items-center gap-2 rounded-full bg-white/[0.04] p-1 backdrop-blur-xl"
      >
        <button
          onClick={() => setTab("feed")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition",
            tab === "feed"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Newspaper className="h-3.5 w-3.5" />
          Posts
        </button>
        <button
          onClick={() => setTab("finance")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition",
            tab === "finance"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Finance
        </button>
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === "feed" && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={springIn}
            className="mt-6"
          >
            {/* Create post button (for consulting members) */}
            {isMember && hasActiveSubscription && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setCreatorOpen(true)}
                className="glass mb-4 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:bg-white/[0.05]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Plus className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Create Post</p>
                  <p className="text-[11px] text-muted-foreground">
                    Share an update with your audience
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            )}

            {/* Posts feed */}
            {loadingPosts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="glass flex flex-col items-center justify-center rounded-3xl py-16 text-center">
                <Newspaper className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-display text-sm font-bold text-foreground">No posts yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Consulting companies will share updates, tips, and announcements here.
                </p>
                {isMember && hasActiveSubscription && (
                  <button
                    onClick={() => setCreatorOpen(true)}
                    className="gold-gradient mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-primary-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create First Post
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {visiblePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    userId={user?.id}
                    onLike={handleLike}
                    onSave={handleSave}
                    onShare={handleShare}
                    onOpen={handleOpenPost}
                  />
                ))}
                {posts.length > postsLimit && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setPostsLimit((p) => p + 8)}
                      className="glass-button rounded-full px-6 py-3 text-xs font-semibold text-foreground transition active:scale-95"
                    >
                      Load More Posts
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === "finance" && (
          <motion.div
            key="finance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={springIn}
            className="mt-6"
          >
            {/* Finance preview card */}
            <div className="glass rounded-3xl p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">Finance & Billing</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Subscription, payments, and invoices
                  </p>
                </div>
              </div>

              {company ? (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/[0.02] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Company
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-foreground">
                        {company.name}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.02] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Status
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-sm font-bold",
                          hasActiveSubscription
                            ? "text-emerald-400"
                            : hasExpiredSubscription
                              ? "text-amber-400"
                              : "text-muted-foreground",
                        )}
                      >
                        {hasActiveSubscription
                          ? "Active"
                          : hasExpiredSubscription
                            ? "Expired"
                            : "None"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenFinance}
                    className="glass-button flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                  >
                    <CreditCard className="h-4 w-4" />
                    Open Finance Dashboard
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Subscribe to Premium Consulting to access your finance dashboard with subscription
                    management, payment history, and downloadable invoices.
                  </p>
                  <button
                    onClick={handleBuy}
                    className="gold-gradient flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/25 transition active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4" />
                    {showGoToDashboard ? "Go to Dashboard" : "Buy Premium Consulting"}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post creator modal (lazy) */}
      <AnimatePresence>
        {creatorOpen && (
          <Suspense fallback={null}>
            <ConsultingPostCreator
              open={creatorOpen}
              onClose={() => setCreatorOpen(false)}
              onCreated={loadPosts}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
