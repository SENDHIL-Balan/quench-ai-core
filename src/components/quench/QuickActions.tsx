import { ChevronRight, Sparkles, FileText } from "lucide-react";

interface QuickActionsProps {
  onPick?: (prompt: string, submit: boolean) => void;
  onOpenImageStudio?: () => void;
  onOpenPdfStudio?: () => void;
}

export function QuickActions({ onOpenImageStudio, onOpenPdfStudio }: QuickActionsProps) {
  return (
    <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2.5 sm:gap-3 relative z-10">
      {/* Generative AI Studios Quick Bars */}
      {(onOpenImageStudio || onOpenPdfStudio) && (
        <div className="grid w-full min-w-0 max-w-full gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2">
          {onOpenImageStudio && (
            <button
              type="button"
              onClick={onOpenImageStudio}
              className="glass-panel group hover:border-cyan-400/50 flex items-center gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-3.5 text-left transition-all hover:bg-cyan-500/10 cursor-pointer min-w-0 w-full overflow-hidden"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30">
                <Sparkles className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-semibold text-white truncate">AI Image Studio</span>
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300 truncate shrink-0 max-w-[140px] sm:max-w-none">
                    gemini-3.1-flash-image
                  </span>
                </div>
                <span className="text-muted-foreground block truncate text-xs">
                  Create & edit high-res images with prompt controls
                </span>
              </div>
              <ChevronRight className="text-muted-foreground size-4 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          )}

          {onOpenPdfStudio && (
            <button
              type="button"
              onClick={onOpenPdfStudio}
              className="glass-panel group hover:border-emerald-400/50 flex items-center gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-3.5 text-left transition-all hover:bg-emerald-500/10 cursor-pointer min-w-0 w-full overflow-hidden"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-semibold text-white truncate">
                    AI PDF Document Studio
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 truncate shrink-0">
                    Prompt to PDF
                  </span>
                </div>
                <span className="text-muted-foreground block truncate text-xs">
                  Generate and download formatted PDF documents
                </span>
              </div>
              <ChevronRight className="text-muted-foreground size-4 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Standard Prompt Shortcuts removed - integrated into + toggle and active mode chip */}
    </div>
  );
}
