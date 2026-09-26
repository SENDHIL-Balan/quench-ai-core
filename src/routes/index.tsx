import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock3, Trash2, X, Sparkles, FileText } from "lucide-react";
import { CosmicBackground } from "@/components/quench/CosmicBackground";
import { Sidebar } from "@/components/quench/Sidebar";
import { TopBar } from "@/components/quench/TopBar";
import { HeroSection } from "@/components/quench/HeroSection";
import { ModeSelector } from "@/components/quench/ModeSelector";
import { PromptComposer } from "@/components/quench/PromptComposer";
import { QuickActions } from "@/components/quench/QuickActions";
import { ChatView } from "@/components/quench/ChatView";
import { RightPanel } from "@/components/quench/RightPanel";
import type { AgentState } from "@/components/quench/AgentStatus";
import { AGENT_MODES, type ModeId } from "@/lib/agent/modes";
import { extractPdfTextFromFile, PdfExtractError } from "@/lib/attachments/pdf-client";
import { cn } from "@/lib/utils";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { unlockAudio } from "@/lib/voice/player";
import { VoiceAgentModal, type VoiceSetting } from "@/components/quench/VoiceAgentModal";
import { LiveVoiceAgentModal } from "@/components/quench/LiveVoiceAgentModal";
import { messageText } from "@/components/quench/ChatView";
import { ImageStudioModal } from "@/components/quench/ImageStudioModal";
import { PdfStudioModal } from "@/components/quench/PdfStudioModal";
import { AppLoadingScreen } from "@/components/quench/AppLoadingScreen";
import { type SupportedModelId, DEFAULT_MODEL_ID } from "@/components/quench/ModelSelector";

// Track if the initial splash animation has already run in this session
let hasBootedOnce = false;
import {
  onAuthState,
  saveChatToFirestore,
  deleteChatFromFirestore,
  subscribeUserChats,
  getUserChatsFromFirestore,
  type AuthUserProfile,
} from "@/lib/firebase";

const CHATS_KEY = "quench-ai-chats-v1";
const ACTIVE_CHAT_KEY = "quench-ai-active-chat";
const VOICE_SETTING_KEY = "quench-ai-voice-setting";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

const DEFAULT_VOICE_SETTING: VoiceSetting = {
  voiceId: "kavya", // Kavya (Sarvam AI Bulbul:v3, crystal-clear natural voice)
  provider: "sarvam",
  autoSpeak: false,
  playbackSpeed: 1.0,
};

type StoredChat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bravura AI — Intelligence, Live Voice & Reasoning" },
      {
        name: "description",
        content:
          "Bravura AI is a modern AI workspace: live two-way voice conversation, deep reasoning, research, multimodal tools, and coding with an intelligent AI agent.",
      },
      { property: "og:title", content: "Bravura AI — Intelligence, Live Voice & Reasoning" },
      {
        property: "og:description",
        content: "Chat and talk in real-time live voice with Bravura AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BravuraApp,
});

function friendlyError(error: Error | undefined): string | null {
  if (!error) return null;
  const raw = error.message ?? "";
  try {
    const parsed = JSON.parse(raw) as { error?: string | { message?: string } };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error && typeof parsed.error === "object" && parsed.error.message) {
      return parsed.error.message;
    }
  } catch {
    /* not JSON */
  }
  if (/UNAUTHENTICATED|invalid authentication|ACCESS_TOKEN/i.test(raw)) {
    return "Authentication Notice: Please verify your GEMINI_API_KEY in Settings > Secrets.";
  }
  if (/fetch|network/i.test(raw)) return "Network issue — check your connection and try again.";
  return raw || "Bravura AI couldn't complete that request. Please try again.";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Couldn't read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function attachmentMediaType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    {
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
      csv: "text/csv",
      json: "application/json",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    }[extension ?? ""] ?? "application/octet-stream"
  );
}

