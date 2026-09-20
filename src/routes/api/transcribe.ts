import { createFileRoute } from "@tanstack/react-router";

const DEEPGRAM_KEY_FALLBACK = "f864cbf8ef4e61b5cc5f2c7aac27326b24f4ae43";

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
        const apiKey = (process.env["DEEPGRAM_API_KEY"] || DEEPGRAM_KEY_FALLBACK).trim();
        if (!apiKey) {
          console.error("[quench] DEEPGRAM_API_KEY missing");
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

          const response = await fetch(
            "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
            {
              method: "POST",
              headers: {
                Authorization: `Token ${apiKey}`,
                "Content-Type": mimeType,
              },
              body: audioBuffer,
            },
          );

          if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            console.error("[quench] Deepgram transcription error", response.status, errorText);
            return errorResponse(
              "Speech transcription failed.",
              response.status >= 500 ? 502 : 400,
            );
          }

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
        } catch (err) {
          console.error("[quench] Error in /api/transcribe:", err);
          return errorResponse("Internal error processing transcription.", 500);
        }
      },
    },
  },
});
