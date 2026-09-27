import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";
import { spawn } from "node:child_process";
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
        deepgramParam: "model=nova-3&language=ta",
        label: "Tamil (தமிழ்)",
        isIndic: true,
      };
    case "ml":
    case "malayalam":
    case "ml-in":
      return {
        sarvamCode: "ml-IN",
        deepgramParam: "detect_language=true",
        label: "Malayalam (മലയാളം)",
        isIndic: true,
      };
    case "kn":
    case "kannada":
    case "kn-in":
      return {
        sarvamCode: "kn-IN",
        deepgramParam: "model=nova-3&language=kn",
        label: "Kannada (ಕನ್ನಡ)",
        isIndic: true,
      };
    case "hi":
    case "hindi":
    case "hi-in":
      return {
        sarvamCode: "hi-IN",
        deepgramParam: "model=nova-3&language=hi",
        label: "Hindi (हिंदी)",
        isIndic: true,
      };
    case "te":
    case "telugu":
    case "te-in":
      return {
        sarvamCode: "te-IN",
        deepgramParam: "model=nova-3&language=te",
        label: "Telugu (తెలుగు)",
        isIndic: true,
      };
    case "bn":
    case "bengali":
    case "bn-in":
      return {
        sarvamCode: "bn-IN",
        deepgramParam: "model=nova-3&language=bn",
        label: "Bengali (বাংলা)",
        isIndic: true,
      };
    case "mr":
    case "marathi":
    case "mr-in":
      return {
        sarvamCode: "mr-IN",
        deepgramParam: "model=nova-3&language=mr",
        label: "Marathi (मराठी)",
        isIndic: true,
      };
    case "gu":
    case "gujarati":
    case "gu-in":
      return {
        sarvamCode: "gu-IN",
        deepgramParam: "model=nova-3&language=gu",
        label: "Gujarati (ગુજરાતી)",
        isIndic: true,
      };
    case "pa":
    case "punjabi":
    case "pa-in":
      return {
        sarvamCode: "pa-IN",
        deepgramParam: "model=nova-3&language=pa",
        label: "Punjabi (ਪੰਜਾਬੀ)",
        isIndic: true,
      };
    case "od":
    case "odia":
    case "od-in":
      return {
        sarvamCode: "od-IN",
        deepgramParam: "detect_language=true",
        label: "Odia (ଓଡ଼ିଆ)",
        isIndic: true,
      };
    case "en":
    case "english":
    case "en-in":
      return {
        sarvamCode: "en-IN",
        deepgramParam: "model=nova-3&language=en",
        label: "English",
        isIndic: false,
      };
    default:
      return {
        sarvamCode: "unknown",
        deepgramParam: "model=nova-3&detect_language=true",
        label: "Indian Languages & English",
        isIndic: true,
      };
  }
}

/**
 * Converts audio buffer to 16kHz mono WAV via ffmpeg pipe
 * If ffmpeg fails, returns original buffer.
 */
