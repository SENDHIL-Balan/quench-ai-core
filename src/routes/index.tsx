import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, Trash2, X } from "lucide-react";
import { CosmicBackground } from "@/components/quench/CosmicBackground";
import { Sidebar } from "@/components/quench/Sidebar";
import { TopBar } from "@/components/quench/TopBar";
import { HeroSection } from "@/components/quench/HeroSection";
import { PromptComposer } from "@/components/quench/PromptComposer";
import { QuickActions } from "@/components/quench/QuickActions";
import { ChatView } from "@/components/quench/ChatView";
import { RightPanel } from "@/components/quench/RightPanel";
import type { AgentState } from "@/components/quench/AgentStatus";
import { AGENT_MODES, type ModeId } from "@/lib/agent/modes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { extractPdfTextFromFile, PdfExtractError } from "@/lib/attachments/pdf-client";
import { cn } from "@/lib/utils";

const CHATS_KEY = "bravura-ai-chats-v1";
const ACTIVE_CHAT_KEY = "bravura-ai-active-chat";
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const MAX_ATTACHMENTS = 2;

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
      { title: "Bravura AI — Curiosity, fully satisfied" },
      {
        name: "description",
        content:
          "Bravura AI is a premium AI workspace: chat, research, create, analyze and code with a real AI agent in one futuristic interface.",
      },
      { property: "og:title", content: "Bravura AI — Curiosity, fully satisfied" },
      {
        property: "og:description",
        content:
          "Chat, research, create, analyze and code with a real AI agent inside the Bravura AI workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuenchApp,
});

function friendlyError(error: Error | undefined): string | null {
  if (!error) return null;
  const raw = error.message ?? "";
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    /* not JSON */
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
    }[extension ?? ""] ?? "application/octet-stream"
  );
}

function LaunchFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<"flash" | "auth">("flash");

  useEffect(() => {
    if (step !== "flash") return undefined;
    const timer = window.setTimeout(() => setStep("auth"), 1800);
    return () => window.clearTimeout(timer);
  }, [step]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  if (step === "flash") {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#03060b]">
        <div
          className="absolute size-64 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(45,212,191,0.42), rgba(59,130,246,0.22) 40%, transparent 72%)",
            animation: "quench-drift 7s ease-in-out infinite",
          }}
        />
        <div
          className="absolute size-44 rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse at 35% 35%, rgba(167,243,208,0.32), transparent 65%)",
            animation: "quench-drift 5s ease-in-out infinite reverse",
          }}
        />
        <img
          src="/ai-logo.jpg"
          alt="Bravura AI"
          className="relative h-32 w-auto rounded-2xl object-contain drop-shadow-[0_0_28px_rgba(45,212,191,0.85)]"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#03060b]/95 p-5 backdrop-blur-xl">
      <div className="glass-panel w-full max-w-md rounded-3xl p-7 text-center shadow-2xl">
        <img src="/ai-logo.jpg" alt="Bravura AI" className="mx-auto h-20 w-auto rounded-xl object-contain" />
        <h1 className="mt-5 text-2xl font-semibold">Welcome to Bravura AI</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sign in to keep your conversations synced, or continue privately.
        </p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={!isSupabaseConfigured()}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-base font-bold">G</span>
          Sign in with Google
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="text-muted-foreground hover:text-foreground mt-4 inline-flex items-center gap-2 text-sm transition-colors"
        >
          Continue without login
          <ArrowRight className="size-4" />
        </button>
        {!isSupabaseConfigured() && (
          <p className="text-muted-foreground mt-4 text-xs">
            Google sign-in needs Supabase configuration.
          </p>
        )}
      </div>
    </div>
  );
}

