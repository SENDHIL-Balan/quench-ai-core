import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  drift: number;
  phase: number;
};

type Streak = {
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  alpha: number;
  phase: number;
};

const BASE = "#010509";
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

/**
 * The reference scene: a near-black central space,
 * atmospheric colour around the perimeter, and an Earth-like horizon that
 * occupies the lower-left edge.
 */
export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion = prefersReducedMotion();
    const mobile = isMobileViewport();
    const random = seededRandom(90210);
    const particleCount = mobile ? 34 : 72;
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: random(),
      y: random(),
      radius: 0.35 + random() * 1.05,
      alpha: 0.12 + random() * 0.5,
      drift: 0.0015 + random() * 0.006,
      phase: random() * Math.PI * 2,
    }));

    const streaks: Streak[] = [
      {
        startX: -0.08,
        startY: 0.16,
        controlX: 0.08,
        controlY: 0.035,
        endX: 0.29,
        endY: 0.1,
        color: "50, 255, 205",
        width: 1.05,
        alpha: 0.58,
        phase: 0.2,
      },
      {
        startX: 0.57,
        startY: -0.08,
        controlX: 0.74,
        controlY: 0.17,
        endX: 1.08,
        endY: 0.15,
        color: "37, 219, 255",
        width: 1.25,
        alpha: 0.52,
        phase: 1.5,
      },
      {
        startX: 0.73,
        startY: -0.05,
        controlX: 0.83,
        controlY: 0.16,
        endX: 1.05,
        endY: 0.27,
        color: "87, 255, 224",
        width: 0.55,
        alpha: 0.36,
        phase: 2.7,
      },
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

    const drawEdgeGlow = () => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const topLeft = ctx.createRadialGradient(width * 0.04, 0, 0, width * 0.04, 0, width * 0.48);
      topLeft.addColorStop(0, "rgba(11, 237, 170, 0.18)");
      topLeft.addColorStop(0.34, "rgba(11, 146, 164, 0.08)");
      topLeft.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topLeft;
      ctx.fillRect(0, 0, width, height * 0.52);

      const topRight = ctx.createRadialGradient(
        width * 0.92,
        height * 0.02,
        0,
        width * 0.92,
        height * 0.02,
        width * 0.42,
      );
      topRight.addColorStop(0, "rgba(12, 139, 255, 0.16)");
      topRight.addColorStop(0.42, "rgba(0, 106, 183, 0.06)");
      topRight.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topRight;
      ctx.fillRect(0, 0, width, height * 0.56);

      const lowerLeft = ctx.createRadialGradient(
        0,
        height,
        0,
        0,
        height,
        Math.max(width, height) * 0.78,
      );
      lowerLeft.addColorStop(0, "rgba(0, 151, 234, 0.12)");
      lowerLeft.addColorStop(0.45, "rgba(0, 74, 145, 0.055)");
      lowerLeft.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = lowerLeft;
      ctx.fillRect(0, height * 0.42, width, height * 0.58);
      ctx.restore();
    };

    const drawStreaks = (time: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (const streak of streaks) {
        const pulse = reducedMotion ? 1 : 0.82 + Math.sin(time * 0.16 + streak.phase) * 0.18;
        ctx.beginPath();
        ctx.moveTo(streak.startX * width, streak.startY * height);
        ctx.quadraticCurveTo(
          streak.controlX * width,
          streak.controlY * height,
          streak.endX * width,
          streak.endY * height,
        );
        ctx.strokeStyle = `rgba(${streak.color}, ${streak.alpha * pulse})`;
        ctx.lineWidth = streak.width;
        ctx.shadowColor = `rgba(${streak.color}, ${streak.alpha * 0.9})`;
        ctx.shadowBlur = mobile ? 8 : 15;
        ctx.stroke();

        ctx.strokeStyle = `rgba(${streak.color}, ${streak.alpha * 0.18})`;
        ctx.lineWidth = streak.width * 7;
        ctx.shadowBlur = mobile ? 16 : 28;
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawEarthHorizon = () => {
      const radius = Math.max(width * 1.08, height * 1.55);
      const centerX = -width * (mobile ? 0.2 : 0.26);
      const centerY = height + radius * (mobile ? 0.81 : 0.84);

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      const earth = ctx.createLinearGradient(0, height * 0.68, width * 0.66, height);
      earth.addColorStop(0, "#062333");
      earth.addColorStop(0.3, "#03131f");
      earth.addColorStop(0.75, "#01080e");
      earth.addColorStop(1, "#010407");
      ctx.fillStyle = earth;
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

      ctx.globalCompositeOperation = "screen";
      for (let index = 0; index < 10; index += 1) {
        const cloudX = centerX + radius * (-0.13 + index * 0.11);
        const cloudY = height * (0.75 + (index % 3) * 0.055);
        const cloud = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, radius * 0.22);
        cloud.addColorStop(0, `rgba(${index % 2 ? "30, 191, 246" : "32, 228, 207"}, 0.065)`);
        cloud.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = cloud;
        ctx.fillRect(cloudX - radius * 0.22, cloudY - radius * 0.22, radius * 0.44, radius * 0.44);
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const [offset, alpha, lineWidth] of [
        [0, 0.92, 1],
        [3, 0.28, 2.5],
        [8, 0.1, 7],
      ] as const) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + offset, Math.PI * 1.04, Math.PI * 1.62);
        ctx.strokeStyle = `rgba(40, 214, 255, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = "rgba(0, 177, 255, 0.55)";
        ctx.shadowBlur = lineWidth * 4;
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawParticles = (time: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const particle of particles) {
        const drift = reducedMotion ? 0 : Math.sin(time * particle.drift + particle.phase) * 0.008;
        const x = (particle.x + drift) * width;
        const y = particle.y * height;
        const alpha = reducedMotion
          ? particle.alpha
          : particle.alpha * (0.62 + Math.sin(time * 0.65 + particle.phase) * 0.25);
        ctx.fillStyle = `rgba(143, 231, 255, ${Math.max(0.04, alpha)})`;
        ctx.beginPath();
        ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const draw = (now: number) => {
      if (!running) return;
      const time = now / 1000;
      ctx.clearRect(0, 0, width, height);
      drawEdgeGlow();
      drawEarthHorizon();
      drawStreaks(time);
      drawParticles(time);
      frameId = requestAnimationFrame(draw);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!running) {
        running = true;
        frameId = requestAnimationFrame(draw);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    frameId = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: BASE }} />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" style={{ display: "block" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 58% 48% at 50% 43%, rgba(1, 5, 9, 0) 0%, rgba(1, 5, 9, 0.38) 67%, rgba(1, 5, 9, 0.8) 100%)",
        }}
      />
    </div>
  );
}
