import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, BrainCircuit, FileText, Lock, Bot, ArrowLeft } from "lucide-react";import { CosmicBackground } from "@/components/quench/CosmicBackground";
import { Sidebar } from "@/components/quench/Sidebar";
import { cn } from "@/lib/utils";
import { PdfStudioModal } from "@/components/quench/PdfStudioModal";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tools — Bravura AI" },
      { name: "description", content: "Enable the tools Bravura AI uses to answer you." },
    ],
  }),
  component: ToolsPage,
});

const SEARCH_KEY = "bravura-tool-websearch";
const DEEPTHINK_KEY = "bravura-tool-deepthink";

function ToolsPage() {
  const [webSearch, setWebSearch] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

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
            <h1 className="text-gradient-brand text-3xl font-semibold sm:text-4xl">Tools</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              What Bravura AI can use while answering you.
            </p>
          </header>

          <section className="flex flex-col gap-3">
            <p className="text-xs tracking-[0.2em] text-cyan-200/60 uppercase">Active</p>

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
          </section>

          <section className="flex flex-col gap-3 pb-8">
            <p className="text-xs tracking-[0.2em] text-cyan-200/60 uppercase">Coming Soon</p>

            <button
              type="button"
              onClick={() => setPdfOpen(true)}
              className="group hover:border-primary/40 relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.06]"
            >
              <div
                className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-40 blur-3xl transition-opacity group-hover:opacity-70"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.72 0.22 160 / 45%), oklch(0.6 0.18 190 / 30%) 40%, transparent 70%)",
                }}
              />

              <div className="from-quench-green/20 to-quench-blue/20 relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/10">
                <FileText className="text-quench-cyan size-5" />
              </div>

              <div className="relative min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">Text to PDF</span>
                  <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                    Coming Soon
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Turn any text into a professionally styled PDF — notes, study sheets, notebooks, and more.
                </p>
              </div>

              <Lock className="text-muted-foreground size-4 shrink-0 opacity-60" />
            </button>

            <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
              <Bot className="size-3.5" />
              More tools will land here as we ship them.
            </div>
          </section>
        </main>
      </div>

      {pdfOpen && <PdfStudioModal onClose={() => setPdfOpen(false)} />}
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
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={`Toggle ${title}`}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          enabled ? "border-primary/60 bg-primary/30" : "border-white/10 bg-white/[0.05]",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-[18px] -translate-y-1/2 rounded-full shadow transition-all duration-200",
            enabled ? "bg-primary left-[22px]" : "left-[3px] bg-white/70",
          )}
        />
      </button>
    </div>
  );
}