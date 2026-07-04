import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Data models                                                        */
/* ------------------------------------------------------------------ */

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: "text" | "image" | "video";
  content: string;
  status: MessageStatus;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participantIds: [string, string];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  messages: ChatMessage[];
}

/* ------------------------------------------------------------------ */
/*  Context shape                                                      */
/* ------------------------------------------------------------------ */

interface ChatContextValue {
  conversations: Conversation[];
  getConversation: (userId: string) => Conversation | null;
  sendMessage: (receiverId: string, type: ChatMessage["type"], content: string) => void;
  deleteMessage: (conversationId: string, messageId: string, forEveryone: boolean) => void;
  markAsRead: (conversationId: string) => void;
  searchConversations: (query: string) => Conversation[];
  totalUnread: number;
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const CHAT_KEY = "oxen.chat.conversations";

const ChatContext = createContext<ChatContextValue | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function convId(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export const CHAT_CURRENT_USER_ID = "guest-explorer";

/* ------------------------------------------------------------------ */
/*  Demo auto-reply messages (simulated real-time)                     */
/* ------------------------------------------------------------------ */

const AUTO_REPLIES: Record<string, string[]> = {
  "u-sara": ["That sounds amazing! 🌍", "I'd love to go there someday ✨", "Great recommendation! 🙌", "Saving this to my bucket list! 📌"],
  "u-max": ["Nice! I was there last year 📸", "The food is incredible 🍜", "Definitely add it to your itinerary ✈️", "Send me the details when you can! 👍"],
  "u-dani": "Ciao! 🇮🇹 That place is magical!".split(" ").length > 0 ? ["Ciao! 🇮🇹 That place is magical!", "The sunsets there are unreal 🌅", "You have to try the local food! 🍝", "Adding to my list right now ❤️"] : [],
  "u-kenji": ["Konnichiwa! 🇯🇵 Great choice!", "The temples are breathtaking 🏯", "Let me know if you need tips!", "Safe travels! 🙏"],
  "u-ana": ["The mountains there are stunning 🏔️", "I was there last winter — incredible!", "Add it to your travel board! 📌", "Swiss precision at its best ⌚"],
  "u-joe": ["The wildlife there is unmatched! 🦁", "Safari season is the best time 📷", "I'll send you my photo gallery!", "Africa waits for you! 🌍"],
  "u-hopper": ["Island paradise! 🏝️", "The water clarity is insane! 🐠", "Booking my next trip there!", "Saltwater therapy 💙"],
};

function pickReply(userId: string): string {
  const replies = AUTO_REPLIES[userId];
  if (!replies || replies.length === 0) return "Thanks for the message! 🌍";
  return replies[Math.floor(Math.random() * replies.length)];
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const stored = load<Conversation[]>(CHAT_KEY, []);
    setConversations(stored);
  }, []);

  const persist = useCallback((next: Conversation[]) => {
    save(CHAT_KEY, next);
  }, []);

  const getConversation = useCallback(
    (userId: string): Conversation | null => {
      const id = convId(CHAT_CURRENT_USER_ID, userId);
      return conversations.find((c) => c.id === id) ?? null;
    },
    [conversations],
  );

  const updateConversation = useCallback(
    (convKey: string, updater: (c: Conversation) => Conversation) => {
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === convKey ? updater(c) : c));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const sendMessage = useCallback(
    (receiverId: string, type: ChatMessage["type"], content: string) => {
      const id = convId(CHAT_CURRENT_USER_ID, receiverId);
      const now = Date.now();
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId: id,
        senderId: CHAT_CURRENT_USER_ID,
        receiverId,
        type,
        content,
        status: "sending",
        createdAt: now,
      };

      setConversations((prev) => {
        const existing = prev.find((c) => c.id === id);
        if (existing) {
          const updated: Conversation = {
            ...existing,
            messages: [...existing.messages, msg],
            lastMessage: msg,
            unreadCount: 0,
          };
          const next = prev.map((c) => (c.id === id ? updated : c));
          persist(next);
          return next;
        }
        const conv: Conversation = {
          id,
          participantIds: [CHAT_CURRENT_USER_ID, receiverId],
          lastMessage: msg,
          unreadCount: 0,
          messages: [msg],
        };
        const next = [conv, ...prev];
        persist(next);
        return next;
      });

      // Simulate status transitions: sending → sent → delivered → read
      setTimeout(() => {
        updateConversation(id, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === msg.id ? { ...m, status: "sent" as MessageStatus } : m)),
        }));
      }, 300);

      setTimeout(() => {
        updateConversation(id, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === msg.id ? { ...m, status: "delivered" as MessageStatus } : m)),
        }));
      }, 900);

      setTimeout(() => {
        updateConversation(id, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === msg.id ? { ...m, status: "read" as MessageStatus } : m)),
        }));
      }, 2000);

      // Simulated auto-reply from the other user (real-time feel)
      setTimeout(() => {
        const replyText = pickReply(receiverId);
        const replyMsg: ChatMessage = {
          id: crypto.randomUUID(),
          conversationId: id,
          senderId: receiverId,
          receiverId: CHAT_CURRENT_USER_ID,
          type: "text",
          content: replyText,
          status: "delivered" as MessageStatus,
          createdAt: Date.now(),
        };
        updateConversation(id, (c) => ({
          ...c,
          messages: [...c.messages, replyMsg],
          lastMessage: replyMsg,
        }));
      }, 3200);
    },
    [persist, updateConversation],
  );

  const deleteMessage = useCallback(
    (conversationId: string, messageId: string, forEveryone: boolean) => {
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id !== conversationId) return c;
          let updatedMessages: ChatMessage[];
          if (forEveryone) {
            // Remove the message entirely
            updatedMessages = c.messages.filter((m) => m.id !== messageId);
          } else {
            // Mark as deleted for me (replace content with placeholder)
            updatedMessages = c.messages.map((m) =>
              m.id === messageId ? { ...m, content: "", status: "read" as MessageStatus, type: "text" } : m,
            );
          }
          const lastMessage = updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1] : null;
          return { ...c, messages: updatedMessages, lastMessage };
        });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const markAsRead = useCallback(
    (conversationId: string) => {
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                unreadCount: 0,
                messages: c.messages.map((m) =>
                  m.receiverId === CHAT_CURRENT_USER_ID ? { ...m, status: "read" as MessageStatus } : m,
                ),
              }
            : c,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const searchConversations = useCallback(
    (query: string): Conversation[] => {
      if (!query.trim()) return conversations;
      const q = query.toLowerCase();
      return conversations.filter((c) => {
        const otherId = c.participantIds.find((id) => id !== CHAT_CURRENT_USER_ID);
        if (!otherId) return false;
        return (
          otherId.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q)) ||
          c.lastMessage?.content.toLowerCase().includes(q)
        );
      });
    },
    [conversations],
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      getConversation,
      sendMessage,
      deleteMessage,
      markAsRead,
      searchConversations,
      totalUnread,
    }),
    [conversations, getConversation, sendMessage, deleteMessage, markAsRead, searchConversations, totalUnread],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
