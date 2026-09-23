import { useEffect, useRef, useState } from "react";
import { getAudioAnalyser, getAudioContext, isAudioPlaying, voiceQueue } from "@/lib/voice/player";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export interface RealtimeAudioVisualizerProps {
  /** Optional custom AnalyserNode. If omitted, uses the authoritative playback AnalyserNode. */
  analyser?: AnalyserNode | null;
  /** Explicit active override. If omitted, derives from voice queue / audio activity. */
  isActive?: boolean;
  /** Visualizer display style */
  variant?: "bars" | "wave" | "compact";
  /** Height in pixels (default: 48) */
  height?: number;
  /** Number of frequency bars to render in 'bars' or 'compact' mode (default: 32) */
  barCount?: number;
  /** Custom label */
  label?: string;
  /** Show live dB level or volume tag */
  showLevel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function RealtimeAudioVisualizer({
  analyser: customAnalyser,
  isActive: propIsActive,
  variant = "bars",
  height = 48,
  barCount = 32,
  label = "Voice Frequency",
  showLevel = true,
  className,
}: RealtimeAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dbTextRef = useRef<HTMLSpanElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Subscribe to core playback queue state if no custom analyser provided
  useEffect(() => {
    if (customAnalyser) return;
    return voiceQueue.subscribe((state) => {
      setIsPlaying(state === "playing");
    });
  }, [customAnalyser]);

  const active = propIsActive !== undefined ? propIsActive : isPlaying || isAudioPlaying();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const peakBars = new Float32Array(barCount).fill(0);

    const render = () => {
      const targetAnalyser = customAnalyser || getAudioAnalyser();
      const width = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, width, h);

      if (targetAnalyser) {
        const binCount = targetAnalyser.frequencyBinCount;
        const freqData = new Uint8Array(binCount);
        targetAnalyser.getByteFrequencyData(freqData);

        // Calculate average energy / dB without triggering React re-renders
        let sum = 0;
        for (let i = 0; i < binCount; i++) {
          sum += freqData[i];
        }
        const avg = sum / binCount;
        const normalizedVolume = avg / 255;
        const calculatedDb = Math.round(
          normalizedVolume > 0 ? 20 * Math.log10(normalizedVolume) : -60,
        );
        if (dbTextRef.current) {
          dbTextRef.current.textContent = `${Math.max(-60, calculatedDb)} dB`;
        }

        if (variant === "wave") {
          // Smooth illuminated waveform
          const timeData = new Uint8Array(binCount);
          targetAnalyser.getByteTimeDomainData(timeData);

          const gradient = ctx.createLinearGradient(0, 0, width, 0);
          gradient.addColorStop(0, "rgba(56, 189, 248, 0.2)");
          gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.9)");
          gradient.addColorStop(1, "rgba(168, 85, 247, 0.8)");

          ctx.lineWidth = 2.5;
          ctx.strokeStyle = gradient;
          ctx.beginPath();

          const sliceWidth = width / binCount;
          let x = 0;

          for (let i = 0; i < binCount; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * h) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          ctx.stroke();

          // Ambient Glow
          ctx.shadowColor = "rgba(99, 102, 241, 0.4)";
          ctx.shadowBlur = 8;
        } else {
          // Equalizer Frequency Spectrum Bars (bars / compact)
          const barWidth = Math.max(2, Math.floor(width / barCount) - 2);
          const gap = Math.max(1.5, (width - barWidth * barCount) / (barCount - 1));

          // Logarithmic grouping for acoustic fidelity
          const step = Math.floor(binCount / barCount);

          for (let i = 0; i < barCount; i++) {
            let binSum = 0;
            for (let j = 0; j < step; j++) {
              binSum += freqData[i * step + j] || 0;
            }
            const binAvg = binSum / step;
            const targetHeight = Math.max(2, (binAvg / 255) * (h - 4));

            // Smooth peak decay
            if (targetHeight > peakBars[i]) {
              peakBars[i] = targetHeight;
            } else {
              peakBars[i] = Math.max(2, peakBars[i] * 0.92);
            }

            const x = i * (barWidth + gap);
            const y = h - peakBars[i];

            // Neon Gradient based on frequency range
            const barGradient = ctx.createLinearGradient(0, h, 0, y);
            barGradient.addColorStop(0, "rgba(6, 182, 212, 0.9)"); // Cyan
            barGradient.addColorStop(0.5, "rgba(59, 130, 246, 0.95)"); // Blue
            barGradient.addColorStop(1, "rgba(147, 51, 234, 1)"); // Purple/Indigo

            ctx.fillStyle = barGradient;

            // Draw rounded bar
            ctx.beginPath();
            const radius = Math.min(barWidth / 2, 2);
            ctx.roundRect(x, y, barWidth, peakBars[i], [radius, radius, 0, 0]);
            ctx.fill();
          }
        }
      } else {
        // Idle Ambient Pulse
        const now = performance.now() * 0.002;
        const barWidth = Math.max(2, Math.floor(width / barCount) - 2);
        const gap = Math.max(1.5, (width - barWidth * barCount) / (barCount - 1));

        for (let i = 0; i < barCount; i++) {
          const waveHeight = active
            ? Math.sin(now + i * 0.3) * 6 + 10
            : Math.sin(now + i * 0.15) * 2 + 3;
          const x = i * (barWidth + gap);
          const y = h - Math.max(2, waveHeight);

          ctx.fillStyle = active ? "rgba(56, 189, 248, 0.6)" : "rgba(255, 255, 255, 0.12)";
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, waveHeight, [1.5, 1.5, 0, 0]);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [customAnalyser, variant, barCount, active]);

  // Handle Resize for Sharp Canvas DPI
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(100, Math.floor(rect.width * dpr));
      canvas.height = Math.floor(height * dpr);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [height]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col justify-center rounded-xl border border-white/[0.08] bg-black/40 p-2.5 backdrop-blur-md transition-all shadow-inner",
        active && "border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
          <Activity
            className={cn(
              "size-3.5 transition-colors",
              active ? "text-cyan-400 animate-pulse" : "text-white/30",
            )}
          />
          <span className="tracking-wide uppercase text-[10px]">{label}</span>
        </div>

        {showLevel && (
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors",
                active ? "bg-emerald-400 animate-ping" : "bg-white/20",
              )}
            />
            <span ref={dbTextRef} className={active ? "text-cyan-300" : "text-white/40"}>
              {active ? "-60 dB" : "Idle"}
            </span>
          </div>
        )}
      </div>

      <div className="w-full overflow-hidden" style={{ height }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
