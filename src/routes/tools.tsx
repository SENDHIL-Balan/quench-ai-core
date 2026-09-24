import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search,
  BrainCircuit,
  FileText,
  Bot,
  ArrowLeft,
  Volume2,
  Mic,
  Sparkles,
  ArrowUpRight,
  Menu,
  X,
  Radio,
  Orbit,
  Check,
  Palette,
} from "lucide-react";
import { CosmicBackground } from "@/components/quench/CosmicBackground";
import { Sidebar } from "@/components/quench/Sidebar";
import { cn } from "@/lib/utils";
import { PdfStudioModal } from "@/components/quench/PdfStudioModal";
import { ImageStudioModal } from "@/components/quench/ImageStudioModal";
import { LiveVoiceAgentModal } from "@/components/quench/LiveVoiceAgentModal";
import { CosmicThemeGalleryModal } from "@/components/quench/CosmicThemeGalleryModal";
import { useCosmicTheme } from "@/lib/theme/CosmicThemeContext";
import type { VoiceSetting } from "@/components/quench/VoiceAgentModal";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tools & AI Studios — Bravura AI" },
      {
        name: "description",
        content:
          "Enable and configure agentic tools, AI Image Studio, and AI PDF Generation in Bravura AI.",
      },
    ],
  }),
  component: ToolsPage,
});

const SEARCH_KEY = "quench-tool-websearch";
const DEEPTHINK_KEY = "quench-tool-deepthink";
const VOICE_SETTING_KEY = "quench-ai-voice-setting";

const DEFAULT_VOICE_SETTING: VoiceSetting = {
  voiceId: "aura-asteria-en", // Nikki bella (Deepgram Aura, ultra-fast & responsive)
  provider: "deepgram",
  autoSpeak: false,
  playbackSpeed: 1.0,
};

