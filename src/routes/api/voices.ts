import { createFileRoute } from "@tanstack/react-router";
import {
  isElevenLabsHealthy,
  getSarvamApiKey,
  getDeepgramApiKey,
  getElevenLabsApiKey,
} from "@/lib/voice/service.server";
import { VOICE_OPTIONS } from "@/lib/voice/voices";

export const Route = createFileRoute("/api/voices")({
  server: {
    handlers: {
      GET: async () => {
        const sarvamKey = getSarvamApiKey();
        const deepgramKey = getDeepgramApiKey();
        const elevenLabsKey = getElevenLabsApiKey();

        const hasSarvam = Boolean(sarvamKey);
        const hasDeepgram = Boolean(deepgramKey);
        const hasElevenLabs = isElevenLabsHealthy(elevenLabsKey);

        return new Response(
          JSON.stringify({
            ok: true,
            providers: {
              sarvam: hasSarvam,
              elevenlabs: hasElevenLabs,
              deepgram: hasDeepgram,
            },
            voices: VOICE_OPTIONS,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