function QuenchApp() {
  const [mode, setMode] = useState<ModeId>("chat");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [launchComplete, setLaunchComplete] = useState(() => {
    try {
      return window.sessionStorage.getItem("bravura-launched") === "1";
    } catch {
      return false;
    }
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedChats = window.localStorage.getItem(CHATS_KEY);
      if (savedChats) setChats(JSON.parse(savedChats) as StoredChat[]);
      window.localStorage.removeItem(ACTIVE_CHAT_KEY);
    } catch {
      // Ignore unavailable or malformed local history.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch {
      // storage unavailable
    }
  }, [chats]);

  useEffect(() => {
    try {
      if (activeChatId) {
        window.localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
      } else {
        window.localStorage.removeItem(ACTIVE_CHAT_KEY);
      }
    } catch {
      // storage unavailable
    }
  }, [activeChatId]);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport });

  useEffect(() => {
    if (!activeChatId) return;
    const chat = chats.find((c) => c.id === activeChatId);
    if (chat && chat.messages.length > 0) {
      setMessages(chat.messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId || messages.length === 0) return;
    setChats((current) =>
      current.map((c) =>
        c.id === activeChatId
          ? { ...c, messages, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  }, [messages, activeChatId]);

  useEffect(() => {
    if (status !== "ready") return;

    setMessages((current) => {
      const hasAttachments = current.some((message) =>
        message.parts.some((part) => part.type === "file"),
      );
      if (!hasAttachments) return current;
      return current.map((message) => ({
        ...message,
        parts: message.parts.flatMap((part) =>
          part.type === "file"
            ? [
                {
                  type: "text" as const,
                  text: `Attached file: ${part.filename ?? "document"}`,
                },
              ]
            : [part],
        ),
      }));
    });
  }, [setMessages, status]);

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
  const imageMode = !AGENT_MODES[mode].available;

  const handleTranscribed = (text: string) => {
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  };

  const submit = async (text?: string, files: File[] = []) => {
    const value = (text ?? input).trim();
    if ((!value && files.length === 0) || busy || imageMode) return;
    if (files.length > MAX_ATTACHMENTS) {
      setComposerError(`Attach up to ${MAX_ATTACHMENTS} files at a time.`);
      return;
    }
    if (files.some((file) => file.size > MAX_ATTACHMENT_BYTES)) {
      setComposerError("Attachments must be 2 MB or smaller.");
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
      if (mediaType === "application/octet-stream") {
        setComposerError("Supported attachments are PDF, TXT, Markdown, CSV, and JSON files.");
        return;
      }

      if (mediaType === "application/pdf") {
        try {
          const extracted = await extractPdfTextFromFile(file);
          const encoded = `data:text/plain;charset=utf-8;base64,${btoa(
            unescape(encodeURIComponent(extracted)),
          )}`;
          fileParts.push({
            type: "file",
            mediaType: "text/plain",
            filename: file.name,
            url: encoded,
          });
        } catch (error) {
          const message =
            error instanceof PdfExtractError
              ? error.message
              : "That PDF could not be read. Try a different file.";
          setComposerError(message);
          return;
        }
      } else {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          fileParts.push({
            type: "file",
            mediaType,
            filename: file.name,
            url: dataUrl,
          });
        } catch {
          setComposerError(`Couldn't read ${file.name}.`);
          return;
        }
      }
    }

    setInput("");

    let chatId = activeChatId;
    if (!chatId) {
      const now = new Date().toISOString();
      const rawTitle = value || files[0]?.name || "New conversation";
      const title =
        rawTitle.length > 50 ? `${rawTitle.slice(0, 50).trim()}…` : rawTitle;
      const newChat: StoredChat = {
        id:
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}`,
        title,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      chatId = newChat.id;
      setChats((current) => [newChat, ...current]);
      setActiveChatId(chatId);
    }

    void sendMessage(
      { text: value, files: fileParts },
      { body: { mode, deepThink, webSearch } },
    );
  };

  const newChat = () => {
    stop();
    setMessages([]);
    setInput("");
    setActiveChatId(null);
    setSidebarOpen(false);
  };

  const openChat = (id: string) => {
    stop();
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    setMessages(chat.messages);
    setActiveChatId(id);
    setHistoryOpen(false);
  };

  const deleteChat = (id: string) => {
    setChats((current) => current.filter((c) => c.id !== id));
    if (activeChatId === id) {
      stop();
      setMessages([]);
      setActiveChatId(null);
    }
  };

  const conversation = messages.length > 0;

  if (!launchComplete) {
    return (
      <LaunchFlow
        onComplete={() => {
          try {
            window.sessionStorage.setItem("bravura-launched", "1");
          } catch {
            /* storage unavailable */
          }
          setLaunchComplete(true);
        }}
      />
    );
  }

  return (
    <div className="text-foreground h-screen overflow-hidden">
      <CosmicBackground />

      <div className="relative z-10 mx-auto flex h-full max-w-[1800px] gap-4 p-3 sm:p-4">
        <div className="hidden lg:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <Sidebar onNewChat={newChat} onHistory={() => setHistoryOpen(true)} />
          </div>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="bg-background/70 absolute inset-0 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            />
            <div className="absolute inset-y-3 left-3 max-h-[calc(100vh-1.5rem)] w-[min(300px,85vw)] overflow-y-auto overscroll-contain">
              <Sidebar
                onNewChat={newChat}
                onHistory={() => {
                  setHistoryOpen(true);
                  setSidebarOpen(false);
                }}
              />
              <button
                onClick={() => setSidebarOpen(false)}
                className="glass-panel absolute top-3 right-3 rounded-full p-2"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden",
            conversation ? "pb-4 lg:pb-4" : "pb-2 lg:pb-4",
          )}
        >
          <TopBar
            onToggleSidebar={() => setSidebarOpen(true)}
            onToggleContext={() => setContextOpen((v) => !v)}
          />

          {conversation ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-2 sm:px-4">
                {errorMessage && (
                  <p
                    className="text-destructive glass-panel mx-auto mb-4 w-full max-w-3xl rounded-2xl px-4 py-3 text-sm"
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                )}
                <ChatView messages={messages} state={state} />
              </div>
              <div className="mx-auto w-full max-w-4xl shrink-0 pt-3">
                {imageMode && (
                  <p className="text-muted-foreground glass-panel mb-3 rounded-2xl px-4 py-3 text-sm">
                    Image generation will be connected later. Pick another mode to keep chatting.
                  </p>
                )}
                <PromptComposer
                  value={input}
                  onChange={setInput}
                  onSubmit={(files) => void submit(undefined, files)}
                  onStop={stop}
                  onTranscribed={handleTranscribed}
                  mode={mode}
                  onModeChange={setMode}
                  deepThink={deepThink}
                  onToggleDeepThink={() => setDeepThink((enabled) => !enabled)}
                  webSearch={webSearch}
                  onToggleWebSearch={() => setWebSearch((enabled) => !enabled)}
                  busy={busy}
                  disabled={imageMode}
                  error={errorMessage}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-start gap-6 pt-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <HeroSection />
              {imageMode && (
                <p className="text-muted-foreground glass-panel rounded-2xl px-4 py-3 text-sm">
                  Image generation will be connected later. Pick another mode to keep chatting.
                </p>
              )}
              <QuickActions
                onPick={(prompt, autoSubmit) => {
                  if (autoSubmit && !imageMode) submit(prompt);
                  else setInput(prompt);
                }}
              />
              <PromptComposer
                value={input}
                onChange={setInput}
                onSubmit={(files) => void submit(undefined, files)}
                onStop={stop}
                onTranscribed={handleTranscribed}
                mode={mode}
                onModeChange={setMode}
                deepThink={deepThink}
                onToggleDeepThink={() => setDeepThink((enabled) => !enabled)}
                webSearch={webSearch}
                onToggleWebSearch={() => setWebSearch((enabled) => !enabled)}
                busy={busy}
                disabled={imageMode}
                error={errorMessage}
              />
            </div>
          )}
        </main>

        <div className="hidden xl:block">
          <div className="sticky top-4">
            <RightPanel state={state} mode={mode} errorMessage={errorMessage} />
          </div>
        </div>
      </div>

      {contextOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            className="bg-background/70 absolute inset-0 backdrop-blur-sm"
            onClick={() => setContextOpen(false)}
            aria-label="Close panel"
          />
          <div className="absolute inset-x-3 bottom-3 max-h-[80vh] overflow-y-auto">
            <RightPanel state={state} mode={mode} errorMessage={errorMessage} />
          </div>
        </div>
      )}

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
                className="text-muted-foreground hover:text-foreground rounded-full p-2"
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
                        className="min-w-0 flex-1 text-left"
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
                        className="text-muted-foreground hover:text-destructive shrink-0 rounded-full p-2 opacity-0 transition-opacity group-hover:opacity-100"
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
    </div>
  );
}