function ToolsPage() {
  const router = useRouter();
  const [webSearch, setWebSearch] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceSetting, setVoiceSetting] = useState<VoiceSetting>(DEFAULT_VOICE_SETTING);
  const [cosmicModalOpen, setCosmicModalOpen] = useState(false);
  const { theme, setTheme, themes, currentThemeMeta } = useCosmicTheme();
  const activeMeta = currentThemeMeta || themes[0];

  const handleBack = () => {
    void router.navigate({ to: "/" });
  };

  useEffect(() => {
    try {
      const storedSearch = window.localStorage.getItem(SEARCH_KEY);
      setWebSearch(storedSearch === "1");
      setDeepThink(window.localStorage.getItem(DEEPTHINK_KEY) === "1");
      const storedVoice = window.localStorage.getItem(VOICE_SETTING_KEY);
      if (storedVoice) {
        const parsed = JSON.parse(storedVoice) as VoiceSetting;
        if (parsed.provider === "elevenlabs" || !parsed.voiceId?.startsWith("aura-")) {
          const fallbackMap: Record<string, string> = {
            JBFqnCBsd6RMkjVDRZzb: "aura-orion-en",
            EXAVITQu4vr4xnSDxMaL: "aura-asteria-en",
            Xb7hH8MSUJpSbSDYk0k2: "aura-luna-en",
            CwhRBWXzGAHq8TQ4Fs17: "aura-arcas-en",
          };
          parsed.voiceId = fallbackMap[parsed.voiceId] || "aura-asteria-en";
          parsed.provider = "deepgram";
          try {
            window.localStorage.setItem(VOICE_SETTING_KEY, JSON.stringify(parsed));
          } catch {
            /* ignore */
          }
        }
        setVoiceSetting(parsed);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleSearch = () => {
    setWebSearch((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(SEARCH_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleDeepThink = () => {
    setDeepThink((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(DEEPTHINK_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="text-foreground h-screen overflow-hidden">
      <CosmicBackground />

      <div className="relative z-10 mx-auto flex h-full max-w-[1800px] gap-4 p-3 sm:p-4">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <Sidebar
              onNewChat={() => {
                try {
                  window.localStorage.removeItem("bravura-active-chat-id");
                } catch {
                  /* ignore */
                }
                void router.navigate({ to: "/" });
              }}
              onHistory={() => {
                void router.navigate({ to: "/" });
              }}
              onOpenTools={() => {}}
            />
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="bg-background/70 absolute inset-0 backdrop-blur-sm cursor-pointer"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            />
            <div className="absolute inset-y-3 left-3 max-h-[calc(100vh-1.5rem)] w-[min(300px,85vw)] overflow-y-auto overscroll-contain">
              <Sidebar
                onNewChat={() => {
                  setSidebarOpen(false);
                  void router.navigate({ to: "/" });
                }}
                onHistory={() => {
                  setSidebarOpen(false);
                  void router.navigate({ to: "/" });
                }}
                onOpenTools={() => {
                  setSidebarOpen(false);
                }}
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

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-2 sm:px-4">
          {/* Mobile Header Bar */}
          <div className="flex items-center justify-between lg:hidden pt-1 pb-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="glass-panel flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-medium text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> Back to chat
            </button>
          </div>

          <header className="pt-2 sm:pt-4">
            <button
              id="tools-page-back-btn"
              type="button"
              onClick={handleBack}
              className="text-muted-foreground hover:text-cyan-200 mb-3 hidden sm:inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer group"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to chat
            </button>
            <p className="text-xs tracking-[0.3em] text-cyan-200/60 uppercase">Workspace</p>
            <h1 className="text-gradient-brand text-3xl font-semibold sm:text-4xl">
              Tools & Generative AI Studios
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Explore generative AI capabilities, multimodal creation studios, and voice agents in
              Bravura AI.
            </p>
          </header>

          {/* AI Generative Studios Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-[0.2em] text-cyan-200/60 uppercase">
                Generative AI Studios
              </p>
              <span className="flex items-center gap-1.5 text-xs text-cyan-400">
                <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                Active Features
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image Studio Card */}
              <button
                type="button"
                onClick={() => setImageOpen(true)}
                className="group hover:border-cyan-400/40 relative flex items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all hover:bg-white/[0.06] cursor-pointer"
              >
                <div
                  className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full opacity-35 blur-3xl transition-opacity group-hover:opacity-70"
                  style={{
                    background:
                      "radial-gradient(circle, oklch(0.7 0.2 190 / 50%), oklch(0.6 0.22 290 / 30%) 50%, transparent 80%)",
                  }}
                />

                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 ring-1 ring-cyan-400/30 text-cyan-300">
                  <Sparkles className="size-6" />
                </div>

                <div className="relative min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">AI Image Studio</span>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                      gemini-3.1-flash-image-preview
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                    Generate images from natural prompts, choose aspect ratios, apply style presets,
                    or upload existing images to edit and transform with AI.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 group-hover:text-cyan-200">
                    Launch Image Studio <ArrowUpRight className="size-3.5" />
                  </span>
                </div>
              </button>

              {/* PDF Studio Card */}
              <button
                type="button"
                onClick={() => setPdfOpen(true)}
                className="group hover:border-emerald-400/40 relative flex items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all hover:bg-white/[0.06] cursor-pointer"
              >
                <div
                  className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full opacity-35 blur-3xl transition-opacity group-hover:opacity-70"
                  style={{
                    background:
                      "radial-gradient(circle, oklch(0.72 0.22 160 / 50%), oklch(0.6 0.18 190 / 30%) 50%, transparent 80%)",
                  }}
                />

                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 ring-1 ring-emerald-400/30 text-emerald-300">
                  <FileText className="size-6" />
                </div>

                <div className="relative min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">AI PDF Document Studio</span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                      Prompt to PDF
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                    Turn prompts into structured, publication-ready PDF documents: business
                    proposals, study guides, invoices, technical specs, and executive reviews.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-300 group-hover:text-emerald-200">
                    Launch PDF Studio <ArrowUpRight className="size-3.5" />
                  </span>
                </div>
              </button>
            </div>
          </section>

          {/* Voice AI Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-[0.2em] text-cyan-200/60 uppercase">
                Voice Agentic AI
              </p>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                Live APIs
              </span>
            </div>

            <div className="glass-panel border-primary/30 flex items-start gap-4 rounded-2xl p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                <Mic className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Speech-to-Text</p>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Connected
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Sub-second live speech transcription with smart formatting. Click the mic icon in
                  the composer to transcribe your voice.
                </p>
              </div>
            </div>

            <div className="glass-panel border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
                  <Volume2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Live Voice Synthesis & Two-Way Agent</p>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                      Connected
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    Ultra-realistic voice personas (Jeff besos, Shakira, Melodi, Nikki bella, Elon
                    musk, The Rock, Bellie eilish). Click to talk in live two-way conversational
                    voice.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLiveVoiceOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 px-4 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 hover:border-cyan-400/50 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <Radio className="size-3.5 text-cyan-400 animate-pulse" />
                Launch Voice Agent
              </button>
            </div>
          </section>

          {/* Cosmic Environment & Themes Settings Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.2em] text-cyan-200/60 uppercase">
                  Appearance & Atmosphere
                </p>
                <h2 className="text-lg font-semibold text-foreground mt-0.5">
                  Cosmic Universe Themes
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCosmicModalOpen(true)}
                className="text-xs font-medium text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors cursor-pointer"
              >
                <Orbit className="size-3.5" />
                View 10 Realms Gallery
              </button>
            </div>

            <div className="glass-panel rounded-2xl p-5 border-border/80 relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700"
                style={{ background: activeMeta.previewGradient }}
              />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span
                    className="size-4 rounded-full shrink-0 ring-2 ring-white/20 shadow-md"
                    style={{
                      background: activeMeta.accents[0],
                      boxShadow: `0 0 12px ${activeMeta.accents[0]}`,
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{activeMeta.name}</h3>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeMeta.tagline} · {activeMeta.accentLabels}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground/90 max-w-md italic">
                  "{activeMeta.atmosphere}"
                </p>
              </div>

              {/* Theme Quick Switcher Grid */}
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4">
                {themes.map((item) => {
                  const isCurrent = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item.id)}
                      className={cn(
                        "relative flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all cursor-pointer overflow-hidden group",
                        isCurrent
                          ? "border-primary bg-primary/15 ring-1 ring-primary/40 shadow-sm"
                          : "border-white/10 hover:border-white/25 hover:bg-white/[0.04] bg-card/50",
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex -space-x-1 items-center">
                          <span
                            className="size-3 rounded-full border border-black/40"
                            style={{ background: item.accents[0] }}
                          />
                          <span
                            className="size-3 rounded-full border border-black/40"
                            style={{ background: item.accents[1] }}
                          />
                        </div>
                        {isCurrent && <Check className="size-3 text-primary shrink-0" />}
                      </div>
                      <span className="text-xs font-medium text-foreground tracking-tight line-clamp-1">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Reasoning & Search Section */}
          <section className="flex flex-col gap-3 pb-8">
            <p className="text-xs tracking-[0.2em] text-cyan-200/60 uppercase">
              Reasoning & Search
            </p>

            <ToolToggle
              icon={Search}
              title="Web Search"
              description="Searches the live web for the latest information before answering."
              enabled={webSearch}
              onToggle={toggleSearch}
            />
            <ToolToggle
              icon={BrainCircuit}
              title="Deep Think"
              description="Spends extra reasoning time on hard questions."
              enabled={deepThink}
              onToggle={toggleDeepThink}
            />

            <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
              <Bot className="size-3.5" />
              More tools will land here as we ship them.
            </div>
          </section>
        </main>
      </div>

      {pdfOpen && <PdfStudioModal onClose={() => setPdfOpen(false)} />}
      {imageOpen && <ImageStudioModal onClose={() => setImageOpen(false)} />}
      <CosmicThemeGalleryModal open={cosmicModalOpen} onOpenChange={setCosmicModalOpen} />
      {liveVoiceOpen && (
        <LiveVoiceAgentModal
          isOpen={liveVoiceOpen}
          onClose={() => setLiveVoiceOpen(false)}
          voiceSetting={voiceSetting}
          onVoiceSettingChange={(newSetting) => {
            setVoiceSetting(newSetting);
            try {
              window.localStorage.setItem(VOICE_SETTING_KEY, JSON.stringify(newSetting));
            } catch {
              /* ignore */
            }
          }}
          deepThink={deepThink}
        />
      )}
    </div>
  );
}

function ToolToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: typeof Search;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "glass-panel flex items-start gap-4 rounded-2xl p-4 transition-colors",
        enabled && "border-primary/40",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
          enabled
            ? "bg-primary/15 text-primary ring-primary/30"
            : "text-muted-foreground bg-white/[0.04] ring-white/10",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          enabled ? "bg-primary" : "bg-white/10",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
            enabled ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
