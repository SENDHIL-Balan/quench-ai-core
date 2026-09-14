import { cn } from "@/lib/utils";

export function QuenchOrb({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block size-9 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      aria-hidden="true"
    >
      <span className="bg-gradient-brand absolute inset-0 rounded-full opacity-90" />
      <span
        className="absolute -inset-1/3 rounded-full opacity-80 blur-[2px]"
        style={{
          background:
            "conic-gradient(from 210deg, var(--quench-blue), var(--quench-green), var(--quench-cyan), var(--quench-blue))",
          animation: "quench-orb-spin 14s linear infinite",
        }}
      />
      <span
        className="absolute inset-[18%] rounded-full opacity-90"
        style={{
          background:
            "radial-gradient(circle at 30% 28%, oklch(0.98 0.02 200 / 70%), transparent 55%), radial-gradient(circle at 70% 75%, var(--quench-blue), transparent 60%)",
        }}
      />
      <span className="ring-foreground/20 absolute inset-0 rounded-full ring-1 ring-inset" />
    </span>
  );
}
