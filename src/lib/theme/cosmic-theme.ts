export type CosmicThemeId =
  | "deep-space"
  | "nebula"
  | "galaxy"
  | "aurora-space"
  | "solar-flare"
  | "void"
  | "quantum"
  | "cosmic-ocean"
  | "supernova"
  | "stellar";

export interface CosmicThemeMeta {
  id: CosmicThemeId;
  name: string;
  tagline: string;
  feeling: string;
  atmosphere: string;
  accents: [string, string];
  accentLabels: string;
  previewGradient: string;
  glowColor: string;
  badge: string;
}

export const COSMIC_THEMES: CosmicThemeMeta[] = [
  {
    id: "deep-space",
    name: "Deep Space",
    tagline: "Minimal & Professional",
    feeling: "Minimal · Professional · Premium · Deep space",
    atmosphere:
      "Deep empty space with sparse twinkling stars, subtle navy mist, and electric blue/cyan ambient glow.",
    accents: ["#0099ff", "#00f0ff"],
    accentLabels: "Electric Blue + Cyan",
    previewGradient:
      "radial-gradient(ellipse at bottom left, rgba(0, 153, 255, 0.45), transparent 70%), linear-gradient(135deg, #01040a 0%, #031124 100%)",
    glowColor: "rgba(0, 240, 255, 0.4)",
    badge: "DEFAULT",
  },
  {
    id: "nebula",
    name: "Nebula",
    tagline: "Interstellar Clouds",
    feeling: "Expansive · Ethereal · Atmospheric · Luminous",
    atmosphere:
      "Colorful interstellar nebula clouds with deep violet, blue, magenta, and slow-moving cosmic stardust.",
    accents: ["#a855f7", "#06b6d4"],
    accentLabels: "Purple + Cyan",
    previewGradient:
      "radial-gradient(ellipse at top right, rgba(168, 85, 247, 0.45), transparent 60%), radial-gradient(ellipse at bottom left, rgba(6, 182, 212, 0.35), transparent 60%), linear-gradient(135deg, #06020f 0%, #150624 100%)",
    glowColor: "rgba(168, 85, 247, 0.45)",
    badge: "ETHREAL",
  },
  {
    id: "galaxy",
    name: "Galaxy",
    tagline: "Spiral Celestial Disk",
    feeling: "Majestic · Centered · Deep · Balanced",
    atmosphere:
      "A massive spiral galaxy viewed from space with radiant blue/purple core glow, star dust lanes, and soft radial lighting.",
    accents: ["#3b82f6", "#8b5cf6"],
    accentLabels: "Blue + Violet",
    previewGradient:
      "radial-gradient(circle at center, rgba(139, 92, 246, 0.45) 0%, rgba(59, 130, 246, 0.25) 45%, transparent 70%), linear-gradient(135deg, #02030d 0%, #080b21 100%)",
    glowColor: "rgba(139, 92, 246, 0.45)",
    badge: "CELESTIAL",
  },
  {
    id: "aurora-space",
    name: "Aurora Space",
    tagline: "Cosmic Polar Lights",
    feeling: "Flowing · Serene · Organic · Vibrant",
    atmosphere:
      "Flowing ribbons of cyan and emerald green cosmic northern lights drifting smoothly across deep space.",
    accents: ["#06b6d4", "#10b981"],
    accentLabels: "Cyan + Emerald",
    previewGradient:
      "linear-gradient(120deg, rgba(16, 185, 129, 0.4) 0%, rgba(6, 182, 212, 0.35) 50%, transparent 85%), linear-gradient(135deg, #010808 0%, #021714 100%)",
    glowColor: "rgba(16, 185, 129, 0.45)",
    badge: "AURORAL",
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    tagline: "Stellar Corona Energy",
    feeling: "Warm · Magnetic · High-Energy · Golden",
    atmosphere:
      "Near a powerful star with solar flare ambient coronal gradients, magnetic plasma arcs, and subtle glowing particles.",
    accents: ["#f97316", "#eab308"],
    accentLabels: "Orange + Gold",
    previewGradient:
      "radial-gradient(circle at bottom right, rgba(249, 115, 22, 0.45) 0%, rgba(234, 179, 8, 0.25) 50%, transparent 75%), linear-gradient(135deg, #080302 0%, #1c0803 100%)",
    glowColor: "rgba(249, 115, 22, 0.45)",
    badge: "STELLAR",
  },
  {
    id: "void",
    name: "Void",
    tagline: "Gravitational Horizon",
    feeling: "Ultra-Minimal · Stealth · Quiet · Focused",
    atmosphere:
      "Mysterious cosmic void with pure dark vacuum, subtle event-horizon gravitational distortion, and faint violet shimmer.",
    accents: ["#8b5cf6", "#6d28d9"],
    accentLabels: "Deep Violet",
    previewGradient:
      "radial-gradient(circle at center, rgba(124, 58, 237, 0.22) 0%, transparent 60%), linear-gradient(135deg, #000002 0%, #080512 100%)",
    glowColor: "rgba(124, 58, 237, 0.35)",
    badge: "STEALTH",
  },
  {
    id: "quantum",
    name: "Quantum",
    tagline: "Lattice Energy Nodes",
    feeling: "High-Tech · Analytical · Intelligent · Futuristic",
    atmosphere:
      "Abstract futuristic quantum space with fine energy lines, interconnected nodes, and pulsing quantum flux.",
    accents: ["#00f0ff", "#9333ea"],
    accentLabels: "Cyan + Violet",
    previewGradient:
      "linear-gradient(135deg, rgba(0, 240, 255, 0.3) 0%, rgba(147, 51, 234, 0.3) 100%), linear-gradient(135deg, #020612 0%, #0c0824 100%)",
    glowColor: "rgba(0, 240, 255, 0.45)",
    badge: "QUANTUM",
  },
  {
    id: "cosmic-ocean",
    name: "Cosmic Ocean",
    tagline: "Bioluminescent Abyss",
    feeling: "Fluid · Oceanic · Deep · Calming",
    atmosphere:
      "Deep space mixed with an ocean-like fluid realm, featuring wave-like light surges and buoyant bioluminescent stardust.",
    accents: ["#22d3ee", "#14b8a6"],
    accentLabels: "Cyan + Teal",
    previewGradient:
      "linear-gradient(160deg, rgba(20, 184, 166, 0.35) 0%, rgba(34, 211, 238, 0.3) 60%, transparent 90%), linear-gradient(135deg, #010a14 0%, #031c29 100%)",
    glowColor: "rgba(34, 211, 238, 0.4)",
    badge: "OCEANIC",
  },
  {
    id: "supernova",
    name: "Supernova",
    tagline: "Radiant Starburst Glow",
    feeling: "Cinematic · Explosive · Radiant · Brilliant",
    atmosphere:
      "A distant supernova explosion with radial starburst glow, violet/pink hues, starlight spikes, and outward drifting ejecta.",
    accents: ["#a855f7", "#38bdf8"],
    accentLabels: "Violet + Blue",
    previewGradient:
      "radial-gradient(circle at center, rgba(244, 63, 94, 0.35) 0%, rgba(168, 85, 247, 0.3) 40%, transparent 75%), linear-gradient(135deg, #05020a 0%, #1b071a 100%)",
    glowColor: "rgba(244, 63, 94, 0.45)",
    badge: "RADIANT",
  },
  {
    id: "stellar",
    name: "Stellar",
    tagline: "Observatory & Constellations",
    feeling: "Precision · Academic · Clean · Pristine",
    atmosphere:
      "A clean astronomical observatory looking into the cosmos with thin constellation lines and crisp white/ice-blue starlight.",
    accents: ["#93c5fd", "#f8fafc"],
    accentLabels: "Ice Blue + White",
    previewGradient:
      "radial-gradient(ellipse at top, rgba(147, 197, 253, 0.3) 0%, transparent 65%), linear-gradient(135deg, #06080d 0%, #0d131f 100%)",
    glowColor: "rgba(147, 197, 253, 0.38)",
    badge: "OBSERVATORY",
  },
];

export const THEME_STORAGE_KEY = "bravura_cosmic_theme";
export const DEFAULT_THEME_ID: CosmicThemeId = "deep-space";

export function getStoredCosmicTheme(): CosmicThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && COSMIC_THEMES.some((t) => t.id === stored)) {
      return stored as CosmicThemeId;
    }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_THEME_ID;
}

export function applyCosmicThemeToDOM(themeId: CosmicThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-cosmic-theme", themeId);
}
