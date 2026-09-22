import { createFileRoute } from "@tanstack/react-router";
import { getSarvamApiKey, getDeepgramApiKey } from "@/lib/voice/service.server";

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deepgramKey = getDeepgramApiKey();
        const sarvamKey = getSarvamApiKey();

        if (!deepgramKey && !sarvamKey) {
          console.error("[quench] No transcription API keys available");
          return errorResponse("Voice transcription is not configured on the server.", 503);
        }

        try {
          const contentType = request.headers.get("content-type") || "";
          let audioBuffer: ArrayBuffer;
          let mimeType = "audio/webm";

          if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const audioEntry = formData.get("audio");
            if (!audioEntry || typeof audioEntry === "string") {
              return errorResponse("No audio file found in form data.", 400);
            }
            const file = audioEntry as Blob;
            audioBuffer = await file.arrayBuffer();
            if (file.type) {
              mimeType = file.type;
            }
          } else {
            audioBuffer = await request.arrayBuffer();
            if (contentType) {
              mimeType = contentType;
            }
          }

          if (audioBuffer.byteLength === 0) {
            return errorResponse("Empty audio received.", 400);
          }

          // 1. Try Deepgram Nova-2 (fastest STT)
          if (deepgramKey) {
            try {
              const response = await fetch(
                "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Token ${deepgramKey}`,
                    "Content-Type": mimeType,
                  },
                  body: audioBuffer,
                },
              );

              if (response.ok) {
                const data = (await response.json()) as {
                  results?: {
                    channels?: Array<{
                      alternatives?: Array<{
                        transcript?: string;
                        confidence?: number;
                      }>;
                    }>;
                  };
                };

                const transcript =
                  data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";

                return new Response(JSON.stringify({ ok: true, text: transcript }), {
                  status: 200,
                  headers: { "content-type": "application/json" },
                });
              } else {
                console.warn("[quench] Deepgram STT failed, attempting Sarvam STT fallback...");
              }
            } catch (deepgramErr) {
              console.warn("[quench] Deepgram STT exception:", deepgramErr);
            }
          }

          // 2. Try Sarvam AI Saarika/Saaras fallback if Deepgram fails or unavailable
          if (sarvamKey) {
            try {
              const form = new FormData();
              const ext = mimeType.includes("wav")
                ? "wav"
                : mimeType.includes("mp4")
                  ? "mp4"
                  : "webm";
              const blob = new Blob([audioBuffer], { type: mimeType });
              form.append("file", blob, `input.${ext}`);
              form.append("model", "saaras:v3");

              const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
                method: "POST",
                headers: {
                  "api-subscription-key": sarvamKey,
                },
                body: form,
              });

              if (sarvamRes.ok) {
                const sData = (await sarvamRes.json()) as { transcript?: string };
                return new Response(
                  JSON.stringify({ ok: true, text: sData.transcript?.trim() || "" }),
                  {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  },
                );
              }
            } catch (sErr) {
              console.warn("[quench] Sarvam STT exception:", sErr);
            }
          }

          return errorResponse("Speech transcription failed on all providers.", 502);
        } catch (err) {
          console.error("[quench] Error in /api/transcribe:", err);
          return errorResponse("Internal error processing transcription.", 500);
        }
      },
    },
  },
});
