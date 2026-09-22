import type { VoiceOption, VoiceProvider } from "./types";

export const VOICE_OPTIONS: VoiceOption[] = [
  // Sarvam AI voices (Bulbul:v3 - High clarity, articulate Indian English)
  {
    id: "kavya",
    name: "Kavya",
    provider: "sarvam",
    description: "Crystal-Clear, Expressive & Melodic Natural Voice",
    gender: "female",
    recommended: true,
  },
  {
    id: "rohan",
    name: "Rohan",
    provider: "sarvam",
    description: "Articulate, Confident & Professional Male Voice",
    gender: "male",
    recommended: true,
  },
  {
    id: "priya",
    name: "Priya",
    provider: "sarvam",
    description: "Warm, Reassuring & Friendly Conversational Tone",
    gender: "female",
    recommended: false,
  },
  {
    id: "rahul",
    name: "Rahul",
    provider: "sarvam",
    description: "Deep, Resonant & Dynamic Articulation",
    gender: "male",
    recommended: false,
  },
  {
    id: "shreya",
    name: "Shreya",
    provider: "sarvam",
    description: "Gentle, Polished & Smooth Acoustic Cadence",
    gender: "female",
    recommended: false,
  },
  {
    id: "ratan",
    name: "Ratan",
    provider: "sarvam",
    description: "Authoritative, Steady & Dignified Timbre",
    gender: "male",
    recommended: false,
  },
  // Deepgram Aura voices (ultra-low latency)
  {
    id: "aura-asteria-en",
    name: "Nikki bella",
    provider: "deepgram",
    description: "Ultra-Fast, Warm & Natural Conversational Flow",
    gender: "female",
    recommended: true,
  },
  {
    id: "aura-orion-en",
    name: "Elon musk",
    provider: "deepgram",
    description: "Confident, Clear & Dynamic Vocal Presence",
    gender: "male",
    recommended: false,
  },
  {
    id: "aura-luna-en",
    name: "Bellie eilish",
    provider: "deepgram",
    description: "Gentle, Friendly & Smooth Acoustic Tone",
    gender: "female",
    recommended: false,
  },
  {
    id: "aura-arcas-en",
    name: "Arcas",
    provider: "deepgram",
    description: "Calm, Steady & Authoritative Voice",
    gender: "male",
    recommended: false,
  },
  // ElevenLabs voices
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "Jeff besos",
    provider: "elevenlabs",
    description: "Warm, Captivating & Engaging Conversational Tone",
    gender: "male",
    recommended: false,
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Shakira",
    provider: "elevenlabs",
    description: "Mature, Reassuring & Confident Tone",
    gender: "female",
    recommended: false,
  },
];

export const VOICE_MAP: Record<string, VoiceOption> = Object.fromEntries(
  VOICE_OPTIONS.map((v) => [v.id, v]),
);

const MALE_VOICE_IDS = new Set<string>([
  "rohan",
  "rahul",
  "ratan",
  "aura-orion-en",
  "aura-arcas-en",
  "JBFqnCBsd6RMkjVDRZzb",
  "CwhRBWXzGAHq8TQ4Fs17",
]);

export function getVoiceGender(voiceId?: string): "male" | "female" {
  if (!voiceId) return "female";
  const normalized = voiceId.trim();
  const option = VOICE_MAP[normalized];
  if (option) return option.gender;

  if (MALE_VOICE_IDS.has(normalized)) return "male";

  const lower = normalized.toLowerCase();
  if (
    lower.includes("male") ||
    lower.includes("rohan") ||
    lower.includes("rahul") ||
    lower.includes("ratan") ||
    lower.includes("orion") ||
    lower.includes("arcas") ||
    lower.includes("elon") ||
    lower.includes("besos") ||
    lower.includes("jeff") ||
    lower.includes("david") ||
    lower.includes("guy")
  ) {
    return "male";
  }

  return "female";
}

export function isMaleVoice(voiceId?: string): boolean {
  return getVoiceGender(voiceId) === "male";
}

