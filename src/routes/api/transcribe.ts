import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";
import { getSarvamApiKey, getDeepgramApiKey } from "@/lib/voice/service.server";

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Maps short language codes to Deepgram & Sarvam language parameters
 */
function resolveSTTLanguageParams(lang = "auto") {
  const normalized = lang.toLowerCase().trim();
  switch (normalized) {
    case "ta":
    case "tamil":
    case "ta-in":
      return {
        sarvamCode: "ta-IN",
        deepgramParam: "language=ta",
        label: "Tamil (தமிழ்)",
        isIndic: true,
      };
    case "ml":
    case "malayalam":
    case "ml-in":
      return {
        sarvamCode: "ml-IN",
        deepgramParam: "language=ml",
        label: "Malayalam (മലയാളം)",
        isIndic: true,
      };
    case "kn":
    case "kannada":
    case "kn-in":
      return {
        sarvamCode: "kn-IN",
        deepgramParam: "language=kn",
        label: "Kannada (ಕನ್ನಡ)",
        isIndic: true,
      };
    case "en":
    case "english":
    case "en-in":
      return {
        sarvamCode: "en-IN",
        deepgramParam: "language=en",
        label: "English",
        isIndic: false,
      };
    default:
      return {
        sarvamCode: "unknown",
        deepgramParam: "detect_language=true",
        label: "Tamil, Malayalam, Kannada, or English",
        isIndic: false,
      };
  }
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deepgramKey = getDeepgramApiKey();
        const sarvamKey = getSarvamApiKey();
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!deepgramKey && !sarvamKey && !geminiKey) {
          console.error("[quench] No transcription API keys available");
          return errorResponse("Voice transcription is not configured on the server.", 503);
        }

        try {
          const url = new URL(request.url);
          const queryLang = url.searchParams.get("language") || url.searchParams.get("lang") || "";

          const contentType = request.headers.get("content-type") || "";
          let audioBuffer: ArrayBuffer;
          let mimeType = "audio/webm";
          let formLang = "";

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
            const langVal = formData.get("language") || formData.get("lang");
            if (typeof langVal === "string") {
              formLang = langVal;
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

          const requestedLang = formLang || queryLang || "auto";
          const langInfo = resolveSTTLanguageParams(requestedLang);

          console.log(
            `[STT] Transcribing audio: size=${audioBuffer.byteLength}B, mime=${mimeType}, targetLang=${requestedLang} (${langInfo.label})`,
          );

          // 1. If explicit Indic language (Tamil, Malayalam, Kannada), try Sarvam AI first
          // Sarvam AI has native specialization for Indian languages with the highest transcription accuracy
          if (langInfo.isIndic && sarvamKey) {
            try {
              const form = new FormData();
              const ext = mimeType.includes("wav")
                ? "wav"
                : mimeType.includes("mp4")
                  ? "mp4"
                  : "webm";
              const blob = new Blob([audioBuffer], { type: mimeType });
              form.append("file", blob, `input.${ext}`);
              form.append("model", "saaras:v2");
              form.append("language_code", langInfo.sarvamCode);

              const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
                method: "POST",
                headers: {
                  "api-subscription-key": sarvamKey,
                },
                body: form,
              });

              if (sarvamRes.ok) {
                const sData = (await sarvamRes.json()) as { transcript?: string };
                const text = sData.transcript?.trim() || "";
                if (text) {
                  console.log(`[STT] Sarvam AI transcribed in ${langInfo.label}: "${text}"`);
                  return new Response(JSON.stringify({ ok: true, text, provider: "sarvam" }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  });
                }
              } else {
                const errText = await sarvamRes.text().catch(() => "");
                console.warn("[STT] Sarvam STT notice:", errText);
              }
            } catch (sErr) {
              console.warn("[STT] Sarvam STT exception:", sErr);
            }
          }

          // 2. Try Deepgram Nova-2 with language parameter / auto-detection
          if (deepgramKey) {
            try {
              const deepgramUrl = `https://api.deepgram.com/v1/listen?model=nova-2&${langInfo.deepgramParam}&smart_format=true&punctuate=true`;
              const response = await fetch(deepgramUrl, {
                method: "POST",
                headers: {
                  Authorization: `Token ${deepgramKey}`,
                  "Content-Type": mimeType,
                },
                body: audioBuffer,
              });

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

                if (transcript) {
                  console.log(`[STT] Deepgram Nova-2 transcribed: "${transcript}"`);
                  return new Response(JSON.stringify({ ok: true, text: transcript, provider: "deepgram" }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  });
                }
              } else {
                console.warn("[STT] Deepgram STT failed or empty response.");
              }
            } catch (deepgramErr) {
              console.warn("[STT] Deepgram STT exception:", deepgramErr);
            }
          }

          // 3. Fallback to Sarvam AI with auto language detection if not tried yet
          if (sarvamKey && !langInfo.isIndic) {
            try {
              const form = new FormData();
              const ext = mimeType.includes("wav")
                ? "wav"
                : mimeType.includes("mp4")
                  ? "mp4"
                  : "webm";
              const blob = new Blob([audioBuffer], { type: mimeType });
              form.append("file", blob, `input.${ext}`);
              form.append("model", "saaras:v2");
              form.append("language_code", langInfo.sarvamCode);

              const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
                method: "POST",
                headers: {
                  "api-subscription-key": sarvamKey,
                },
                body: form,
              });

              if (sarvamRes.ok) {
                const sData = (await sarvamRes.json()) as { transcript?: string };
                const text = sData.transcript?.trim() || "";
                if (text) {
                  return new Response(JSON.stringify({ ok: true, text, provider: "sarvam" }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  });
                }
              }
            } catch (sErr) {
              console.warn("[STT] Sarvam fallback exception:", sErr);
            }
          }

          // 4. Ultimate High-Fidelity Fallback: Gemini 2.5 Flash Native Multimodal Audio
          // Gemini has unmatched accuracy across Tamil, Malayalam, Kannada, and Indian English
          if (geminiKey) {
            try {
              const ai = new GoogleGenAI({ apiKey: geminiKey });
              const base64Audio = Buffer.from(audioBuffer).toString("base64");
              const cleanMime = (mimeType || "audio/webm").split(";")[0].trim();

              let targetScriptPrompt = "";
              if (langInfo.sarvamCode === "ta-IN") {
                targetScriptPrompt =
                  "The user is speaking in Natural Spoken Tamil (தமிழ்) or Tanglish. Accurately transcribe their spoken words into Tamil script (or Tanglish if spoken in English phonetics).";
              } else if (langInfo.sarvamCode === "ml-IN") {
                targetScriptPrompt =
                  "The user is speaking in Natural Spoken Malayalam (മലയാളം) or Manglish. Accurately transcribe their spoken words into Malayalam script (or Manglish if spoken in English phonetics).";
              } else if (langInfo.sarvamCode === "kn-IN") {
                targetScriptPrompt =
                  "The user is speaking in Natural Spoken Kannada (ಕನ್ನಡ) or Kanglish. Accurately transcribe their spoken words into Kannada script (or Kanglish if spoken in English phonetics).";
              } else if (langInfo.sarvamCode === "en-IN") {
                targetScriptPrompt =
                  "The user is speaking in English. Accurately transcribe their spoken words in English.";
              } else {
                targetScriptPrompt =
                  "The user is speaking in Tamil, Malayalam, Kannada, or English. Accurately transcribe what was said in the native script or words of that language.";
              }

              const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        inlineData: {
                          mimeType: cleanMime,
                          data: base64Audio,
                        },
                      },
                      {
                        text: `${targetScriptPrompt} Return ONLY the verbatim transcribed speech text without commentary, without surrounding quotes, without markdown, and without preamble. If no intelligible speech is heard, return an empty string.`,
                      },
                    ],
                  },
                ],
              });

              const geminiText = response.text?.trim() || "";
              if (geminiText) {
                console.log(`[STT] Gemini 2.5 Flash multimodal transcribed: "${geminiText}"`);
                return new Response(JSON.stringify({ ok: true, text: geminiText, provider: "gemini" }), {
                  status: 200,
                  headers: { "content-type": "application/json" },
                });
              }
            } catch (geminiErr) {
              console.warn("[STT] Gemini multimodal transcription fallback notice:", geminiErr);
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
