import { useEffect, useRef } from "react";
import { type CosmicThemeId, COSMIC_THEMES } from "@/lib/theme/cosmic-theme";
import { useCosmicTheme } from "@/lib/theme/CosmicThemeContext";

interface CosmicBackgroundProps {
  theme?: CosmicThemeId;
}

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  speed: number;
  phase: number;
  color?: string;
};

type QuantumNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

type NebulaCloud = {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  driftX: number;
  driftY: number;
  phase: number;
};

const MAX_DPR = 2;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function CosmicBackground({ theme: themeProp }: CosmicBackgroundProps) {
  const { theme: contextTheme } = useCosmicTheme();
  const currentTheme = themeProp || contextTheme || "deep-space";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion = prefersReducedMotion();
    const mobile = isMobileViewport();
    const random = seededRandom(1337 + currentTheme.length * 99);

    // Initialize stars tailored to current theme
    const starCount =
      currentTheme === "void"
        ? mobile
          ? 20
          : 35
        : currentTheme === "stellar" || currentTheme === "galaxy"
          ? mobile
            ? 90
            : 160
          : mobile
            ? 45
            : 85;

    const stars: Star[] = Array.from({ length: starCount }, () => {
      const isBright = random() > 0.9;
      return {
        x: random(),
        y: random(),
        radius: isBright ? 1.2 + random() * 0.9 : 0.4 + random() * 0.75,
        alpha: 0.2 + random() * 0.6,
        baseAlpha: 0.2 + random() * 0.6,
        speed: 0.2 + random() * 0.8,
        phase: random() * Math.PI * 2,
      };
    });

    // Quantum nodes setup
    const nodeCount = mobile ? 22 : 44;
    const quantumNodes: QuantumNode[] = Array.from({ length: nodeCount }, () => ({
      x: random(),
      y: random(),
      vx: (random() - 0.5) * 0.00015,
      vy: (random() - 0.5) * 0.00015,
      radius: 1.5 + random() * 1.5,
      color: random() > 0.45 ? "0, 240, 255" : "168, 85, 247",
    }));

    // Nebula clouds setup
    const cloudCount = 6;
    const nebulaColors =
      currentTheme === "nebula"
        ? ["168, 85, 247", "236, 72, 153", "6, 182, 212", "59, 130, 246"]
        : currentTheme === "supernova"
          ? ["244, 63, 94", "168, 85, 247", "56, 189, 248", "255, 255, 255"]
          : ["59, 130, 246", "6, 182, 212", "16, 185, 129", "139, 92, 246"];

    const nebulaClouds: NebulaCloud[] = Array.from({ length: cloudCount }, (_, i) => ({
      x: 0.15 + random() * 0.7,
      y: 0.15 + random() * 0.7,
      radius: 0.22 + random() * 0.28,
      color: nebulaColors[i % nebulaColors.length],
      alpha: 0.08 + random() * 0.07,
      driftX: (random() - 0.5) * 0.003,
      driftY: (random() - 0.5) * 0.003,
      phase: random() * Math.PI * 2,
    }));

    // Constellations for Stellar theme
    const constellationPoints = [
      [0.2, 0.22],
      [0.28, 0.18],
      [0.36, 0.25],
      [0.45, 0.2],
      [0.7, 0.3],
      [0.78, 0.35],
      [0.85, 0.28],
      [0.8, 0.45],
      [0.65, 0.65],
      [0.72, 0.72],
      [0.79, 0.68],
      [0.25, 0.7],
      [0.32, 0.78],
      [0.4, 0.73],
    ];

    let width = 1;
    let height = 1;
    let frameId = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // DRAW FUNCTIONS FOR SPECIFIC THEMES
    const drawThemeBackground = (time: number) => {
      ctx.save();

      if (currentTheme === "deep-space") {
        // Deep Space: Minimal dark navy with electric blue and cyan edge ambiance
        ctx.globalCompositeOperation = "lighter";
        const g1 = ctx.createRadialGradient(
          width * 0.1,
          height * 0.15,
          0,
          width * 0.1,
          height * 0.15,
          width * 0.55,
        );
        g1.addColorStop(0, "rgba(0, 153, 255, 0.09)");
        g1.addColorStop(0.5, "rgba(0, 240, 255, 0.03)");
        g1.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        const g2 = ctx.createRadialGradient(
          width * 0.85,
          height * 0.85,
          0,
          width * 0.85,
          height * 0.85,
          width * 0.6,
        );
        g2.addColorStop(0, "rgba(0, 102, 255, 0.08)");
        g2.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
      } else if (currentTheme === "nebula") {
        // Nebula: Rich cosmic gas clouds drifting and breathing softly
        ctx.globalCompositeOperation = "screen";
        for (const cloud of nebulaClouds) {
          const drift = reducedMotion ? 0 : Math.sin(time * 0.12 + cloud.phase) * 0.03;
          const cx = (cloud.x + drift) * width;
          const cy = (cloud.y + drift * 0.8) * height;
          const cr = cloud.radius * Math.min(width, height);
          const pulse = reducedMotion ? 1 : 0.88 + Math.sin(time * 0.2 + cloud.phase) * 0.12;

          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
          grad.addColorStop(0, `rgba(${cloud.color}, ${cloud.alpha * pulse * 1.4})`);
          grad.addColorStop(0.45, `rgba(${cloud.color}, ${cloud.alpha * pulse * 0.5})`);
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
        }
      } else if (currentTheme === "galaxy") {
        // Galaxy: Celestial spiral core with soft rotating disc lighting
        ctx.globalCompositeOperation = "lighter";
        const cx = width * 0.5;
        const cy = height * 0.46;
        const rot = reducedMotion ? 0.3 : time * 0.015;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // Elliptical galactic core
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.min(width, height) * 0.42);
        coreGrad.addColorStop(0, "rgba(168, 85, 247, 0.18)");
        coreGrad.addColorStop(0.25, "rgba(59, 130, 246, 0.11)");
        coreGrad.addColorStop(0.6, "rgba(139, 92, 246, 0.04)");
        coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.scale(1.4, 0.7);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(width, height) * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (currentTheme === "aurora-space") {
        // Aurora Space: Undulating luminous northern lights ribbons in space
        ctx.globalCompositeOperation = "screen";
        const ribbons = [
          { yBase: 0.28, color: "16, 185, 129", amp: 38, speed: 0.25, widthScale: 1.2 },
          { yBase: 0.38, color: "6, 182, 212", amp: 48, speed: 0.2, widthScale: 1.5 },
          { yBase: 0.46, color: "56, 189, 248", amp: 32, speed: 0.18, widthScale: 1.0 },
        ];

        for (const r of ribbons) {
          ctx.beginPath();
          ctx.moveTo(0, height * r.yBase);
          for (let x = 0; x <= width; x += 25) {
            const wave1 = Math.sin(x * 0.003 + time * r.speed) * r.amp;
            const wave2 = Math.sin(x * 0.007 - time * r.speed * 0.7) * (r.amp * 0.4);
            const y = height * r.yBase + (reducedMotion ? 0 : wave1 + wave2);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();

          const grad = ctx.createLinearGradient(
            0,
            height * (r.yBase - 0.15),
            0,
            height * (r.yBase + 0.35),
          );
          grad.addColorStop(0, "rgba(0, 0, 0, 0)");
          grad.addColorStop(0.3, `rgba(${r.color}, 0.085)`);
          grad.addColorStop(0.7, `rgba(${r.color}, 0.035)`);
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = grad;
          ctx.fill();
        }
      } else if (currentTheme === "solar-flare") {
        // Solar Flare: Powerful star coronal aura & magnetic plasma arcs
        ctx.globalCompositeOperation = "lighter";
        const cx = width * 0.88;
        const cy = height * 0.18;
        const radius = Math.min(width, height) * 0.65;

        const pulse = reducedMotion ? 1 : 0.94 + Math.sin(time * 0.35) * 0.06;
        const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * pulse);
        sunGrad.addColorStop(0, "rgba(254, 240, 138, 0.24)");
        sunGrad.addColorStop(0.18, "rgba(249, 115, 22, 0.16)");
        sunGrad.addColorStop(0.48, "rgba(220, 38, 38, 0.07)");
        sunGrad.addColorStop(0.85, "rgba(234, 179, 8, 0.02)");
        sunGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Solar flare magnetic prominence arc
        ctx.save();
        ctx.strokeStyle = "rgba(251, 146, 60, 0.18)";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(249, 115, 22, 0.5)";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        const arcPhase = reducedMotion ? 0 : Math.sin(time * 0.2) * 12;
        ctx.arc(cx, cy, radius * 0.42 + arcPhase, Math.PI * 0.65, Math.PI * 1.15);
        ctx.stroke();
        ctx.restore();
      } else if (currentTheme === "void") {
        // Void: Pure black vacuum with gravitational lensing ring
        ctx.globalCompositeOperation = "lighter";
        const cx = width * 0.5;
        const cy = height * 0.5;
        const ringR = Math.min(width, height) * 0.28;

        const pulse = reducedMotion ? 1 : 0.96 + Math.sin(time * 0.25) * 0.04;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, ringR * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(139, 92, 246, 0.09)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(124, 58, 237, 0.35)";
        ctx.shadowBlur = 24;
        ctx.stroke();

        // Gravitational dark core
        const voidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringR * 1.6);
        voidGrad.addColorStop(0, "rgba(0, 0, 0, 0.85)");
        voidGrad.addColorStop(0.7, "rgba(10, 5, 20, 0.12)");
        voidGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = voidGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (currentTheme === "quantum") {
        // Quantum: Energy lines and interconnected lattice nodes
        ctx.globalCompositeOperation = "lighter";
        const maxDist = mobile ? 85 : 120;

        for (let i = 0; i < quantumNodes.length; i++) {
          const n1 = quantumNodes[i];
          if (!reducedMotion) {
            n1.x += n1.vx;
            n1.y += n1.vy;
            if (n1.x < 0 || n1.x > 1) n1.vx *= -1;
            if (n1.y < 0 || n1.y > 1) n1.vy *= -1;
          }

          const px1 = n1.x * width;
          const py1 = n1.y * height;

          // Connect nearby nodes
          for (let j = i + 1; j < quantumNodes.length; j++) {
            const n2 = quantumNodes[j];
            const px2 = n2.x * width;
            const py2 = n2.y * height;
            const dx = px1 - px2;
            const dy = py1 - py2;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.18;
              ctx.beginPath();
              ctx.moveTo(px1, py1);
              ctx.lineTo(px2, py2);
              ctx.strokeStyle = `rgba(${n1.color}, ${alpha})`;
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }
          }

          // Node point
          ctx.beginPath();
          ctx.arc(px1, py1, n1.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${n1.color}, 0.45)`;
          ctx.shadowColor = `rgba(${n1.color}, 0.8)`;
          ctx.shadowBlur = 8;
          ctx.fill();
        }
      } else if (currentTheme === "cosmic-ocean") {
        // Cosmic Ocean: Gentle fluid bioluminescent oceanic waves
        ctx.globalCompositeOperation = "screen";
        const waves = [
          { y: 0.65, color: "20, 184, 166", amp: 35, speed: 0.3 },
          { y: 0.78, color: "6, 182, 212", amp: 42, speed: 0.22 },
          { y: 0.88, color: "34, 211, 238", amp: 28, speed: 0.26 },
        ];

        for (const w of waves) {
          ctx.beginPath();
          ctx.moveTo(0, height * w.y);
          for (let x = 0; x <= width; x += 20) {
            const dy = Math.sin(x * 0.004 + time * w.speed) * w.amp;
            ctx.lineTo(x, height * w.y + (reducedMotion ? 0 : dy));
          }
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();

          const wGrad = ctx.createLinearGradient(0, height * (w.y - 0.1), 0, height);
          wGrad.addColorStop(0, `rgba(${w.color}, 0.065)`);
          wGrad.addColorStop(0.5, `rgba(${w.color}, 0.035)`);
          wGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = wGrad;
          ctx.fill();
        }
      } else if (currentTheme === "supernova") {
        // Supernova: Stellar remnant core, starlight spikes, shockwave
        ctx.globalCompositeOperation = "lighter";
        const cx = width * 0.52;
        const cy = height * 0.42;
        const pulse = reducedMotion ? 1 : 0.95 + Math.sin(time * 0.4) * 0.08;

        // Shockwave ring
        const ringR =
          Math.min(width, height) * 0.35 * (reducedMotion ? 1 : 0.85 + ((time * 0.04) % 0.4));
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(244, 63, 94, 0.12)";
        ctx.lineWidth = 1.75;
        ctx.shadowColor = "rgba(168, 85, 247, 0.4)";
        ctx.shadowBlur = 15;
        ctx.stroke();

        // 4-point diffraction spike
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1;
        const spikeLen = Math.min(width, height) * 0.22 * pulse;
        ctx.beginPath();
        ctx.moveTo(cx - spikeLen, cy);
        ctx.lineTo(cx + spikeLen, cy);
        ctx.moveTo(cx, cy - spikeLen);
        ctx.lineTo(cx, cy + spikeLen);
        ctx.stroke();
        ctx.restore();

        // Central core
        const coreGrad = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          Math.min(width, height) * 0.28,
        );
        coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
        coreGrad.addColorStop(0.2, "rgba(244, 63, 94, 0.18)");
        coreGrad.addColorStop(0.55, "rgba(168, 85, 247, 0.08)");
        coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(width, height) * 0.28, 0, Math.PI * 2);
        ctx.fill();
      } else if (currentTheme === "stellar") {
        // Stellar: Observatory constellation lines and celestial grid
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(147, 197, 253, 0.12)";
        ctx.lineWidth = 0.9;

        // Draw constellation lines
        ctx.beginPath();
        for (let i = 0; i < constellationPoints.length - 1; i++) {
          if (i === 3 || i === 7 || i === 10) continue; // separate constellation figures
          const [x1, y1] = constellationPoints[i];
          const [x2, y2] = constellationPoints[i + 1];
          ctx.moveTo(x1 * width, y1 * height);
          ctx.lineTo(x2 * width, y2 * height);
        }
        ctx.stroke();

        // Constellation nodes
        for (const [x, y] of constellationPoints) {
          ctx.beginPath();
          ctx.arc(x * width, y * height, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(224, 242, 254, 0.65)";
          ctx.shadowColor = "rgba(147, 197, 253, 0.9)";
          ctx.shadowBlur = 10;
          ctx.fill();
        }
      }

      ctx.restore();
    };

    // DRAW STARS & PARTICLES
    const drawParticles = (time: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const colorMap: Record<CosmicThemeId, string> = {
        "deep-space": "0, 240, 255",
        nebula: "192, 132, 252",
        galaxy: "129, 140, 248",
        "aurora-space": "52, 211, 153",
        "solar-flare": "251, 191, 36",
        void: "167, 139, 250",
        quantum: "0, 240, 255",
        "cosmic-ocean": "34, 211, 238",
        supernova: "244, 114, 182",
        stellar: "186, 230, 253",
      };

      const particleColor = colorMap[currentTheme] || "0, 240, 255";

      for (const star of stars) {
        // Twinkle factor
        const twinkle = reducedMotion ? 1 : 0.68 + Math.sin(time * star.speed + star.phase) * 0.32;
        const currentAlpha = Math.max(0.05, star.baseAlpha * twinkle);

        const px = star.x * width;
        const py = star.y * height;

        ctx.fillStyle = `rgba(${particleColor}, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow on larger stars
        if (star.radius > 1.2) {
          ctx.fillStyle = `rgba(${particleColor}, ${currentAlpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(px, py, star.radius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const time = now / 1000;
      ctx.clearRect(0, 0, width, height);

      drawThemeBackground(time);
      drawParticles(time);

      if (!reducedMotion) {
        frameId = requestAnimationFrame(render);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!running) {
        running = true;
        frameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    frameId = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [currentTheme]);

  const activeMeta = COSMIC_THEMES.find((t) => t.id === currentTheme) || COSMIC_THEMES[0];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-colors duration-700"
      aria-hidden="true"
    >
      {/* Theme base gradient canvas */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: activeMeta.previewGradient,
          opacity: 0.95,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" style={{ display: "block" }} />
      {/* Vignette depth gradient to preserve central contrast */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 45%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.42) 70%, rgba(0, 0, 0, 0.85) 100%)",
        }}
      />
    </div>
  );
}
