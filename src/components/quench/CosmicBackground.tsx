export function CosmicBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="bg-background absolute inset-0" />
      {/* planet limb top-right */}
      <div
        className="absolute -top-[45%] right-[-25%] size-[95vw] rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 35% 65%, oklch(0.45 0.12 220 / 45%), transparent 62%)",
          animation: "quench-drift 26s ease-in-out infinite",
        }}
      />
      {/* green atmosphere sweep */}
      <div
        className="absolute top-[10%] left-[18%] size-[70vw] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.6 0.18 155 / 30%), transparent 60%)",
          animation: "quench-drift 34s ease-in-out infinite reverse",
        }}
      />
      {/* bottom planet curve */}
      <div
        className="absolute -bottom-[70%] -left-[20%] size-[120vw] rounded-full opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, oklch(0.5 0.13 235 / 40%), transparent 55%)",
        }}
      />
      {/* luminous arcs */}
      <svg className="absolute inset-0 size-full opacity-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="quench-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--quench-green)" stopOpacity="0.8" />
            <stop offset="55%" stopColor="var(--quench-cyan)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--quench-blue)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <ellipse
          cx="82%"
          cy="-8%"
          rx="52%"
          ry="46%"
          fill="none"
          stroke="url(#quench-arc)"
          strokeWidth="1.5"
        />
        <ellipse
          cx="12%"
          cy="112%"
          rx="66%"
          ry="42%"
          fill="none"
          stroke="url(#quench-arc)"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, oklch(1 0 0 / 60%), transparent), radial-gradient(1px 1px at 70% 20%, oklch(1 0 0 / 45%), transparent), radial-gradient(1px 1px at 45% 75%, oklch(1 0 0 / 40%), transparent), radial-gradient(1px 1px at 85% 60%, oklch(1 0 0 / 50%), transparent)",
        }}
      />
    </div>
  );
}
