import { QuenchOrb } from "./QuenchOrb";
import { cn } from "@/lib/utils";

export interface BravuraTypingIndicatorProps {
  className?: string;
}

export function BravuraTypingIndicator({ className }: BravuraTypingIndicatorProps) {
  return (
    <div
      id="bravura-typing-indicator"
      role="status"
      aria-live="polite"
      aria-label="Bravura is typing"
      className={cn(
        "flex items-center gap-3 min-w-0 transition-opacity animate-in fade-in duration-300",
        className,
      )}
    >
      <div className="relative shrink-0">
        <QuenchOrb className="size-8 rounded-full object-cover ring-1 ring-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]" />
        <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-cyan-500 ring-1 ring-background" />
        </span>
      </div>

      <div className="glass-panel flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-3.5 py-2.5 shadow-xl backdrop-blur-xl">
        <span className="text-sm font-medium text-white/85 tracking-tight">
          Bravura is typing<span className="tracking-widest">...</span>
        </span>

        {/* Staggered bouncing typing dots */}
        <div className="flex items-center gap-1 pl-0.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-cyan-400 bravura-typing-dot-1" />
          <span className="size-1.5 rounded-full bg-cyan-300 bravura-typing-dot-2" />
          <span className="size-1.5 rounded-full bg-emerald-400 bravura-typing-dot-3" />
        </div>
      </div>
    </div>
  );
}