export function isFemaleVoice(voiceId?: string): boolean {
  return getVoiceGender(voiceId) === "female";
}

/**
 * Direct voice mappings between providers that preserve exact persona and gender
 */
const VOICE_CROSS_PROVIDER_MAP: Record<
  string,
  { sarvam: string; deepgram: string; elevenlabs: string }
> = {
  // Male personas
  rohan: { sarvam: "rohan", deepgram: "aura-orion-en", elevenlabs: "JBFqnCBsd6RMkjVDRZzb" },
  rahul: { sarvam: "rahul", deepgram: "aura-arcas-en", elevenlabs: "JBFqnCBsd6RMkjVDRZzb" },
  ratan: { sarvam: "ratan", deepgram: "aura-arcas-en", elevenlabs: "JBFqnCBsd6RMkjVDRZzb" },
  "aura-orion-en": {
    sarvam: "rohan",
    deepgram: "aura-orion-en",
    elevenlabs: "JBFqnCBsd6RMkjVDRZzb",
  },
  "aura-arcas-en": {
    sarvam: "ratan",
    deepgram: "aura-arcas-en",
    elevenlabs: "JBFqnCBsd6RMkjVDRZzb",
  },
  JBFqnCBsd6RMkjVDRZzb: {
    sarvam: "rohan",
    deepgram: "aura-orion-en",
    elevenlabs: "JBFqnCBsd6RMkjVDRZzb",
  },
  CwhRBWXzGAHq8TQ4Fs17: {
    sarvam: "ratan",
    deepgram: "aura-arcas-en",
    elevenlabs: "JBFqnCBsd6RMkjVDRZzb",
  },

  // Female personas
  kavya: { sarvam: "kavya", deepgram: "aura-asteria-en", elevenlabs: "EXAVITQu4vr4xnSDxMaL" },
  priya: { sarvam: "priya", deepgram: "aura-luna-en", elevenlabs: "EXAVITQu4vr4xnSDxMaL" },
  shreya: { sarvam: "shreya", deepgram: "aura-luna-en", elevenlabs: "EXAVITQu4vr4xnSDxMaL" },
  "aura-asteria-en": {
    sarvam: "kavya",
    deepgram: "aura-asteria-en",
    elevenlabs: "EXAVITQu4vr4xnSDxMaL",
  },
  "aura-luna-en": {
    sarvam: "shreya",
    deepgram: "aura-luna-en",
    elevenlabs: "EXAVITQu4vr4xnSDxMaL",
  },
  EXAVITQu4vr4xnSDxMaL: {
    sarvam: "kavya",
    deepgram: "aura-asteria-en",
    elevenlabs: "EXAVITQu4vr4xnSDxMaL",
  },
  Xb7hH8MSUJpSbSDYk0k2: {
    sarvam: "shreya",
    deepgram: "aura-luna-en",
    elevenlabs: "EXAVITQu4vr4xnSDxMaL",
  },
};

/**
 * Guaranteed Gender-Preserving Voice Resolver
 * Resolves any voice identifier to an active voice on target provider of the EXACT SAME GENDER.
 * A male voice NEVER falls back to female, and a female voice NEVER falls back to male.
 */
export function resolveVoiceForProvider(
  voiceId: string | undefined,
  targetProvider: "sarvam" | "deepgram" | "elevenlabs",
): string {
  const normalized = (voiceId || "").trim();
  const gender = getVoiceGender(normalized);

  // Check direct persona map
  if (normalized && VOICE_CROSS_PROVIDER_MAP[normalized]) {
    const mapped = VOICE_CROSS_PROVIDER_MAP[normalized][targetProvider];
    if (mapped) return mapped;
  }

  // Fallback by strictly preserved gender
  if (targetProvider === "sarvam") {
    return gender === "male" ? "rohan" : "kavya";
  }
  if (targetProvider === "deepgram") {
    return gender === "male" ? "aura-orion-en" : "aura-asteria-en";
  }
  // ElevenLabs
  return gender === "male" ? "JBFqnCBsd6RMkjVDRZzb" : "EXAVITQu4vr4xnSDxMaL";
}
