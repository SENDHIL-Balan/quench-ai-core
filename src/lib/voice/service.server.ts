import { resolveVoiceForProvider, getVoiceGender } from "./voices";

/**
 * Server-side Voice Service Manager
 * Handles voice provider health, quota cooldowns, and cross-provider voice mapping.
 */

export const SARVAM_KEY_FALLBACK = "sk_2b008r0k_dwBZgLAmycOiz1tparvbS7e8";
export const DEEPGRAM_KEY_FALLBACK = "f864cbf8ef4e61b5cc5f2c7aac27326b24f4ae43";
export const ELEVENLABS_KEY_FALLBACK = "sk_f42cb47fc1c14c2ce644d8c09f75a215578319c977b6baab";

export function getSarvamApiKey(): string {
  const envKey = process.env["SARVAM_API_KEY"]?.trim();
  if (
    !envKey ||
    envKey.startsWith("http://") ||
    envKey.startsWith("https://") ||
    envKey.includes("youtube.com") ||
    envKey.length < 10
  ) {
    return SARVAM_KEY_FALLBACK;
  }
  return envKey;
}

export function getDeepgramApiKey(): string {
  const envKey = process.env["DEEPGRAM_API_KEY"]?.trim();
  if (
    !envKey ||
    envKey.startsWith("http://") ||
    envKey.startsWith("https://") ||
    envKey.length < 10
  ) {
    return DEEPGRAM_KEY_FALLBACK;
  }
  return envKey;
}

export function getElevenLabsApiKey(): string {
  const envKey = process.env["ELEVENLABS_API_KEY"]?.trim();
  if (
    !envKey ||
    envKey.startsWith("http://") ||
    envKey.startsWith("https://") ||
    envKey.length < 10
  ) {
    return ELEVENLABS_KEY_FALLBACK;
  }
  return envKey;
}

export const DEFAULT_SARVAM_VOICE = "kavya"; // Natural, crystal-clear Indian English / Hindi voice
export const DEFAULT_SARVAM_MALE_VOICE = "rohan"; // Crisp, articulate male voice
export const DEFAULT_DEEPGRAM_VOICE = "aura-asteria-en"; // Nikki bella (Ultra-fast, warm)
export const DEFAULT_DEEPGRAM_MALE_VOICE = "aura-orion-en"; // Elon musk (Dynamic male)
export const DEFAULT_ELEVENLABS_VOICE = "JBFqnCBsd6RMkjVDRZzb";
export const DEFAULT_ELEVENLABS_FEMALE_VOICE = "EXAVITQu4vr4xnSDxMaL";

// Sarvam AI supported speakers for Bulbul:v3
export const SARVAM_SPEAKERS = [
  "kavya",
  "rohan",
  "priya",
  "rahul",
  "ishita",
  "shreya",
  "ratan",
  "neha",
  "amit",
  "dev",
  "pooja",
  "simran",
] as const;

export function isSarvamVoice(voiceId?: string): boolean {
  if (!voiceId) return false;
  const normalized = voiceId.toLowerCase().trim();
  return (SARVAM_SPEAKERS as readonly string[]).includes(normalized);
}

// Track ElevenLabs quota status across requests
let elevenLabsQuotaExhausted = true; // Initialized to true because the 10,000 character free tier quota is currently exhausted
let elevenLabsQuotaCooldownUntil = Date.now() + 60 * 60 * 1000;

export function isElevenLabsHealthy(apiKey?: string): boolean {
  const key = (apiKey || process.env["ELEVENLABS_API_KEY"] || "").trim();
  if (!key) return false;
  if (elevenLabsQuotaExhausted && Date.now() < elevenLabsQuotaCooldownUntil) {
    return false;
  }
  return true;
}

export function markElevenLabsQuotaExhausted(cooldownMs = 60 * 60 * 1000) {
  elevenLabsQuotaExhausted = true;
  elevenLabsQuotaCooldownUntil = Date.now() + cooldownMs;
}

export function markElevenLabsActive() {
  elevenLabsQuotaExhausted = false;
  elevenLabsQuotaCooldownUntil = 0;
}

/**
 * Returns a Deepgram Aura model strictly preserving the gender of the requested voice.
 */
export function getEffectiveDeepgramVoice(voiceId?: string): string {
  if (voiceId && voiceId.startsWith("aura-")) return voiceId;
  return resolveVoiceForProvider(voiceId, "deepgram");
}

/**
 * Returns a Sarvam speaker strictly preserving the gender of the requested voice.
 */
export function getEffectiveSarvamVoice(voiceId?: string): string {
  if (voiceId && isSarvamVoice(voiceId)) return voiceId.toLowerCase().trim();
  return resolveVoiceForProvider(voiceId, "sarvam");
}

/**
 * Returns an ElevenLabs voice ID strictly preserving the gender of the requested voice.
 */
export function getEffectiveElevenLabsVoice(voiceId?: string): string {
  return resolveVoiceForProvider(voiceId, "elevenlabs");
}
