import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/speak
 *
 * Body: JSON { text: string, voice?: string, provider?: "elevenlabs" | "deepgram" | "auto" }
 * Returns: audio/mpeg stream
 *
 * Server-side only. Keys never leave the server.
 */

const DEEPGRAM_KEY_FALLBACK = "f864cbf8ef4e61b5cc5f2c7aac27326b24f4ae43";
const ELEVENLABS_KEY_FALLBACK = "sk_f42cb47fc1c14c2ce644d8c09f75a215578319c977b6baab";

const DEFAULT_ELEVENLABS_VOICE = "JBFqnCBsd6RMkjVDRZzb"; // George (premade, warm & engaging)
const DEFAULT_DEEPGRAM_VOICE = "aura-asteria-en"; // Asteria (warm English female)
const MAX_TEXT_LENGTH = 3000;

type SpeakBody = {
  text?: unknown;
  voice?: unknown;
  provider?: "elevenlabs" | "deepgram" | "auto";
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fetchElevenLabsAudio(
  apiKey: string,
  text: string,
  voiceId: string,
): Promise<Response> {
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey.trim(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    },
  );
}

async function fetchDeepgramAudio(apiKey: string, text: string, model: string): Promise<Response> {
  return fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}

export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deepgramKey = (process.env["DEEPGRAM_API_KEY"] || DEEPGRAM_KEY_FALLBACK).trim();
        const elevenLabsKey = (process.env["ELEVENLABS_API_KEY"] || ELEVENLABS_KEY_FALLBACK).trim();

        if (!deepgramKey && !elevenLabsKey) {
          return errorResponse("Voice agent is not configured on the server.", 503);
        }

        let body: SpeakBody;
        try {
          body = (await request.json()) as SpeakBody;
        } catch {
          return errorResponse("Could not read the request.", 400);
        }

        const rawText = typeof body.text === "string" ? body.text.trim() : "";
        // Strip markdown characters or excessive formatting for smoother speech output
        const cleanText = rawText
          .replace(/```[\s\S]*?```/g, "Code block omitted.")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/[*#_~>]/g, "")
          .trim();

        if (!cleanText) {
          return errorResponse("No text provided to speak.", 400);
        }

        const textToSpeak =
          cleanText.length > MAX_TEXT_LENGTH
            ? `${cleanText.slice(0, MAX_TEXT_LENGTH).trim()}...`
            : cleanText;

        const requestedVoice =
          typeof body.voice === "string" && body.voice.trim() ? body.voice.trim() : "";
        const requestedProvider = body.provider || "auto";

        const isDeepgramVoice = requestedVoice.startsWith("aura-");
        const isElevenLabsVoice = requestedVoice && !isDeepgramVoice;

        const preferElevenLabs =
          requestedProvider === "elevenlabs" ||
          isElevenLabsVoice ||
          (requestedProvider === "auto" && !isDeepgramVoice && Boolean(elevenLabsKey));

        // 1. Try ElevenLabs if preferred
        if (preferElevenLabs && elevenLabsKey) {
          const voiceId = isElevenLabsVoice ? requestedVoice : DEFAULT_ELEVENLABS_VOICE;
          try {
            const elevenRes = await fetchElevenLabsAudio(elevenLabsKey, textToSpeak, voiceId);
            if (elevenRes.ok && elevenRes.body) {
              return new Response(elevenRes.body, {
                status: 200,
                headers: {
                  "content-type": "audio/mpeg",
                  "cache-control": "no-store",
                  "x-voice-provider": "elevenlabs",
                },
              });
            }
            console.warn(
              "[quench] ElevenLabs speak failed, status:",
              elevenRes.status,
              "Falling back to Deepgram Aura",
            );
          } catch (err) {
            console.warn(
              "[quench] ElevenLabs request error:",
              err,
              "Falling back to Deepgram Aura",
            );
          }
        }

        // 2. Try Deepgram Aura
        if (deepgramKey) {
          const auraModel = isDeepgramVoice ? requestedVoice : DEFAULT_DEEPGRAM_VOICE;
          try {
            const deepgramRes = await fetchDeepgramAudio(deepgramKey, textToSpeak, auraModel);
            if (deepgramRes.ok && deepgramRes.body) {
              return new Response(deepgramRes.body, {
                status: 200,
                headers: {
                  "content-type": "audio/mpeg",
                  "cache-control": "no-store",
                  "x-voice-provider": "deepgram",
                },
              });
            }
            const errDetail = await deepgramRes.text().catch(() => "");
            console.error(
              "[quench] Deepgram Aura error:",
              deepgramRes.status,
              errDetail.slice(0, 300),
            );
          } catch (err) {
            console.error("[quench] Deepgram Aura fetch error:", err);
          }
        }

        // 3. Fallback: if Deepgram was tried first but failed, and ElevenLabs is available
        if (!preferElevenLabs && elevenLabsKey) {
          try {
            const elevenRes = await fetchElevenLabsAudio(
              elevenLabsKey,
              textToSpeak,
              DEFAULT_ELEVENLABS_VOICE,
            );
            if (elevenRes.ok && elevenRes.body) {
              return new Response(elevenRes.body, {
                status: 200,
                headers: {
                  "content-type": "audio/mpeg",
                  "cache-control": "no-store",
                  "x-voice-provider": "elevenlabs",
                },
              });
            }
          } catch (err) {
            console.error("[quench] ElevenLabs fallback error:", err);
          }
        }

        return errorResponse(
          "Both ElevenLabs and Deepgram voice services were unavailable. Please try again.",
          502,
        );
      },
    },
  },
});
