import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { buildSystemPrompt, type ModeId } from "./modes";
import { AgentInputError, GroqProviderError, resolveProvider } from "./provider.server";
import { searchWeb } from "@/lib/tools/web-search.server";
import { formatSearchForPrompt } from "@/lib/tools/format-search";
import { WebSearchError } from "@/lib/tools/web-search-types";
import { GoogleGenAI } from "@google/genai";

/**
 * Bravura AI base agent.
 *
 * Server-side entry. Streams a UI message response back to /api/chat.
 *
 * When `webSearch` is true, runs a Tavily search against the latest user
 * text message and appends the results to the system prompt before the
 * model is called. Search failures are non-fatal: the agent answers
 * without results and the failure is logged.
 */

export interface AgentRunInput {
  messages: UIMessage[];
  mode: ModeId;
  deepThink?: boolean;
  webSearch?: boolean;
  abortSignal?: AbortSignal;
}

/** Extract the last text part from the last user message. Used as the search query or image prompt. */
function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== "user") continue;
    const text = message.parts
      .filter(
        (part): part is Extract<(typeof message.parts)[number], { type: "text" }> =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

function extractImagePromptAndReference(messages: UIMessage[]): {
  prompt: string;
  referenceImage?: string;
} {
  let prompt = "";
  let referenceImage: string | undefined;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== "user") continue;
    for (const part of message.parts) {
      if (part.type === "text" && !prompt) {
        prompt = part.text.trim();
      } else if (
        part.type === "file" &&
        typeof (part as { url?: unknown }).url === "string" &&
        ((part as { url: string }).url.startsWith("data:image") ||
          (part as { mediaType?: string }).mediaType?.startsWith("image/"))
      ) {
        referenceImage = (part as { url: string }).url;
      }
    }
    if (prompt) break;
  }
  return { prompt: prompt || "A creative high-fidelity artwork", referenceImage };
}

/**
 * Runs a search and returns the block to append to the system prompt,
 * or null if search was skipped/failed/empty.
 *
 * Never throws.
 */
async function resolveSearchBlock(
  query: string,
  abortSignal: AbortSignal | undefined,
): Promise<string | null> {
  if (!query) {
    console.info("[quench] web search skipped: no user text to search");
    return null;
  }

  try {
    const bundle = await searchWeb(query, abortSignal ? { signal: abortSignal } : undefined);
    const block = formatSearchForPrompt(bundle);
    if (!block) {
      console.info("[quench] web search returned no usable results", { query });
      return null;
    }
    console.info("[quench] web search ok", {
      query,
      resultCount: bundle.results.length,
    });
    return block;
  } catch (error) {
    if (error instanceof WebSearchError) {
      console.warn("[quench] web search failed (fail-open)", {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      });
      return null;
    }
    console.error("[quench] web search threw unexpected error (fail-open)", error);
    return null;
  }
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/is);
  if (!match) return null;
  return {
    mimeType: match[1] || "image/png",
    data: match[2].replace(/\s/g, ""),
  };
}

async function handleImageModeAgent(messages: UIMessage[]): Promise<Response> {
  const { prompt, referenceImage } = extractImagePromptAndReference(messages);
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const isStandardGeminiKey = Boolean(geminiKey && geminiKey.startsWith("AIzaSy"));

  let generatedImageUrl: string | null = null;
  let modelNote = "";

  if (isStandardGeminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey!,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
      let finalPrompt = prompt;

      if (referenceImage) {
        const parsed = parseDataUrl(referenceImage);
        if (parsed) {
          parts.push({ inlineData: { data: parsed.data, mimeType: parsed.mimeType } });
          finalPrompt = `Edit and transform this image: ${prompt}`;
        }
      }

      parts.push({ text: finalPrompt });

      const candidateModels = [
        "gemini-3.1-flash-image-preview",
        "gemini-3.1-flash-image",
        "gemini-3.1-flash-lite-image",
      ];

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K",
              },
            },
          });

          const candidateParts = response.candidates?.[0]?.content?.parts;
          if (Array.isArray(candidateParts)) {
            for (const part of candidateParts) {
              if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || "image/png";
                generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
                modelNote = modelName;
                break;
              }
            }
          }

          if (generatedImageUrl) break;
        } catch (err) {
          const isAuthError =
            err instanceof Error && /UNAUTHENTICATED|invalid authentication|401/i.test(err.message);
          if (!isAuthError) {
            console.warn(`[bravura-chat-image] model ${modelName} attempt failed:`, err);
          }
        }
      }
    } catch (clientErr) {
      console.error("[bravura-chat-image] Gemini client error:", clientErr);
    }
  }

  if (!generatedImageUrl) {
    const seed = Math.floor(Math.random() * 999999);
    const cleanPrompt = encodeURIComponent(prompt.slice(0, 300));
    generatedImageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
    modelNote = "bravura-neural-flux";
  }

  const replyText = `### Generated Image\n\n![${prompt}](${generatedImageUrl})\n\n*Prompt:* **"${prompt}"**  \n*Engine:* \`${modelNote}\`  \n\n💡 *Tip: Click the image to expand full size, download as PNG, or launch the AI Image Studio from Tools for aspect ratio adjustments.*`;

  const stream = createUIMessageStream({
    originalMessages: messages,
    async execute({ writer }) {
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: "bravura-image-response" });
      writer.write({ type: "text-delta", id: "bravura-image-response", delta: replyText });
      writer.write({ type: "text-end", id: "bravura-image-response" });
    },
    onError(err) {
      console.error("[bravura-image] stream error:", err);
      return "Image generation stream failed.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function runBaseAgent({
  messages,
  mode,
  deepThink = false,
  webSearch = false,
  abortSignal,
}: AgentRunInput): Promise<Response> {
  // If in Image mode, route directly to image generation
  if (mode === "image") {
    return handleImageModeAgent(messages);
  }

  const provider = resolveProvider();

  // Build the base prompt first so deepThink + mode behavior is unchanged when search is off.
  let systemInstruction = buildSystemPrompt({ mode, deepThink, webSearch });

  // If search is requested, do it now and append the block.
  if (webSearch) {
    const query = lastUserText(messages);
    const block = await resolveSearchBlock(query, abortSignal);
    if (block) {
      systemInstruction = `${systemInstruction}\n\n${block}`;
    }
  }

  try {
    const text = await provider.generateText({
      systemPrompt: systemInstruction,
      messages,
      deepThink,
      ...(abortSignal ? { abortSignal } : {}),
    });

    const stream = createUIMessageStream({
      originalMessages: messages,
      async execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "bravura-response" });
        writer.write({ type: "text-delta", id: "bravura-response", delta: text });
        writer.write({ type: "text-end", id: "bravura-response" });
      },
      onError(error) {
        console.error("[bravura] ui stream error", error);
        return "Bravura AI couldn't complete that request. Please try again.";
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (error instanceof GroqProviderError || error instanceof AgentInputError) {
      throw error;
    }

    const cause = error instanceof Error ? error : new Error(String(error));

    console.error("[quench] model request failed", {
      message: cause.message,
      stack: cause.stack,
      cause: error,
    });

    throw new GroqProviderError("AI model request failed.", cause);
  }
}
