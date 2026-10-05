import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { UIMessage } from "ai";
import {
  onAuthState,
  saveChatToFirestore,
  deleteChatFromFirestore,
  subscribeUserChats,
  getUserChatsFromFirestore,
  type AuthUserProfile,
} from "@/lib/firebase";

export const CHATS_STORAGE_KEY = "quench-ai-chats-v1";
export const ACTIVE_CHAT_STORAGE_KEY = "quench-ai-active-chat";

export interface StoredChat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
}

export interface RagMemorySnippet {
  chatId: string;
  chatTitle: string;
  role: "user" | "assistant";
  text: string;
  turnIndex: number;
  score: number;
}

export interface ChatHistoryContextValue {
  chats: StoredChat[];
  activeChatId: string | null;
  activeChat: StoredChat | null;
  authUser: AuthUserProfile | null;
  authInitialized: boolean;
  setActiveChatId: (id: string | null) => void;
  createChat: (title?: string) => string;
  updateChat: (id: string, updates: Partial<StoredChat>) => void;
  saveChatMessages: (chatId: string, messages: UIMessage[], title?: string) => void;
  deleteChat: (id: string) => void;
  clearAllChats: () => void;
  searchPreviousChatMemories: (
    query: string,
    options?: {
      excludeChatId?: string | null;
      currentChatId?: string | null;
      currentMessages?: UIMessage[];
      topK?: number;
    },
  ) => RagMemorySnippet[];
  buildCrossReferenceContext: (
    query: string,
    currentChatId?: string | null,
    currentMessages?: UIMessage[],
  ) => string;
  getOtherChatsForServerRag: (
    excludeChatId?: string | null,
    limit?: number,
  ) => Array<{ id: string; title: string; messages: Array<{ role: string; text: string }> }>;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

function extractMessageText(message: UIMessage): string {
  if (!message || !message.parts) return "";
  return message.parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

/**
 * Common stopwords to filter out from conversational search queries
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "should",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "me",
  "him",
  "us",
  "them",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "so",
  "than",
  "too",
  "very",
  "just",
  "tell",
  "said",
  "say",
  "saying",
  "told",
  "ask",
  "asked",
  "earlier",
  "before",
  "previous",
  "chat",
  "remember",
  "recall",
  "mention",
  "mentioned",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const chatsRef = useRef<StoredChat[]>([]);
  chatsRef.current = chats;

  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  const hasLoadedStorageRef = useRef(false);

  // 1. Initial Load from Local Storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHATS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredChat[];
        if (Array.isArray(parsed)) {
          setChats(parsed);
          chatsRef.current = parsed;
        }
      }
    } catch (e) {
      console.warn("[ChatHistory] Failed to load local chats:", e);
    } finally {
      hasLoadedStorageRef.current = true;
    }
  }, []);

  // 2. Persist Chats to Local Storage
  useEffect(() => {
    if (!hasLoadedStorageRef.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    } catch (e) {
      console.warn("[ChatHistory] Failed to persist local chats:", e);
    }
  }, [chats]);

  // 3. Listen to Firebase Auth & Subscribe to User Chats in Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthState((user) => {
      setAuthUser(user);
      setAuthInitialized(true);

      if (user) {
        // Load initial from Firestore
        void getUserChatsFromFirestore(user.uid).then((cloudChats) => {
          if (cloudChats && cloudChats.length > 0) {
            setChats((current) => {
              const currentMap = new Map(current.map((c) => [c.id, c]));
              cloudChats.forEach((cc) => {
                const existing = currentMap.get(cc.id);
                if (!existing || new Date(cc.updatedAt) > new Date(existing.updatedAt)) {
                  currentMap.set(cc.id, cc);
                }
              });
              return Array.from(currentMap.values()).sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
              );
            });
          }
        });

        // Realtime sync
        const unsubscribeFirestore = subscribeUserChats(user.uid, (cloudChats) => {
          if (cloudChats && cloudChats.length > 0) {
            setChats((current) => {
              const currentMap = new Map(current.map((c) => [c.id, c]));
              cloudChats.forEach((cc) => {
                currentMap.set(cc.id, cc);
              });
              return Array.from(currentMap.values()).sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
              );
            });
          }
        });

        return () => {
          unsubscribeFirestore();
        };
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const setActiveChatId = useCallback((id: string | null) => {
    setActiveChatIdState(id);
    activeChatIdRef.current = id;
    if (typeof window !== "undefined") {
      if (id) {
        window.localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, id);
      } else {
        window.localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
      }
    }
  }, []);

  const createChat = useCallback(
    (initialTitle?: string): string => {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `chat-${Date.now()}`;
      const now = new Date().toISOString();
      const title = (initialTitle && initialTitle.trim()) || "New conversation";

      const newChat: StoredChat = {
        id,
        title: title.length > 50 ? `${title.slice(0, 50).trim()}…` : title,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };

      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(id);
      return id;
    },
    [setActiveChatId],
  );

  const updateChat = useCallback((id: string, updates: Partial<StoredChat>) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
      ),
    );
  }, []);

  const saveChatMessages = useCallback(
    (chatId: string, messages: UIMessage[], customTitle?: string) => {
      const now = new Date().toISOString();
      setChats((prev) => {
        const existing = prev.find((c) => c.id === chatId);
        if (existing) {
          const updatedTitle = customTitle || existing.title;
          return prev.map((c) =>
            c.id === chatId ? { ...c, messages, title: updatedTitle, updatedAt: now } : c,
          );
        } else {
          const fallbackTitle = customTitle || "Conversation";
          return [
            {
              id: chatId,
              title: fallbackTitle,
              createdAt: now,
              updatedAt: now,
              messages,
            },
            ...prev,
          ];
        }
      });

      if (authUser?.uid) {
        const titleToPersist =
          customTitle || chatsRef.current.find((c) => c.id === chatId)?.title || "Conversation";
        void saveChatToFirestore(chatId, authUser.uid, titleToPersist, messages);
      }
    },
    [authUser?.uid],
  );

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatIdRef.current === id) {
        setActiveChatId(null);
      }
      if (authUser?.uid) {
        void deleteChatFromFirestore(id, authUser.uid);
      }
    },
    [authUser?.uid, setActiveChatId],
  );

  const clearAllChats = useCallback(() => {
    setChats([]);
    setActiveChatId(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CHATS_STORAGE_KEY);
      window.localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
    }
  }, [setActiveChatId]);

  /**
   * Search previous user messages & chat history across all stored conversations.
   * Enables local RAG cross-referencing before generating responses.
   */
  const searchPreviousChatMemories = useCallback(
    (
      query: string,
      options?: {
        excludeChatId?: string | null;
        currentChatId?: string | null;
        currentMessages?: UIMessage[];
        topK?: number;
      },
    ): RagMemorySnippet[] => {
      if (!query || query.trim().length < 2) return [];

      const currentChatId = options?.currentChatId ?? activeChatIdRef.current;
      const topK = options?.topK ?? 4;
      const queryTokens = tokenize(query);
      const isRecall =
        /\b(what did i (?:say|tell you|ask|send|mention|write|create)|did i (?:say|tell you|ask|send|mention)|search (?:my |the |our )?chat|search what i(?:'ve| have)? sent|recall|remember|earlier|before|previous chat|repeat what i said)\b/i.test(
          query,
        );

      const queryTokenSet = new Set(queryTokens);
      const candidates: RagMemorySnippet[] = [];

      // 1. Search current active chat messages if provided
      if (Array.isArray(options?.currentMessages) && options.currentMessages.length > 0) {
        const activeTitle =
          chatsRef.current.find((c) => c.id === currentChatId)?.title || "Current Chat";
        options.currentMessages.forEach((msg, idx) => {
          const text = extractMessageText(msg);
          if (!text || text.length < 3) return;

          const msgTokens = tokenize(text);
          let matches = 0;
          for (const token of msgTokens) {
            if (queryTokenSet.has(token)) {
              matches++;
            }
          }

          const roleBonus = msg.role === "user" ? 2.0 : 1.0;
          if (matches > 0) {
            const score = (matches / Math.sqrt(msgTokens.length + 1)) * roleBonus;
            candidates.push({
              chatId: currentChatId || "current",
              chatTitle: activeTitle,
              role: msg.role as "user" | "assistant",
              text,
              turnIndex: idx + 1,
              score,
            });
          } else if (isRecall && msg.role === "user") {
            // General recall intent: prioritize past user messages in current chat
            candidates.push({
              chatId: currentChatId || "current",
              chatTitle: activeTitle,
              role: "user",
              text,
              turnIndex: idx + 1,
              score: 0.8 + idx * 0.05,
            });
          }
        });
      }

      // 2. Search across all stored conversations in local history
      for (const chat of chatsRef.current) {
        // If currentMessages was already searched for this chat, skip duplicate scanning
        if (options?.currentMessages && chat.id === currentChatId) continue;

        chat.messages.forEach((msg, idx) => {
          const text = extractMessageText(msg);
          if (!text || text.length < 3) return;

          const msgTokens = tokenize(text);
          let matches = 0;
          for (const token of msgTokens) {
            if (queryTokenSet.has(token)) {
              matches++;
            }
          }

          const roleBonus = msg.role === "user" ? 2.0 : 1.0;
          if (matches > 0) {
            const score = (matches / Math.sqrt(msgTokens.length + 1)) * roleBonus;
            candidates.push({
              chatId: chat.id,
              chatTitle: chat.title,
              role: msg.role as "user" | "assistant",
              text,
              turnIndex: idx + 1,
              score,
            });
          } else if (isRecall && msg.role === "user" && candidates.length < topK) {
            candidates.push({
              chatId: chat.id,
              chatTitle: chat.title,
              role: "user",
              text,
              turnIndex: idx + 1,
              score: 0.5,
            });
          }
        });
      }

      return candidates.sort((a, b) => b.score - a.score).slice(0, topK);
    },
    [],
  );

  /**
   * Builds an explicit cross-reference context block ready to be attached to queries.
   */
  const buildCrossReferenceContext = useCallback(
    (query: string, currentChatId?: string | null, currentMessages?: UIMessage[]): string => {
      const matches = searchPreviousChatMemories(query, {
        currentChatId,
        currentMessages,
        topK: 4,
      });
      if (matches.length === 0) return "";

      const lines = [
        "==================================================",
        "LOCAL CROSS-REFERENCED CHAT MEMORY (RAG CONTEXT)",
        "==================================================",
        "The user has previously stated or discussed the following in chat history:",
        ...matches.map((m, i) => {
          const roleLabel =
            m.role === "user" ? "User previously sent" : "Assistant previously answered";
          return `\n[Reference ${i + 1}] — Chat "${m.chatTitle}" (Turn #${m.turnIndex}):\n${roleLabel}: "${m.text}"`;
        }),
        "\nINSTRUCTIONS: If the user asks about something they previously said or asked, reference these matching facts directly and answer accurately.",
        "==================================================",
      ];

      return lines.join("\n");
    },
    [searchPreviousChatMemories],
  );

  /**
   * Formats other stored chats into the payload format expected by the server RAG engine.
   */
  const getOtherChatsForServerRag = useCallback((excludeChatId?: string | null, limit = 8) => {
    const activeId = excludeChatId ?? activeChatIdRef.current;
    return chatsRef.current
      .filter((c) => c.id !== activeId && c.messages.length > 0)
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        title: c.title,
        messages: c.messages.slice(-8).map((m) => ({
          role: m.role,
          text: extractMessageText(m),
        })),
      }));
  }, []);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) || null;
  }, [chats, activeChatId]);

  const value = useMemo<ChatHistoryContextValue>(
    () => ({
      chats,
      activeChatId,
      activeChat,
      authUser,
      authInitialized,
      setActiveChatId,
      createChat,
      updateChat,
      saveChatMessages,
      deleteChat,
      clearAllChats,
      searchPreviousChatMemories,
      buildCrossReferenceContext,
      getOtherChatsForServerRag,
    }),
    [
      chats,
      activeChatId,
      activeChat,
      authUser,
      authInitialized,
      setActiveChatId,
      createChat,
      updateChat,
      saveChatMessages,
      deleteChat,
      clearAllChats,
      searchPreviousChatMemories,
      buildCrossReferenceContext,
      getOtherChatsForServerRag,
    ],
  );

  return <ChatHistoryContext.Provider value={value}>{children}</ChatHistoryContext.Provider>;
}

export function useChatHistory(): ChatHistoryContextValue {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return ctx;
}
