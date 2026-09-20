import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { CosmicBackground } from "@/components/quench/CosmicBackground";
import { Sidebar } from "@/components/quench/Sidebar";
import { cn } from "@/lib/utils";
import { PdfStudioModal } from "@/components/quench/PdfStudioModal";
import { ImageStudioModal } from "@/components/quench/ImageStudioModal";

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

function ToolsPage() {
  const [webSearch, setWebSearch] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    try {
      setWebSearch(window.localStorage.getItem(SEARCH_KEY) === "1");
      setDeepThink(window.localStorage.getItem(DEEPTHINK_KEY) === "1");
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
        <div className="hidden lg:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <Sidebar onNewChat={() => {}} onHistory={() => {}} />
          </div>
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-2 sm:px-4">
          <header className="pt-4">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-xs transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to chat
            </Link>
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
                  <p className="text-sm font-semibold">Bravura Speech-to-Text</p>
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">
                    Bravura Live Voice Synthesis & Two-Way Agent
                  </p>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                    Connected
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Ultra-realistic neural voice personas (Bravura George, Sarah, Alice, Asteria,
                  Orion). Click the blue orb in the composer to talk in live two-way voice with
                  Bravura AI.
                </p>
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
