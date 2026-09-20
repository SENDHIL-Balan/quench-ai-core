import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";

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

          let transcript = "";
          const deepgramKey = (process.env["DEEPGRAM_API_KEY"] || "").trim();

          // 1. Try Deepgram if configured
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
                transcript =
                  data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";
              }
            } catch (dgErr) {
              console.warn(
                "[quench] Deepgram transcribe request failed, falling back to Gemini:",
                dgErr,
              );
            }
          }

          // 2. Fallback to Gemini multimodal audio transcription if transcript is empty
          if (!transcript) {
            const geminiKey = (process.env["GEMINI_API_KEY"] || "").trim();
            if (geminiKey) {
              try {
                const ai = new GoogleGenAI({ apiKey: geminiKey });
                const base64Audio = Buffer.from(audioBuffer).toString("base64");
                const res = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: [
                    {
                      inlineData: {
                        mimeType: mimeType.includes("mp4") ? "audio/mp4" : "audio/webm",
                        data: base64Audio,
                      },
                    },
                    {
                      text: "Transcribe the spoken words in this audio recording accurately. Return ONLY the transcribed text without any extra commentary, markdown, or quotation marks.",
                    },
                  ],
                });
                transcript = res.text?.trim() || "";
              } catch (geminiErr) {
                console.error("[quench] Gemini audio transcription error:", geminiErr);
              }
            }
          }

          if (!transcript) {
            return errorResponse("Could not detect any spoken speech in the audio.", 400);
          }

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
