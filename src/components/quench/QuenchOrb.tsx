import { cn } from "@/lib/utils";

export function QuenchOrb({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full select-none",
        className || "size-10",
      )}
    >
      {/* Outer ambient glow */}
      {glow && (
        <span
          className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-500/40 via-blue-500/20 to-purple-500/30 blur-md opacity-85 pointer-events-none animate-pulse"
          style={{ animationDuration: "3.5s" }}
          aria-hidden="true"
        />
      )}

      {/* Realistic spherical glass body */}
      <div className="relative size-full overflow-hidden rounded-full ring-1 ring-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.45)]">
        <img
          className="size-full object-cover rounded-full transform transition-transform duration-500 hover:scale-105"
          src="/ai-chat.jpg"
          alt="Bravura AI"
        />
        {/* Top-arc specular lens reflection */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-white/5 to-transparent pointer-events-none"
          style={{ clipPath: "ellipse(80% 45% at 50% 18%)" }}
          aria-hidden="true"
        />
        {/* 3D sphere curvature shadow */}
        <div
          className="absolute inset-0 rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] pointer-events-none"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export const BravuraOrb = QuenchOrb;
