import { useEffect, useRef } from "react";

interface FluidVoiceOrbProps {
  state: "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "error";
  volumeLevel: number;
  frequencyData?: Uint8Array | null;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export function FluidVoiceOrb({
  state,
  volumeLevel,
  frequencyData,
  size = 180,
  onClick,
  className = "",
}: FluidVoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      timeRef.current += state === "thinking" ? 0.045 : state === "speaking" ? 0.035 : 0.02;
      const t = timeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.32;

      // Extract frequency factor
      let freqBonus = 0;
      if (frequencyData && frequencyData.length > 0) {
        let sum = 0;
        const count = Math.min(32, frequencyData.length);
        for (let i = 0; i < count; i++) {
          sum += frequencyData[i];
        }
        freqBonus = sum / (count * 255);
      }

      const activeAmp =
        state === "speaking"
          ? 0.35 + Math.sin(t * 3) * 0.12
          : state === "listening"
            ? Math.max(volumeLevel * 0.8, freqBonus * 0.6)
            : state === "thinking"
              ? 0.25
              : 0.05;

      // Outer ambient glow ring
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.5,
        centerX,
        centerY,
        baseRadius * 1.55 + activeAmp * 25,
      );

      if (state === "speaking") {
        glowGradient.addColorStop(0, "rgba(59, 130, 246, 0.45)");
        glowGradient.addColorStop(0.5, "rgba(99, 102, 241, 0.25)");
        glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (state === "listening") {
        glowGradient.addColorStop(0, "rgba(6, 182, 212, 0.4)");
        glowGradient.addColorStop(0.5, "rgba(59, 130, 246, 0.2)");
        glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (state === "thinking") {
        glowGradient.addColorStop(0, "rgba(168, 85, 247, 0.45)");
        glowGradient.addColorStop(0.5, "rgba(59, 130, 246, 0.2)");
        glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glowGradient.addColorStop(0, "rgba(59, 130, 246, 0.2)");
        glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.6 + activeAmp * 25, 0, Math.PI * 2);
      ctx.fill();

      // Rippling wave rings when actively speaking or listening
      if (state === "listening" || state === "speaking") {
        const rippleCount = 2;
        for (let r = 0; r < rippleCount; r++) {
          const ripplePhase = (t * 0.8 + r * 0.5) % 1;
          const rippleRadius = baseRadius + ripplePhase * baseRadius * 0.75;
          const rippleAlpha = (1 - ripplePhase) * (0.2 + activeAmp * 0.35);

          ctx.strokeStyle =
            state === "listening"
              ? `rgba(34, 211, 238, ${rippleAlpha})`
              : `rgba(99, 102, 241, ${rippleAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw the organic morphing fluid orb path
      const points = 72;
      ctx.beginPath();

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;

        // Multi-octave harmonic fluid distortions
        const w1 = Math.sin(angle * 3 + t * 1.8) * (baseRadius * 0.08 * (1 + activeAmp * 1.8));
        const w2 = Math.cos(angle * 5 - t * 2.2) * (baseRadius * 0.05 * (1 + activeAmp * 1.5));
        const w3 = Math.sin(angle * 7 + t * 3.1) * (baseRadius * 0.03 * (1 + activeAmp * 2.2));

        const r = baseRadius * (1 + activeAmp * 0.2) + w1 + w2 + w3;

        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();

      // Fluid orb interior gradient
      const fluidGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.15 * Math.cos(t),
        centerY - baseRadius * 0.25 * Math.sin(t),
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius * 1.15,
      );

      if (state === "speaking") {
        // Vibrant energetic blue & indigo with white-hot core
        fluidGrad.addColorStop(0, "#ffffff");
        fluidGrad.addColorStop(0.25, "#60a5fa");
        fluidGrad.addColorStop(0.6, "#3b82f6");
        fluidGrad.addColorStop(0.85, "#4338ca");
        fluidGrad.addColorStop(1, "#1e1b4b");
      } else if (state === "listening") {
        // Cyan-to-blue fluid with soft glowing core
        fluidGrad.addColorStop(0, "#ffffff");
        fluidGrad.addColorStop(0.2, "#a5f3fc");
        fluidGrad.addColorStop(0.5, "#38bdf8");
        fluidGrad.addColorStop(0.8, "#2563eb");
        fluidGrad.addColorStop(1, "#1d4ed8");
      } else if (state === "thinking") {
        // Cosmic violet and electric indigo swirl
        fluidGrad.addColorStop(0, "#ffffff");
        fluidGrad.addColorStop(0.25, "#e9d5ff");
        fluidGrad.addColorStop(0.55, "#a855f7");
        fluidGrad.addColorStop(0.85, "#6366f1");
        fluidGrad.addColorStop(1, "#312e81");
      } else {
        // Relaxed deep indigo with soft cyan sheen
        fluidGrad.addColorStop(0, "#e0f2fe");
        fluidGrad.addColorStop(0.35, "#38bdf8");
        fluidGrad.addColorStop(0.75, "#1d4ed8");
        fluidGrad.addColorStop(1, "#0f172a");
      }

      ctx.fillStyle = fluidGrad;
      ctx.fill();

      // Inner liquid highlight reflection curve
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY - baseRadius * 0.22,
        baseRadius * 0.55 * (1 + Math.sin(t * 1.2) * 0.08),
        baseRadius * 0.28,
        0,
        0,
        Math.PI * 2,
      );
      const highlightGrad = ctx.createLinearGradient(
        centerX,
        centerY - baseRadius * 0.5,
        centerX,
        centerY + baseRadius * 0.1,
      );
      highlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.75)");
      highlightGrad.addColorStop(0.6, "rgba(255, 255, 255, 0.15)");
      highlightGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = highlightGrad;
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, volumeLevel, frequencyData, size]);

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group focus:outline-none ${className}`}
      style={{ width: size, height: size }}
      title={
        state === "speaking"
          ? "Tap orb to interrupt AI"
          : state === "listening"
            ? "Listening to you... Speak now"
            : "Tap orb to speak"
      }
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="transition-transform duration-300 group-hover:scale-105 active:scale-95"
      />
    </div>
  );
}
