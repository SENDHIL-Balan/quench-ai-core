import { createFileRoute } from "@tanstack/react-router";
import {
  SARVAM_KEY_FALLBACK,
  isSarvamVoice,
  getEffectiveDeepgramVoice,
  getEffectiveSarvamVoice,
  getEffectiveElevenLabsVoice,
  isElevenLabsHealthy,
  markElevenLabsQuotaExhausted,
  markElevenLabsActive,
  getSarvamApiKey,
  getDeepgramApiKey,
  getElevenLabsApiKey,
} from "@/lib/voice/service.server";
import { getVoiceGender } from "@/lib/voice/voices";

/**
 * POST /api/speak
 *
 * Body: JSON { text: string, voice?: string, provider?: "sarvam" | "elevenlabs" | "deepgram" | "auto", playbackSpeed?: number }
 * Returns: audio/mpeg or audio/wav stream
 *
 * Server-side only. Keys never leave the server.
 */

const MAX_TEXT_LENGTH = 3000;

type SpeakBody = {
  text?: unknown;
  voice?: unknown;
  provider?: "sarvam" | "elevenlabs" | "deepgram" | "auto";
  playbackSpeed?: unknown;
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Sarvam AI Bulbul:v3 Text-To-Speech
 * High-clarity Indian English & multilingual synthesis
 */
async function fetchSarvamAudio(
  apiKey: string,
  text: string,
  speaker: string,
  playbackSpeed = 1.0,
): Promise<Response> {
  const pace = Math.max(0.7, Math.min(1.8, playbackSpeed || 1.0));
  const callSarvam = async (key: string) => {
    return fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": key.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: "en-IN",
        speaker: speaker || "kavya",
        pace,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      }),
    });
  };

  let res = await callSarvam(apiKey);
  if ((res.status === 401 || res.status === 403) && apiKey !== SARVAM_KEY_FALLBACK) {
    console.warn("[VOICE] Sarvam AI custom key returned 401/403, retrying with verified key...");
    res = await callSarvam(SARVAM_KEY_FALLBACK);
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Sarvam AI returned ${res.status}: ${errorBody}`);
  }

  const json = (await res.json()) as { audios?: string[] };
  if (!json.audios || json.audios.length === 0 || !json.audios[0]) {
    throw new Error("Sarvam AI returned no audio data");
  }

  // Sarvam returns base64-encoded WAV (RIFF)
  const base64Data = json.audios[0];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Response(bytes.buffer, {
    status: 200,
    headers: {
      "content-type": "audio/wav",
      "cache-control": "no-store",
      "x-voice-provider": "sarvam",
      "x-voice-speaker": speaker,
    },
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
        const sarvamKey = getSarvamApiKey();
        const deepgramKey = getDeepgramApiKey();
        const elevenLabsKey = getElevenLabsApiKey();

        if (!sarvamKey && !deepgramKey && !elevenLabsKey) {
          return errorResponse("Voice agent is not configured on the server.", 503);
        }

        let body: SpeakBody;
        try {
          body = (await request.json()) as SpeakBody;
        } catch {
          return errorResponse("Could not read the request.", 400);
        }

        const rawText = typeof body.text === "string" ? body.text.trim() : "";
        // Strip markdown characters or excessive formatting for crystal clear speech output
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
          typeof body.voice === "string" && body.voice.trim() ? body.voice.trim() : "kavya";
        const requestedProvider = body.provider || "auto";
        const playbackSpeed =
          typeof body.playbackSpeed === "number" && !isNaN(body.playbackSpeed)
            ? body.playbackSpeed
            : 1.0;

        const targetGender = getVoiceGender(requestedVoice);
        console.log(
          `[VOICE] API /api/speak received: voice=${requestedVoice} (${targetGender}), provider=${requestedProvider}, length=${textToSpeak.length}`,
        );

        const isExplicitSarvam = requestedProvider === "sarvam" || isSarvamVoice(requestedVoice);
        const isDeepgramVoice = requestedVoice.startsWith("aura-");
        const isElevenLabsVoice = Boolean(
          requestedVoice && !isDeepgramVoice && !isSarvamVoice(requestedVoice),
        );

        // 1. Try Sarvam AI first if explicitly requested or matching a Sarvam voice
        if (isExplicitSarvam && sarvamKey) {
          const speaker = getEffectiveSarvamVoice(requestedVoice);
          try {
            console.log(`[VOICE] Attempting Sarvam AI with speaker=${speaker} (${targetGender})`);
            const res = await fetchSarvamAudio(sarvamKey, textToSpeak, speaker, playbackSpeed);
            console.log(`[VOICE] Sarvam AI synthesis succeeded for speaker=${speaker}`);
            return res;
          } catch (err) {
            console.warn(`[VOICE] Sarvam AI attempt notice for speaker ${speaker}:`, err);
            // Fall through with strict gender preservation
          }
        }

        // 2. Try ElevenLabs if explicitly requested and healthy
        const elevenLabsUsable = isElevenLabsHealthy(elevenLabsKey);
        const shouldTryElevenLabs =
          elevenLabsUsable &&
          (requestedProvider === "elevenlabs" ||
            isElevenLabsVoice ||
            (requestedProvider === "auto" && !isDeepgramVoice && !isExplicitSarvam));

        if (shouldTryElevenLabs && elevenLabsKey) {
          const voiceId = getEffectiveElevenLabsVoice(requestedVoice);
          try {
            console.log(`[VOICE] Attempting ElevenLabs with voiceId=${voiceId} (${targetGender})`);
            const elevenRes = await fetchElevenLabsAudio(elevenLabsKey, textToSpeak, voiceId);
            if (elevenRes.ok && elevenRes.body) {
              markElevenLabsActive();
              console.log(`[VOICE] ElevenLabs synthesis succeeded for voiceId=${voiceId}`);
              return new Response(elevenRes.body, {
                status: 200,
                headers: {
                  "content-type": "audio/mpeg",
                  "cache-control": "no-store",
                  "x-voice-provider": "elevenlabs",
                  "x-voice-speaker": voiceId,
                },
              });
            }

            if (elevenRes.status === 401 || elevenRes.status === 402 || elevenRes.status === 429) {
              markElevenLabsQuotaExhausted();
            }
          } catch {
            markElevenLabsQuotaExhausted(5 * 60 * 1000);
          }
        }

        // 3. High-performance Deepgram Aura (strictly gender-matched!)
        if (
          deepgramKey &&
          (requestedProvider === "deepgram" || requestedProvider === "auto" || !sarvamKey)
        ) {
          const auraModel = getEffectiveDeepgramVoice(requestedVoice);
          try {
            console.log(
              `[VOICE] Attempting Deepgram Aura with model=${auraModel} (${targetGender})`,
            );
            const deepgramRes = await fetchDeepgramAudio(deepgramKey, textToSpeak, auraModel);
            if (deepgramRes.ok && deepgramRes.body) {
              console.log(`[VOICE] Deepgram Aura synthesis succeeded for model=${auraModel}`);
              return new Response(deepgramRes.body, {
                status: 200,
                headers: {
                  "content-type": "audio/mpeg",
                  "cache-control": "no-store",
                  "x-voice-provider": "deepgram",
                  "x-voice-speaker": auraModel,
                },
              });
            }
          } catch (err) {
            console.warn(`[VOICE] Deepgram Aura attempt notice for model ${auraModel}:`, err);
          }
        }

        // 4. Fallback to Sarvam AI (strictly gender-matched!)
        if (sarvamKey) {
          const speaker = getEffectiveSarvamVoice(requestedVoice);
          try {
            console.log(`[VOICE] Fallback to Sarvam AI with speaker=${speaker} (${targetGender})`);
            const res = await fetchSarvamAudio(sarvamKey, textToSpeak, speaker, playbackSpeed);
            console.log(`[VOICE] Sarvam AI fallback succeeded for speaker=${speaker}`);
            return res;
          } catch (err) {
            console.warn(`[VOICE] Sarvam AI fallback notice:`, err);
          }
        }

        // 5. Last-ditch Deepgram attempt (strictly gender-matched!)
        if (deepgramKey) {
          const auraModel = getEffectiveDeepgramVoice(requestedVoice);
          try {
            console.log(
              `[VOICE] Last-ditch Deepgram attempt with model=${auraModel} (${targetGender})`,
            );
            const deepgramRes = await fetchDeepgramAudio(deepgramKey, textToSpeak, auraModel);
            if (deepgramRes.ok && deepgramRes.body) {
              return new Response(deepgramRes.body, {
                status: 200,
                headers: {
                  "content-type": "audio/mpeg",
                  "cache-control": "no-store",
                  "x-voice-provider": "deepgram",
                  "x-voice-speaker": auraModel,
                },
              });
            }
          } catch {
            /* ignore */
          }
        }

        console.error(
          `[VOICE] All voice synthesis providers failed for voice=${requestedVoice} (${targetGender})`,
        );
        return errorResponse(
          "Voice synthesis service is temporarily unavailable. Please try again.",
          502,
        );
      },
    },
  },
});
