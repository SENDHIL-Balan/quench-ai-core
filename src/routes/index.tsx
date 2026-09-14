import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { CosmicBackground } from "@/components/quench/CosmicBackground";
import { Sidebar } from "@/components/quench/Sidebar";
import { TopBar } from "@/components/quench/TopBar";
import { HeroSection } from "@/components/quench/HeroSection";
import { ModeSelector } from "@/components/quench/ModeSelector";
import { PromptComposer } from "@/components/quench/PromptComposer";
import { QuickActions } from "@/components/quench/QuickActions";
import { ChatView } from "@/components/quench/ChatView";
import { RightPanel } from "@/components/quench/RightPanel";
import { MobileNavigation } from "@/components/quench/MobileNavigation";
import type { AgentState } from "@/components/quench/AgentStatus";
import { AGENT_MODES, type ModeId } from "@/lib/agent/modes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quench AI — Curiosity, fully satisfied" },
      {
        name: "description",
        content:
          "Quench AI is a premium AI workspace: chat, research, create, analyze and code with a real AI agent in one futuristic interface.",
      },
      { property: "og:title", content: "Quench AI — Curiosity, fully satisfied" },
      {
        property: "og:description",
        content:
          "Chat, research, create, analyze and code with a real AI agent inside the Quench AI workspace.",
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
  return "Quench AI couldn't complete that request. Please try again.";
}

function QuenchApp() {
  const [mode, setMode] = useState<ModeId>("chat");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport });

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
  const errorMessage = friendlyError(error);
  const imageMode = !AGENT_MODES[mode].available;

  const submit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || busy || imageMode) return;
    setInput("");
    void sendMessage({ text: value }, { body: { mode } });
  };

  const newChat = () => {
    stop();
    setMessages([]);
    setInput("");
    setSidebarOpen(false);
  };

  const conversation = messages.length > 0;

  return (
    <div className="text-foreground min-h-screen">
      <CosmicBackground />

      <div className="mx-auto flex max-w-[1800px] gap-4 p-3 sm:p-4">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <Sidebar onNewChat={newChat} />
          </div>
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="bg-background/70 absolute inset-0 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            />
            <div className="absolute inset-y-3 left-3 w-[min(300px,85vw)]">
              <Sidebar onNewChat={newChat} />
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

        {/* Central workspace */}
        <main className="flex min-w-0 flex-1 flex-col gap-5 pb-24 lg:pb-4">
          <TopBar
            onToggleSidebar={() => setSidebarOpen(true)}
            onToggleContext={() => setContextOpen((v) => !v)}
          />

          {conversation ? (
            <div className="flex min-h-[calc(100vh-11rem)] flex-col gap-4">
              <div className="flex-1 overflow-y-auto">
                <ChatView messages={messages} state={state} />
              </div>
              <div className="mx-auto w-full max-w-3xl">
                <ModeSelector mode={mode} onChange={setMode} className="mb-3 justify-start" />
                {imageMode && (
                  <p className="text-muted-foreground glass-panel mb-3 rounded-2xl px-4 py-3 text-sm">
                    Image generation will be connected later. Pick another mode to keep chatting.
                  </p>
                )}
                <PromptComposer
                  value={input}
                  onChange={setInput}
                  onSubmit={() => submit()}
                  onStop={stop}
                  busy={busy}
                  disabled={imageMode}
                  error={errorMessage}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-7 py-8">
              <HeroSection />
              <ModeSelector mode={mode} onChange={setMode} />
              {imageMode && (
                <p className="text-muted-foreground glass-panel rounded-2xl px-4 py-3 text-sm">
                  Image generation will be connected later. Pick another mode to keep chatting.
                </p>
              )}
              <PromptComposer
                value={input}
                onChange={setInput}
                onSubmit={() => submit()}
                onStop={stop}
                busy={busy}
                disabled={imageMode}
                error={errorMessage}
              />
              <QuickActions
                onPick={(prompt, autoSubmit) => {
                  if (autoSubmit && !imageMode) submit(prompt);
                  else setInput(prompt);
                }}
              />
              <p className="text-muted-foreground mt-4 text-center text-[11px] tracking-[0.3em]">
                "KNOWLEDGE FEELS DIFFERENT HERE."
              </p>
            </div>
          )}
        </main>

        {/* Right context panel */}
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

      <MobileNavigation />
    </div>
  );
}
