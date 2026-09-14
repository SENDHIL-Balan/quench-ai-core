import {
  MessageSquare,
  Search,
  PenLine,
  BarChart3,
  Code2,
  Image as ImageIcon,
  MoreHorizontal,
} from "lucide-react";
import { AGENT_MODES, VISIBLE_MODES, type ModeId } from "@/lib/agent/modes";
import { cn } from "@/lib/utils";

const ICONS: Record<ModeId, typeof MessageSquare> = {
  chat: MessageSquare,
  research: Search,
  create: PenLine,
  analyze: BarChart3,
  code: Code2,
  image: ImageIcon,
  more: MoreHorizontal,
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
    <div className={cn("flex flex-wrap justify-center gap-2 lg:flex-nowrap", className)}>
      {VISIBLE_MODES.map((id) => {
        const Icon = ICONS[id];
        const active = mode === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={AGENT_MODES[id].hint}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all",
              active
                ? "glow-ring border-primary/40 bg-primary/15 text-foreground"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/25",
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            {AGENT_MODES[id].label}
          </button>
        );
      })}
    </div>
  );
}
