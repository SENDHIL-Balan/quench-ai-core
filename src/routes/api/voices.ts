import { createFileRoute } from "@tanstack/react-router";

const DEEPGRAM_KEY_FALLBACK = "f864cbf8ef4e61b5cc5f2c7aac27326b24f4ae43";
const ELEVENLABS_KEY_FALLBACK = "sk_f42cb47fc1c14c2ce644d8c09f75a215578319c977b6baab";

export const Route = createFileRoute("/api/voices")({
  server: {
    handlers: {
      GET: async () => {
        const hasDeepgram = Boolean(
          (process.env["DEEPGRAM_API_KEY"] || DEEPGRAM_KEY_FALLBACK).trim(),
        );
        const hasElevenLabs = Boolean(
          (process.env["ELEVENLABS_API_KEY"] || ELEVENLABS_KEY_FALLBACK).trim(),
        );

        const voices = [
          {
            id: "JBFqnCBsd6RMkjVDRZzb",
            name: "Bravura George",
            provider: "elevenlabs",
            description: "Warm, Captivating & Engaging Conversational Tone",
            gender: "male",
            recommended: true,
          },
          {
            id: "EXAVITQu4vr4xnSDxMaL",
            name: "Bravura Sarah",
            provider: "elevenlabs",
            description: "Mature, Reassuring & Confident Tone",
            gender: "female",
            recommended: false,
          },
          {
            id: "Xb7hH8MSUJpSbSDYk0k2",
            name: "Bravura Alice",
            provider: "elevenlabs",
            description: "Clear, Articulate & Engaging Vocal Style",
            gender: "female",
            recommended: false,
          },
          {
            id: "CwhRBWXzGAHq8TQ4Fs17",
            name: "Bravura Roger",
            provider: "elevenlabs",
            description: "Laid-Back, Casual & Natural Resonant Tone",
            gender: "male",
            recommended: false,
          },
          {
            id: "aura-asteria-en",
            name: "Bravura Asteria",
            provider: "deepgram",
            description: "Ultra-Fast, Warm & Natural Conversational Flow",
            gender: "female",
            recommended: true,
          },
          {
            id: "aura-orion-en",
            name: "Bravura Orion",
            provider: "deepgram",
            description: "Confident, Clear & Dynamic Vocal Presence",
            gender: "male",
            recommended: false,
          },
          {
            id: "aura-luna-en",
            name: "Bravura Luna",
            provider: "deepgram",
            description: "Gentle, Friendly & Smooth Acoustic Tone",
            gender: "female",
            recommended: false,
          },
          {
            id: "aura-arcas-en",
            name: "Bravura Arcas",
            provider: "deepgram",
            description: "Calm, Steady & Authoritative Voice",
            gender: "male",
            recommended: false,
          },
        ];

        return new Response(
          JSON.stringify({
            ok: true,
            providers: {
              elevenlabs: hasElevenLabs,
              deepgram: hasDeepgram,
            },
            voices,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=3600",
            },
          },
        );
      },
    },
  },
});
