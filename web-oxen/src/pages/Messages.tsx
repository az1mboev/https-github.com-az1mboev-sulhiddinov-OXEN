import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Search, Check, CheckCheck, Camera,
  Image as ImageIcon, Video, Smile, MoreVertical, Trash2, X,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useChat, type ChatMessage, CHAT_CURRENT_USER_ID } from "@/contexts/ChatContext";
import { DEMO_USERS, getUserById } from "@/data/demoUsers";
import { useTravel } from "@/contexts/TravelContext";
import { cn } from "@/lib/utils";

const EMOJIS = ["😀", "😂", "😍", "🥰", "😎", "🤔", "😢", "😡", "👍", "👎", "❤️", "🔥", "✨", "🎉", "🚀", "🌍", "✈️", "🏝️", "📸", "🙌"];

/* ── Time format helpers ── */

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/* ── Message bubble ── */

interface MessageBubbleProps {
  msg: ChatMessage;
  isMe: boolean;
  index: number;
  onDelete: (messageId: string, forEveryone: boolean) => void;
}

function MessageBubble({ msg, isMe, index, onDelete }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isDeleted = msg.content === "" && msg.type === "text";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), type: "spring" as const, stiffness: 400, damping: 28 }}
      className={cn("flex", isMe ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[78%]", isMe ? "items-end" : "items-start")}>
        <div className={cn("relative px-4 py-2.5", isMe ? "chat-bubble-sent" : "chat-bubble-received")}>
          {msg.type === "image" ? (
            <img src={msg.content} alt="Shared" className="rounded-lg max-w-full max-h-60 object-cover" />
          ) : msg.type === "video" ? (
            <video src={msg.content} controls className="rounded-lg max-w-full max-h-60" />
          ) : isDeleted ? (
            <p className="text-sm italic opacity-50">Message deleted</p>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
          )}

          {/* Delete menu for own messages */}
          {isMe && !isDeleted && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-white/50 backdrop-blur-sm transition hover:text-white"
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -4 }}
                      className="absolute right-0 top-5 z-20 flex flex-col gap-0.5 rounded-xl border border-white/10 bg-[#1a1d28]/95 p-1 shadow-2xl backdrop-blur-xl"
                    >
                      <button
                        onClick={() => { onDelete(msg.id, false); setShowMenu(false); }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 whitespace-nowrap"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete for me
                      </button>
                      <button
                        onClick={() => { onDelete(msg.id, true); setShowMenu(false); }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/15 whitespace-nowrap"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete for everyone
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        <div className={cn("flex items-center gap-1 mt-1 px-1", isMe ? "justify-end" : "justify-start")}>
          <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
          {isMe && (
            <span className="text-muted-foreground">
              {msg.status === "sending" ? (
                <span className="text-[10px] text-white/30">Sending…</span>
              ) : msg.status === "read" ? (
                <CheckCheck className="h-3 w-3 text-blue-400" />
              ) : msg.status === "delivered" ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Messages page ── */

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations, getConversation, sendMessage, deleteMessage, markAsRead } = useChat();
  const { profilePhoto } = useTravel();

  const activeUserId = searchParams.get("user");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [showEmoji, setShowEmoji] = useState<boolean>(false);
  const [showAttach, setShowAttach] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeUser = activeUserId ? getUserById(activeUserId) : null;
  const activeConversation = activeUserId ? getConversation(activeUserId) : null;

  // Build conversation list with demo users — show ALL users, not just those with conversations
  const conversationList = DEMO_USERS
    .filter((u) => u.id !== CHAT_CURRENT_USER_ID)
    .map((user) => {
      const conv = conversations.find((c) => c.participantIds.includes(user.id));
      return { user, conversation: conv ?? null };
    })
    .sort((a, b) => {
      const aTs = a.conversation?.lastMessage?.createdAt ?? 0;
      const bTs = b.conversation?.lastMessage?.createdAt ?? 0;
      return bTs - aTs;
    })
    .filter((item) =>
      !searchQuery ||
      item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.conversation?.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase())),
    );

  // Mark conversation as read when opened
  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation.id);
    }
  }, [activeConversation, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current && activeConversation) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [activeConversation?.messages.length]);

  const handleSend = useCallback(() => {
    if (!messageText.trim() || !activeUserId) return;
    sendMessage(activeUserId, "text", messageText.trim());
    setMessageText("");
    setShowEmoji(false);
  }, [messageText, activeUserId, sendMessage]);

  const handleEmoji = useCallback((emoji: string) => {
    setMessageText((prev) => prev + emoji);
  }, []);

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUserId) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;

    const reader = new FileReader();
    reader.onload = () => {
      sendMessage(activeUserId, isImage ? "image" : "video", reader.result as string);
    };
    reader.readAsDataURL(file);
    setShowAttach(false);
    e.target.value = "";
  }, [activeUserId, sendMessage]);

  const handleDeleteMessage = useCallback((messageId: string, forEveryone: boolean) => {
    if (!activeConversation) return;
    deleteMessage(activeConversation.id, messageId, forEveryone);
  }, [activeConversation, deleteMessage]);

  /* ── Chat view (full screen for all sizes) ── */
  // FIX: Show chat view even if conversation doesn't exist yet — just need activeUser
  if (activeUser) {
    const messages = activeConversation?.messages ?? [];
    let lastDateDivider = "";

    return createPortal(
      <div className="fixed inset-0 z-[70] flex flex-col bg-background">
        {/* Chat header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="chat-input-area flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0"
        >
          <button
            onClick={() => setSearchParams({})}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative shrink-0">
            {activeUser.avatarUrl ? (
              <img src={activeUser.avatarUrl} alt={activeUser.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/30 text-sm font-bold">
                {activeUser.name.charAt(0)}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{activeUser.name}</p>
            <p className="text-xs text-emerald-400">Active now</p>
          </div>
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12]">
            <MoreVertical className="h-5 w-5" />
          </button>
        </motion.div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 overscroll-contain">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Send className="h-7 w-7 text-white/20" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Say hello to {activeUser.name}!</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Start a conversation by sending a message below.</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.senderId === CHAT_CURRENT_USER_ID;
            const dateDivider = formatDateDivider(msg.createdAt);
            const showDivider = dateDivider !== lastDateDivider;
            lastDateDivider = dateDivider;

            return (
              <div key={msg.id}>
                {showDivider && (
                  <div className="flex justify-center my-4">
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {dateDivider}
                    </span>
                  </div>
                )}
                <MessageBubble msg={msg} isMe={isMe} index={i} onDelete={handleDeleteMessage} />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji panel */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="chat-input-area px-4 py-3 shrink-0"
            >
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmoji(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition hover:bg-white/[0.08] active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attach panel */}
        <AnimatePresence>
          {showAttach && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="chat-input-area px-4 py-3 shrink-0"
            >
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] px-5 py-3 transition hover:bg-white/[0.1] active:scale-95"
                >
                  <ImageIcon className="h-6 w-6 text-blue-400" />
                  <span className="text-xs font-medium">Photo</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] px-5 py-3 transition hover:bg-white/[0.1] active:scale-95"
                >
                  <Video className="h-6 w-6 text-purple-400" />
                  <span className="text-xs font-medium">Video</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] px-5 py-3 transition hover:bg-white/[0.1] active:scale-95"
                >
                  <Camera className="h-6 w-6 text-rose-400" />
                  <span className="text-xs font-medium">Camera</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area — safe area aware */}
        <div className="chat-input-area px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          <div className="flex items-end gap-2">
            <button
              onClick={() => { setShowAttach((v) => !v); setShowEmoji(false); }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] active:scale-90"
            >
              <Camera className="h-5 w-5" />
            </button>
            <div className="flex-1 flex items-end gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2 min-w-0">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Message..."
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none max-h-24 min-w-0"
                style={{ minHeight: "24px" }}
              />
              <button
                onClick={() => { setShowEmoji((v) => !v); setShowAttach(false); }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground active:scale-90"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleSend}
              disabled={!messageText.trim()}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
                messageText.trim()
                  ? "gold-gradient text-primary-foreground shadow-lg"
                  : "bg-white/[0.06] text-muted-foreground",
              )}
            >
              <Send className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  /* ── Conversation list view ── */

  return (
    <div className="relative mx-auto max-w-2xl px-4 pt-2 pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 pt-2 pb-4"
      >
        <button
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold truncate">Messages</h1>
          <p className="text-xs text-muted-foreground truncate">Direct messages with travelers</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative mb-4"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] py-3 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:bg-white/[0.06] transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </motion.div>

      {/* Conversation list */}
      <div className="space-y-2">
        {conversationList.map((item, i) => {
          const lastMsg = item.conversation?.lastMessage;
          const unread = item.conversation?.unreadCount ?? 0;

          return (
            <motion.button
              key={item.user.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, type: "spring" as const, stiffness: 300, damping: 26 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSearchParams({ user: item.user.id })}
              className="glass flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all hover:border-white/[0.12]"
            >
              <div className="relative shrink-0">
                {item.user.avatarUrl ? (
                  <img src={item.user.avatarUrl} alt={item.user.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/30 text-lg font-bold">
                    {item.user.name.charAt(0)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-background" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold truncate">{item.user.name}</p>
                  {lastMsg && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(lastMsg.createdAt)}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {lastMsg
                    ? lastMsg.type === "image"
                      ? "📷 Photo"
                      : lastMsg.type === "video"
                        ? "🎥 Video"
                        : lastMsg.content || "Message deleted"
                    : `Tap to start chatting with ${item.user.name.split(" ")[0]}`}
                </p>
              </div>
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                  {unread}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {conversationList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">No conversations found</p>
        </div>
      )}
    </div>
  );
}
