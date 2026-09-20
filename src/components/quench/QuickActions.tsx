import {
  Lightbulb,
  ListChecks,
  BarChart3,
  PenLine,
  ChevronRight,
  Sparkles,
  FileText,
} from "lucide-react";

export const QUICK_ACTIONS = [
  {
    title: "Explain a concept",
    sub: "Learn something new",
    icon: Lightbulb,
    prompt: "Explain machine learning to me like I'm a beginner.",
  },
  {
    title: "Plan something",
    sub: "Turn ideas into steps",
    icon: ListChecks,
    prompt: "Help me turn this idea into a step-by-step plan: ",
  },
  {
    title: "Analyze data",
    sub: "Find insights fast",
    icon: BarChart3,
    prompt: "Analyze the following data and tell me what stands out:\n",
  },
  {
    title: "Create something",
    sub: "Build, write, design",
    icon: PenLine,
    prompt: "Help me create ",
  },
];

interface QuickActionsProps {
  onPick: (prompt: string, submit: boolean) => void;
  onOpenImageStudio?: () => void;
  onOpenPdfStudio?: () => void;
}

export function QuickActions({ onPick, onOpenImageStudio, onOpenPdfStudio }: QuickActionsProps) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-3 relative z-10">
      {/* Generative AI Studios Quick Bars */}
      {(onOpenImageStudio || onOpenPdfStudio) && (
        <div className="grid w-full gap-3 sm:grid-cols-2">
          {onOpenImageStudio && (
            <button
              type="button"
              onClick={onOpenImageStudio}
              className="glass-panel group hover:border-cyan-400/50 flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all hover:bg-cyan-500/10 cursor-pointer"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30">
                <Sparkles className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">AI Image Studio</span>
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.2 text-[10px] font-medium text-cyan-300">
                    gemini-3.1-flash-image
                  </span>
                </div>
                <span className="text-muted-foreground block truncate text-xs">
                  Create & edit high-res images with prompt controls
                </span>
              </div>
              <ChevronRight className="text-muted-foreground size-4 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {onOpenPdfStudio && (
            <button
              type="button"
              onClick={onOpenPdfStudio}
              className="glass-panel group hover:border-emerald-400/50 flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all hover:bg-emerald-500/10 cursor-pointer"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">AI PDF Document Studio</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[10px] font-medium text-emerald-300">
                    Prompt to PDF
                  </span>
                </div>
                <span className="text-muted-foreground block truncate text-xs">
                  Generate and download formatted PDF documents
                </span>
              </div>
              <ChevronRight className="text-muted-foreground size-4 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
            </button>
          )}
        </div>
      )}

      {/* Standard Prompt Shortcuts */}
      <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ title, sub, icon: Icon, prompt }) => {
          const submit = !prompt.trimEnd().endsWith(":") && prompt.trim().endsWith(".");
          return (
            <button
              key={title}
              type="button"
              onClick={() => onPick(prompt, submit)}
              className="glass-panel hover:border-primary/35 flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors cursor-pointer"
            >
              <Icon className="text-quench-cyan size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{title}</span>
                <span className="text-muted-foreground block truncate text-[11px]">{sub}</span>
              </span>
              <ChevronRight className="text-muted-foreground size-4 lg:hidden" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
