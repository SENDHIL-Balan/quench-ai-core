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
        <QuenchOrb className="size-8" />
        <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-cyan-500 ring-1 ring-[#080d1a]" />
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-white/[0.13] bg-gradient-to-b from-[#182030]/90 to-[#101422]/95 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
        <span className="text-[13.5px] font-medium text-white/90 tracking-tight">
          Bravura is typing<span className="tracking-widest">...</span>
        </span>

        {/* Staggered bouncing fluid typing dots */}
        <div className="flex items-center gap-1.5 pl-0.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-cyan-400 bravura-typing-dot-1 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
          <span className="size-1.5 rounded-full bg-sky-300 bravura-typing-dot-2 shadow-[0_0_6px_rgba(125,211,252,0.8)]" />
          <span className="size-1.5 rounded-full bg-emerald-400 bravura-typing-dot-3 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        </div>
      </div>
    </div>
  );
}
