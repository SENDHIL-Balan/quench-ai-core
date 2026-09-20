<<<<<<< HEAD
import { useState } from "react";
=======
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
import {
  MessageSquare,
  Search,
  PenLine,
  BarChart3,
  Code2,
  Image as ImageIcon,
<<<<<<< HEAD
  ChevronDown,
=======
  MoreHorizontal,
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
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
<<<<<<< HEAD
=======
  more: MoreHorizontal,
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
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
<<<<<<< HEAD
  const [open, setOpen] = useState(false);
  const ActiveIcon = ICONS[mode];

  return (
    <div className={cn("relative flex justify-center", className)}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/25 flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all"
      >
        <ActiveIcon className="text-primary size-4" />
        {AGENT_MODES[mode].label}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="glass-panel absolute top-full z-20 mt-2 min-w-48 rounded-2xl p-2 shadow-xl"
        >
          {VISIBLE_MODES.map((id) => {
            const Icon = ICONS[id];
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                title={AGENT_MODES[id].hint}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                <span className="flex-1">{AGENT_MODES[id].label}</span>
                {active && <span className="text-primary text-xs">Selected</span>}
              </button>
            );
          })}
        </div>
      )}
=======
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
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
    </div>
  );
}
