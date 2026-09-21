import {
  MessageSquare,
  Search,
  PenLine,
  BarChart3,
  ListChecks,
  Code2,
  Image as ImageIcon,
} from "lucide-react";
import { AGENT_MODES, VISIBLE_MODES, type ModeId } from "@/lib/agent/modes";
import { cn } from "@/lib/utils";

const ICONS: Record<ModeId, typeof MessageSquare> = {
  chat: MessageSquare,
  research: Search,
  create: PenLine,
  plan: ListChecks,
  analyze: BarChart3,
  code: Code2,
  image: ImageIcon,
};

export function ModeSelector({
  mode,
  onChange,
  className,
}: {
  mode: ModeId;
  onChange: (mode: ModeId) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-full min-w-0 shrink-0 relative z-20 py-1 flex items-center justify-center overflow-x-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full min-w-0 w-full px-1.5 sm:px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap justify-start sm:justify-center touch-pan-x">
        {VISIBLE_MODES.map((id) => {
          const Icon = ICONS[id];
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              title={AGENT_MODES[id].hint}
              className={cn(
                "flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer min-h-[36px] sm:min-h-[40px]",
                active
                  ? "glow-ring border-cyan-400/60 bg-cyan-500/25 text-cyan-200 shadow-md shadow-cyan-500/10 font-semibold"
                  : "border-border bg-card/75 text-muted-foreground hover:text-foreground hover:border-cyan-400/40 hover:bg-card/90",
              )}
            >
              <Icon className={cn("size-3.5 sm:size-4", active && "text-cyan-300")} />
              <span className="whitespace-nowrap">{AGENT_MODES[id].label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
