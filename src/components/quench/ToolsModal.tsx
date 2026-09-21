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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PdfStudioModal } from "@/components/quench/PdfStudioModal";
import { ImageStudioModal } from "@/components/quench/ImageStudioModal";

const SEARCH_KEY = "quench-tool-websearch";
const DEEPTHINK_KEY = "quench-tool-deepthink";

interface ToolsModalProps {
  onClose: () => void;
  onOpenLiveVoice?: () => void;
  onTogglesChange?: (search: boolean, deepThink: boolean) => void;
}

export function ToolsModal({ onClose, onOpenLiveVoice, onTogglesChange }: ToolsModalProps) {
  const [webSearch, setWebSearch] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    try {
      const storedSearch = window.localStorage.getItem(SEARCH_KEY);
      const isSearch = storedSearch === "1";
      const isThink = window.localStorage.getItem(DEEPTHINK_KEY) === "1";
      setWebSearch(isSearch);
      setDeepThink(isThink);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Sync with browser history so the browser back button closes this modal cleanly
  useEffect(() => {
    let pushed = false;
    try {
      window.history.pushState({ toolsModal: true }, "");
      pushed = true;
    } catch {
      // ignore
    }

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushed && window.history.state?.toolsModal) {
        try {
          window.history.back();
        } catch {
          // ignore
        }
      }
    };
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleSearch = () => {
    setWebSearch((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(SEARCH_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      onTogglesChange?.(next, deepThink);
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
      onTogglesChange?.(webSearch, next);
      return next;
    });
  };

  return (
    <div
      id="tools-modal-overlay"
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Top Bar with Back to Chat */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md sm:px-6">
        <button
          id="tools-back-btn"
          type="button"
          onClick={onClose}
          className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-white/90 shadow-sm transition hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-cyan-200 cursor-pointer"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to chat</span>
        </button>

        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-cyan-300 uppercase">
            Workspace Tools
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close tools"
          className="flex size-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <header>
            <p className="text-xs tracking-[0.3em] text-cyan-200/60 uppercase">Workspace</p>
            <h1 className="text-gradient-brand text-2xl font-bold sm:text-3xl">
              Tools & Generative AI Studios
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
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

            <div className="glass-panel border-primary/30 flex items-start gap-4 rounded-2xl p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
                <Volume2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Live Voice Synthesis & Two-Way Agent</p>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                      Connected
                    </span>
                  </div>
                  {onOpenLiveVoice && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenLiveVoice();
                      }}
                      className="text-xs text-cyan-300 hover:text-cyan-200 underline font-medium cursor-pointer"
                    >
                      Open Voice Agent
                    </button>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Ultra-realistic voice personas (Jeff besos, Shakira, Melodi, Nikki bella, Elon
                  musk, The Rock, Bellie eilish). Click the blue orb in the composer to talk in live
                  two-way voice with the AI Voice Agent.
                </p>
              </div>
            </div>
          </section>

          {/* Reasoning & Search Section */}
          <section className="flex flex-col gap-3 pb-8">
            <p className="text-xs tracking-[0.2em] text-cyan-200/60 uppercase">
              Reasoning & Search
            </p>

            <ToolToggleItem
              icon={Search}
              title="Web Search"
              description="Searches the live web for the latest information before answering."
              enabled={webSearch}
              onToggle={toggleSearch}
            />
            <ToolToggleItem
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
        </div>
      </div>

      {pdfOpen && <PdfStudioModal onClose={() => setPdfOpen(false)} />}
      {imageOpen && <ImageStudioModal onClose={() => setImageOpen(false)} />}
    </div>
  );
}

function ToolToggleItem({
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