async function convertAudioToWav(audioBuffer: ArrayBuffer): Promise<Buffer> {
  return new Promise((resolve) => {
    try {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i",
        "pipe:0",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-f",
        "wav",
        "pipe:1",
      ]);
      const chunks: Buffer[] = [];
      ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.on("close", (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(Buffer.from(audioBuffer));
        }
      });
      ffmpeg.on("error", () => {
        resolve(Buffer.from(audioBuffer));
      });
      ffmpeg.stdin.write(Buffer.from(audioBuffer));
      ffmpeg.stdin.end();
    } catch {
      resolve(Buffer.from(audioBuffer));
    }
  });
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sarvamKey = getSarvamApiKey();
        const deepgramKey = getDeepgramApiKey();
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!sarvamKey && !deepgramKey && !geminiKey) {
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

          // Convert to 16kHz mono WAV for highest accuracy with Sarvam AI STT
          const wavBuffer = await convertAudioToWav(audioBuffer);

          // 1. PRIMARY: Sarvam AI Speech-to-Text (Saaras:v4)
          // Sarvam AI has native specialization across all Indian languages and English
          if (sarvamKey) {
            const trySarvam = async (modelName: string) => {
              const form = new FormData();
              form.append("file", new Blob([wavBuffer], { type: "audio/wav" }), "audio.wav");
              form.append("model", modelName);
              form.append("mode", "transcribe");
              form.append("sample_rate", "16000");

              if (langInfo.sarvamCode && langInfo.sarvamCode !== "unknown") {
                form.append("language_code", langInfo.sarvamCode);
              } else {
                form.append("language_code", "unknown");
              }

              const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
                method: "POST",
                headers: {
                  "api-subscription-key": sarvamKey,
                },
                body: form,
              });

              if (sarvamRes.ok) {
                const sData = (await sarvamRes.json()) as {
                  transcript?: string;
                  language_code?: string;
                };
                const text = sData.transcript?.trim() || "";
                console.log(
                  `[STT] Sarvam AI (${modelName}) transcribed in ${sData.language_code || langInfo.sarvamCode}: "${text}"`,
                );
                return { success: true, text, detectedLang: sData.language_code };
              } else {
                const errText = await sarvamRes.text().catch(() => "");
                console.warn(`[STT] Sarvam STT (${modelName}) notice:`, errText);
              }
              return null;
            };

            try {
              // Try saaras:v4 first (latest model)
              const resultV4 = await trySarvam("saaras:v4");
              if (resultV4) {
                return new Response(
                  JSON.stringify({
                    ok: true,
                    text: resultV4.text,
                    provider: "sarvam",
                    language: resultV4.detectedLang || langInfo.sarvamCode,
                  }),
                  {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  },
                );
              }

              // Fallback to saarika:v2.5 if saaras:v4 fails
              const resultV25 = await trySarvam("saarika:v2.5");
              if (resultV25) {
                return new Response(
                  JSON.stringify({
                    ok: true,
                    text: resultV25.text,
                    provider: "sarvam",
                    language: resultV25.detectedLang || langInfo.sarvamCode,
                  }),
                  {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  },
                );
              }
            } catch (sErr) {
              console.warn("[STT] Sarvam STT exception:", sErr);
            }
          }

          // 2. SECONDARY FALLBACK: Deepgram Nova-3
          if (deepgramKey) {
            try {
              const deepgramUrl = `https://api.deepgram.com/v1/listen?${langInfo.deepgramParam}&smart_format=true&punctuate=true`;
              const response = await fetch(deepgramUrl, {
                method: "POST",
                headers: {
                  Authorization: `Token ${deepgramKey}`,
                  "Content-Type": "audio/wav",
                },
                body: wavBuffer,
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

                console.log(`[STT] Deepgram transcribed: "${transcript}"`);
                return new Response(
                  JSON.stringify({ ok: true, text: transcript, provider: "deepgram" }),
                  {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  },
                );
              } else {
                const dgErr = await response.text().catch(() => "");
                console.warn("[STT] Deepgram STT response notice:", dgErr);
              }
            } catch (deepgramErr) {
              console.warn("[STT] Deepgram STT exception:", deepgramErr);
            }
          }

          // 3. TERTIARY FALLBACK: Gemini Multimodal Audio (only when a valid AIzaSy API key is present)
          if (geminiKey && geminiKey.startsWith("AIzaSy")) {
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
              } else if (langInfo.sarvamCode === "hi-IN") {
                targetScriptPrompt =
                  "The user is speaking in Natural Spoken Hindi (हिंदी) or Hinglish. Accurately transcribe their spoken words into Devanagari script (or Hinglish if spoken in English phonetics).";
              } else if (langInfo.sarvamCode === "te-IN") {
                targetScriptPrompt =
                  "The user is speaking in Natural Spoken Telugu (తెలుగు). Accurately transcribe their spoken words into Telugu script.";
              } else if (langInfo.sarvamCode === "en-IN") {
                targetScriptPrompt =
                  "The user is speaking in English. Accurately transcribe their spoken words in English.";
              } else {
                targetScriptPrompt =
                  "The user is speaking in an Indian language (Tamil, Malayalam, Kannada, Hindi, Telugu, etc.) or English. Accurately transcribe what was said in the native script or words of that language.";
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
                return new Response(
                  JSON.stringify({ ok: true, text: geminiText, provider: "gemini" }),
                  {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  },
                );
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