function BravuraApp() {
  const [mode, setMode] = useState<ModeId>("chat");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [voiceSetting, setVoiceSetting] = useState<VoiceSetting>(DEFAULT_VOICE_SETTING);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [liveVoiceModalOpen, setLiveVoiceModalOpen] = useState(false);
  const [imageStudioOpen, setImageStudioOpen] = useState(false);
  const [pdfStudioOpen, setPdfStudioOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SupportedModelId>(DEFAULT_MODEL_ID);

  const handleSelectModel = useCallback((model: SupportedModelId) => {
    if (!model || typeof model !== "string" || !model.trim()) {
      return;
    }
    const clean = model.trim();
    setSelectedModel((prev) => {
      if (prev === clean) return prev;
      try {
        window.localStorage.setItem("bravura_selected_model", clean);
      } catch {
        // ignore storage errors
      }
      return clean as SupportedModelId;
    });
  }, []);
  const { isSpeaking, playingId, speak, stop: stopSpeech } = useTextToSpeech();
  const lastSpokenMsgIdRef = useRef<string | null>(null);
  const hasActiveTurnRef = useRef<boolean>(false);

  const chatsRef = useRef<StoredChat[]>(chats);
  chatsRef.current = chats;

  const activeChatIdRef = useRef<string | null>(activeChatId);
  activeChatIdRef.current = activeChatId;

  const hasLoadedStorageRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadedChatIdRef = useRef<string | null>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport,
  });
  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;

  useEffect(() => {
    const startTime = Date.now();
    const unsubscribe = onAuthState((user) => {
      setAuthUser(user);
      if (
        hasBootedOnce ||
        (typeof window !== "undefined" && window.sessionStorage.getItem("bravura_booted") === "1")
      ) {
        setAuthInitialized(true);
        return;
      }
      const elapsed = Date.now() - startTime;
      const minDisplay = 2600; // 2 extra seconds for cinematic logo entrance on initial session boot
      if (elapsed < minDisplay) {
        setTimeout(() => {
          hasBootedOnce = true;
          try {
            window.sessionStorage.setItem("bravura_booted", "1");
          } catch {
            /* ignore */
          }
          setAuthInitialized(true);
        }, minDisplay - elapsed);
      } else {
        hasBootedOnce = true;
        try {
          window.sessionStorage.setItem("bravura_booted", "1");
        } catch {
          /* ignore */
        }
        setAuthInitialized(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync chats from Firestore when authenticated
  useEffect(() => {
    const uid = authUser?.uid;
    if (!uid) return;
    const unsubscribe = subscribeUserChats(uid, (remoteChats) => {
      if (remoteChats.length > 0) {
        setChats((current) => {
          const activeId = activeChatIdRef.current;
          if (!activeId) return remoteChats as StoredChat[];
          return (remoteChats as StoredChat[]).map((rc) => {
            if (rc.id === activeId) {
              const localActive = current.find((c) => c.id === activeId);
              if (localActive && localActive.messages.length >= rc.messages.length) {
                return { ...rc, messages: localActive.messages };
              }
            }
            return rc;
          });
        });
      }
    });
    return () => unsubscribe();
  }, [authUser?.uid]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VOICE_SETTING_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as VoiceSetting;
        const validSarvam = [
          "kavya",
          "rohan",
          "priya",
          "rahul",
          "ishita",
          "shreya",
          "ratan",
          "neha",
        ];
        const isSarvam = parsed.provider === "sarvam" || validSarvam.includes(parsed.voiceId);
        const isDeepgram = parsed.provider === "deepgram" || parsed.voiceId?.startsWith("aura-");

        if (parsed.provider === "elevenlabs" && !isSarvam && !isDeepgram) {
          const fallbackMap: Record<string, string> = {
            JBFqnCBsd6RMkjVDRZzb: "kavya",
            EXAVITQu4vr4xnSDxMaL: "kavya",
            Xb7hH8MSUJpSbSDYk0k2: "kavya",
            CwhRBWXzGAHq8TQ4Fs17: "rohan",
          };
          parsed.voiceId = fallbackMap[parsed.voiceId] || "kavya";
          parsed.provider = "sarvam";
          try {
            window.localStorage.setItem(VOICE_SETTING_KEY, JSON.stringify(parsed));
          } catch {
            // ignore
          }
        }
        setVoiceSetting(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Hydrate chats & model from localStorage on client mount (avoids SSR hydration mismatch)
  // When the user swipes the app away, force quits, or reopens, it will ALWAYS load on a fresh new page
  useEffect(() => {
    if (hasLoadedStorageRef.current) return;
    hasLoadedStorageRef.current = true;
    try {
      const savedChatsRaw = window.localStorage.getItem(CHATS_KEY);
      const savedChats = savedChatsRaw ? (JSON.parse(savedChatsRaw) as StoredChat[]) : [];
      const savedModel = window.localStorage.getItem("bravura_selected_model");

      if (savedModel && typeof savedModel === "string" && savedModel.trim()) {
        setSelectedModel(savedModel.trim() as SupportedModelId);
      }

      if (Array.isArray(savedChats) && savedChats.length > 0) {
        setChats(savedChats);
        chatsRef.current = savedChats;
      }

      // Explicitly clear any active chat ID so that forcequit / app swipe / fresh open always starts on a new page
      window.localStorage.removeItem(ACTIVE_CHAT_KEY);
      setActiveChatId(null);
      activeChatIdRef.current = null;
      lastLoadedChatIdRef.current = null;
      setMessagesRef.current([]);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorageRef.current) return;
    try {
      window.localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch {
      // storage unavailable
    }
  }, [chats]);

  // Hydrate messages only when activeChatId changes to a different chat
  useEffect(() => {
    if (!hasLoadedStorageRef.current) return;
    if (!activeChatId) {
      if (lastLoadedChatIdRef.current !== null) {
        lastLoadedChatIdRef.current = null;
        setMessagesRef.current([]);
      }
      return;
    }
    if (lastLoadedChatIdRef.current === activeChatId) return;

    lastLoadedChatIdRef.current = activeChatId;
    const chat = chatsRef.current.find((c) => c.id === activeChatId);
    // Never wipe out active messages if chat has no messages
    if (chat && Array.isArray(chat.messages) && chat.messages.length > 0) {
      setMessagesRef.current(chat.messages);
    }
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId || messages.length === 0) return;

    setChats((current) => {
      const existing = current.find((c) => c.id === activeChatId);
      if (!existing) return current;
      if (existing.messages === messages) return current;

      // Stable comparison: bail out if lengths, ids, and content match
      if (existing.messages.length === messages.length && existing.messages.length > 0) {
        const isIdentical = existing.messages.every((m, idx) => {
          const target = messages[idx];
          if (!target || m.id !== target.id) return false;
          return messageText(m) === messageText(target);
        });
        if (isIdentical) return current;
      }

      return current.map((c) =>
        c.id === activeChatId ? { ...c, messages, updatedAt: new Date().toISOString() } : c,
      );
    });

    const currentUserId = authUser?.uid;
    if (currentUserId && activeChatId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        const currentChat = chatsRef.current.find((c) => c.id === activeChatId);
        const title =
          currentChat?.title ||
          (messages[0] ? messageText(messages[0]).slice(0, 45) : "New Conversation");
        void saveChatToFirestore(currentUserId, activeChatId, title, messages);
      }, 600);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, activeChatId, authUser?.uid]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      hasActiveTurnRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (!voiceSetting.autoSpeak || status !== "ready" || messages.length === 0) return;

    // Guard: Only speak if this response was actively generated during an active user interaction
    if (!hasActiveTurnRef.current) {
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        lastSpokenMsgIdRef.current = last.id;
      }
      return;
    }

    hasActiveTurnRef.current = false;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.id !== lastSpokenMsgIdRef.current) {
      const text = messageText(last);
      if (text) {
        lastSpokenMsgIdRef.current = last.id;
        console.log(`[VOICE] Auto-speaking finished assistant message: ${last.id}`);
        void speak(text, {
          id: last.id,
          voice: voiceSetting.voiceId,
          provider: voiceSetting.provider,
          playbackSpeed: voiceSetting.playbackSpeed ?? 1.0,
          forceReplay: false,
        });
      }
    }
  }, [status, messages, voiceSetting, speak]);

  const lastAssistantHasText =
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    messages[messages.length - 1]!.parts.some((p) => p.type === "text" && p.text.length > 0);

  const state: AgentState = error
    ? "error"
    : status === "submitted"
      ? "thinking"
      : status === "streaming"
        ? lastAssistantHasText
          ? "generating"
          : "thinking"
        : messages.length > 0
          ? "complete"
          : "idle";

  const busy = status === "submitted" || status === "streaming";
  const errorMessage = composerError ?? friendlyError(error);
  const isImageMode = mode === "image";

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom < 220 || messages.length <= 2) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, state]);

  const handleSpeak = useCallback(
    (id: string, text: string) => {
      unlockAudio();
      void speak(text, {
        id,
        voice: voiceSetting?.voiceId || "kavya",
        provider: voiceSetting?.provider || "sarvam",
        playbackSpeed: voiceSetting?.playbackSpeed || 1.0,
        forceReplay: true,
      });
    },
    [speak, voiceSetting],
  );

  const handleTranscribed = (text: string) => {
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  };

  const submit = async (text?: string, files: File[] = []) => {
    const value = (text ?? input).trim();
    if ((!value && files.length === 0) || busy) return;
    if (files.length > MAX_ATTACHMENTS) {
      setComposerError(`Attach up to ${MAX_ATTACHMENTS} files at a time.`);
      return;
    }
    if (files.some((file) => file.size > MAX_ATTACHMENT_BYTES)) {
      setComposerError("Attachments must be 25 MB or smaller.");
      return;
    }

    setComposerError(null);

    type FilePart = {
      type: "file";
      mediaType: string;
      filename: string;
      url: string;
    };

    const fileParts: FilePart[] = [];
    for (const file of files) {
      const mediaType = attachmentMediaType(file);
      if (mediaType === "application/octet-stream" && !file.name.endsWith(".docx")) {
        setComposerError(
          "Supported attachments are Images (PNG, JPG, WEBP, GIF), PDF, TXT, Markdown, CSV, JSON, and DOCX files.",
        );
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        fileParts.push({
          type: "file",
          mediaType,
          filename: file.name,
          url: dataUrl,
        });
      } catch {
        setComposerError(`Couldn't read ${file.name}. Please try again.`);
        return;
      }
    }

    setInput("");

    let chatId = activeChatId;
    if (!chatId) {
      const now = new Date().toISOString();
      const rawTitle = value || files[0]?.name || "New conversation";
      const title = rawTitle.length > 50 ? `${rawTitle.slice(0, 50).trim()}…` : rawTitle;
      const newChat: StoredChat = {
        id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
        title,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      chatId = newChat.id;
      lastLoadedChatIdRef.current = chatId;
      activeChatIdRef.current = chatId;
      setChats((current) => [newChat, ...current]);
      setActiveChatId(chatId);
    }

    const textToSend =
      value ||
      (fileParts.length > 0
        ? fileParts.some((f) => f.mediaType.startsWith("image/"))
          ? "Please analyze this image."
          : "Please review this document."
        : "");

    void sendMessage(
      { text: textToSend, files: fileParts },
      { body: { mode, deepThink, webSearch, model: selectedModel } },
    );
  };

  const newChat = useCallback(() => {
    stop();
    stopSpeech();
    hasActiveTurnRef.current = false;
    lastLoadedChatIdRef.current = null;
    setMessages([]);
    setInput("");
    setActiveChatId(null);
    setSidebarOpen(false);
  }, [stop, stopSpeech, setMessages]);

  const openChat = useCallback(
    (id: string) => {
      stop();
      stopSpeech();
      hasActiveTurnRef.current = false;
      const chat = chatsRef.current.find((c) => c.id === id) || chats.find((c) => c.id === id);
      if (chat) {
        lastLoadedChatIdRef.current = id;
        setMessages(chat.messages);
        setActiveChatId(id);
      } else if (authUser?.uid) {
        void getUserChatsFromFirestore(authUser.uid).then((remoteChats) => {
          const found = remoteChats.find((rc) => rc.id === id);
          if (found) {
            lastLoadedChatIdRef.current = id;
            setMessages(found.messages as UIMessage[]);
            setActiveChatId(id);
            setChats((prev) => {
              if (prev.some((p) => p.id === id)) return prev;
              return [found as StoredChat, ...prev];
            });
          }
        });
      }
      setHistoryOpen(false);
      setSidebarOpen(false);
    },
    [stop, stopSpeech, setMessages, chats, authUser?.uid],
  );

  const deleteChat = useCallback(
    (id: string) => {
      setChats((current) => current.filter((c) => c.id !== id));
      if (authUser) {
        void deleteChatFromFirestore(id);
      }
      if (activeChatIdRef.current === id) {
        stop();
        stopSpeech();
        hasActiveTurnRef.current = false;
        lastLoadedChatIdRef.current = null;
        setMessages([]);
        setActiveChatId(null);
      }
    },
    [authUser, stop, stopSpeech, setMessages],
  );

  const conversation = messages.length > 0;

  return (
    <div className="text-foreground h-[100dvh] w-full max-w-full overflow-hidden flex flex-col">
      <AnimatePresence>
        {!authInitialized && (
          <motion.div
            key="app-init-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
            className="fixed inset-0 z-50 pointer-events-auto"
          >
            <AppLoadingScreen />
          </motion.div>
        )}
      </AnimatePresence>

      <CosmicBackground />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1800px] min-w-0 overflow-x-hidden gap-2 sm:gap-4 p-2 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Desktop sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block shrink-0"
        >
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <Sidebar
              onNewChat={newChat}
              onSelectChat={openChat}
              onDeleteChat={deleteChat}
              activeChatId={activeChatId}
              chats={chats}
              onHistory={() => setHistoryOpen(true)}
              onOpenVoiceSettings={() => setVoiceModalOpen(true)}
              onOpenTools={() => {}}
              user={authUser}
              authInitialized={authInitialized}
            />
          </div>
        </motion.div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="bg-background/70 absolute inset-0 backdrop-blur-sm cursor-pointer"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            />
            <div className="absolute inset-y-3 left-3 max-h-[calc(100vh-1.5rem)] w-[min(320px,88vw)] overflow-y-auto overscroll-contain">
              <Sidebar
                onNewChat={newChat}
                onSelectChat={(id) => {
                  openChat(id);
                  setSidebarOpen(false);
                }}
                onDeleteChat={deleteChat}
                activeChatId={activeChatId}
                chats={chats}
                onHistory={() => {
                  setHistoryOpen(true);
                  setSidebarOpen(false);
                }}
                onOpenVoiceSettings={() => {
                  setVoiceModalOpen(true);
                  setSidebarOpen(false);
                }}
                onOpenTools={() => {
                  setSidebarOpen(false);
                }}
                user={authUser}
                authInitialized={authInitialized}
              />
              <button
                onClick={() => setSidebarOpen(false)}
                className="glass-panel absolute top-3 right-3 rounded-full p-2 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Central workspace */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col gap-2 sm:gap-3 overflow-hidden",
            conversation ? "pb-1 sm:pb-2" : "pb-1 sm:pb-2",
          )}
        >
          <TopBar
            onToggleSidebar={() => setSidebarOpen(true)}
            onToggleContext={() => setContextOpen((v) => !v)}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
            onSearch={(q) => {
              if (q.trim()) {
                const found = chats.find(
                  (c) =>
                    c.title.toLowerCase().includes(q.toLowerCase()) ||
                    c.messages.some((m) => messageText(m).toLowerCase().includes(q.toLowerCase())),
                );
                if (found) {
                  openChat(found.id);
                }
              }
            }}
          />

          <div className="flex min-h-0 flex-1 flex-col relative">
            {messages.length > 0 ? (
              <div
                ref={scrollContainerRef}
                className="min-h-0 flex-1 overflow-y-auto px-1.5 sm:px-4"
              >
                {errorMessage && (
                  <p
                    className="text-destructive glass-panel mx-auto mb-4 w-full max-w-3xl rounded-2xl px-4 py-3 text-sm"
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                )}
                <ChatView
                  messages={messages}
                  state={state}
                  playingId={playingId}
                  isSpeaking={isSpeaking}
                  onSpeak={handleSpeak}
                  onStopSpeak={stopSpeech}
                />
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.08,
                      delayChildren: 0.05,
                    },
                  },
                }}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 sm:px-4 py-3 sm:py-6 [scrollbar-width:thin]"
              >
                <div className="mx-auto flex w-full max-w-3xl min-w-0 min-h-full flex-col items-stretch justify-center gap-3.5 sm:gap-5 py-2">
                  <HeroSection />
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                    className="w-full max-w-full min-w-0 flex justify-center overflow-x-hidden"
                  >
                    <ModeSelector mode={mode} onChange={setMode} />
                  </motion.div>
                  {isImageMode && (
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                      }}
                      className="glass-panel border-cyan-500/30 bg-cyan-500/10 flex w-full max-w-full min-w-0 items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-xs text-cyan-200"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-cyan-400 shrink-0" />
                        <span>
                          <strong>AI Image Mode Active:</strong> Prompt to create or attach an image
                          to edit with <code>gemini-3.1-flash-image-preview</code>.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageStudioOpen(true)}
                        className="shrink-0 rounded-xl bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/30 transition-colors cursor-pointer"
                      >
                        Open Studio
                      </button>
                    </motion.div>
                  )}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                    className="w-full max-w-full min-w-0"
                  >
                    <QuickActions
                      onPick={(prompt, autoSubmit) => {
                        if (autoSubmit) submit(prompt);
                        else setInput(prompt);
                      }}
                      onOpenImageStudio={() => setImageStudioOpen(true)}
                      onOpenPdfStudio={() => setPdfStudioOpen(true)}
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Prompt Composer anchored cleanly at bottom */}
            <div className="relative mx-auto w-full max-w-4xl shrink-0 pt-2 pb-1 sm:pt-3 z-30">
              {isImageMode && messages.length > 0 && (
                <div className="glass-panel border-cyan-500/30 bg-cyan-500/10 mb-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-xs text-cyan-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-cyan-400 shrink-0" />
                    <span>
                      <strong>AI Image Mode:</strong> Enter any prompt to generate with{" "}
                      <code>gemini-3.1-flash-image-preview</code>, or attach an image to edit it.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageStudioOpen(true)}
                    className="shrink-0 rounded-xl bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/30 transition-colors cursor-pointer"
                  >
                    Open Studio Controls
                  </button>
                </div>
              )}
              <PromptComposer
                value={input}
                onChange={setInput}
                onSubmit={(files) => void submit(undefined, files)}
                onStop={stop}
                onTranscribed={handleTranscribed}
                onOpenLiveVoice={() => setLiveVoiceModalOpen(true)}
                isLiveVoiceActive={liveVoiceModalOpen}
                onOpenImageStudio={() => setImageStudioOpen(true)}
                onOpenPdfStudio={() => setPdfStudioOpen(true)}
                mode={mode}
                onModeChange={setMode}
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                deepThink={deepThink}
                onToggleDeepThink={() => setDeepThink((enabled) => !enabled)}
                webSearch={webSearch}
                onToggleWebSearch={() => setWebSearch((enabled) => !enabled)}
                busy={busy}
                disabled={false}
                error={errorMessage}
              />
            </div>
          </div>
        </motion.main>

        {/* Right context panel */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="hidden xl:block"
        >
          <div className="sticky top-4">
            <RightPanel
              state={state}
              mode={mode}
              errorMessage={errorMessage}
              model={selectedModel}
              onSendTranscript={(text) => {
                setInput(text);
              }}
              onOpenVoiceSettings={() => setVoiceModalOpen(true)}
            />
          </div>
        </motion.div>
      </div>

      {/* Mobile context drawer */}
      {contextOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            className="bg-background/70 absolute inset-0 backdrop-blur-sm cursor-pointer"
            onClick={() => setContextOpen(false)}
            aria-label="Close panel"
          />
          <div className="absolute inset-x-3 bottom-3 max-h-[80vh] overflow-y-auto">
            <RightPanel
              state={state}
              mode={mode}
              errorMessage={errorMessage}
              model={selectedModel}
              onSendTranscript={(text) => {
                setInput(text);
                setContextOpen(false);
              }}
              onOpenVoiceSettings={() => {
                setContextOpen(false);
                setVoiceModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* History modal */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm"
          onClick={() => setHistoryOpen(false)}
        >
          <section
            className="glass-panel max-h-[75vh] w-full max-w-lg overflow-y-auto rounded-3xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.2em] text-cyan-200/70 uppercase">Workspace</p>
                <h2 className="text-xl font-semibold">History</h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-full p-2 cursor-pointer"
                aria-label="Close history"
              >
                <X className="size-5" />
              </button>
            </div>

            {chats.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center text-sm">
                <Clock3 className="size-8 opacity-60" />
                No conversations yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {chats.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  const count = chat.messages.length;
                  return (
                    <div
                      key={chat.id}
                      className={cn(
                        "border-border/60 bg-card/40 group flex items-center gap-2 rounded-2xl border px-4 py-3",
                        isActive && "border-primary/40 bg-primary/10",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openChat(chat.id)}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <p className="truncate text-sm font-medium">{chat.title}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {count} {count === 1 ? "message" : "messages"} ·{" "}
                          {new Date(chat.updatedAt).toLocaleString()}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="text-muted-foreground hover:text-destructive shrink-0 rounded-full p-2 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                        aria-label="Delete conversation"
                        title="Delete conversation"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Voice agent settings modal */}
      {voiceModalOpen && (
        <VoiceAgentModal
          onClose={() => setVoiceModalOpen(false)}
          voiceSetting={voiceSetting}
          onSaveSetting={(newSetting) => {
            setVoiceSetting(newSetting);
            try {
              window.localStorage.setItem(VOICE_SETTING_KEY, JSON.stringify(newSetting));
            } catch {
              // ignore
            }
          }}
        />
      )}

      {/* Live Voice Agent interactive conversation modal */}
      <LiveVoiceAgentModal
        isOpen={liveVoiceModalOpen}
        onClose={() => setLiveVoiceModalOpen(false)}
        voiceSetting={voiceSetting}
        onVoiceSettingChange={(newSetting) => {
          setVoiceSetting(newSetting);
          try {
            window.localStorage.setItem(VOICE_SETTING_KEY, JSON.stringify(newSetting));
          } catch {
            // ignore
          }
        }}
        onTranscriptReady={(userText, assistantReply) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `live-user-${Date.now()}`,
              role: "user",
              parts: [{ type: "text", text: userText }],
            },
            {
              id: `live-assistant-${Date.now() + 1}`,
              role: "assistant",
              parts: [{ type: "text", text: assistantReply }],
            },
          ]);
        }}
        mode={mode}
        deepThink={deepThink}
      />

      {/* AI Image Studio modal */}
      {imageStudioOpen && (
        <ImageStudioModal
          onClose={() => setImageStudioOpen(false)}
          onSendToChat={(imgPrompt) => {
            setMode("image");
            submit(imgPrompt);
          }}
        />
      )}

      {/* AI PDF Studio modal */}
      {pdfStudioOpen && <PdfStudioModal onClose={() => setPdfStudioOpen(false)} />}
    </div>
  );
}
