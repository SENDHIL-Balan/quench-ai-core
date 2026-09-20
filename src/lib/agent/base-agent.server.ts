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
 * Runs a search and returns the block to append to the system prompt and source citations,
 * or null if search was skipped/failed/empty.
 *
 * Never throws.
 */
async function resolveSearchBlock(
  query: string,
  abortSignal: AbortSignal | undefined,
): Promise<{ block: string; sources: Array<{ title: string; url: string }> } | null> {
  if (!query) {
    console.info("[bravura] web search skipped: no user text to search");
    return null;
  }

  try {
    const bundle = await searchWeb(query, abortSignal ? { signal: abortSignal } : undefined);
    const block = formatSearchForPrompt(bundle);
    if (!block) {
      console.info("[bravura] web search returned no usable results", { query });
      return null;
    }
    const sources = bundle.results.map((r) => ({ title: r.title, url: r.url }));
    console.info("[bravura] web search ok", {
      query,
      resultCount: bundle.results.length,
    });
    return { block, sources };
  } catch (error) {
    if (error instanceof WebSearchError) {
      console.warn("[bravura] web search failed (fail-open)", {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      });
      return null;
    }
    console.error("[bravura] web search threw unexpected error (fail-open)", error);
    return null;
  }
}

function isRealTimeQuery(text: string): boolean {
  if (!text) return false;
  return /\b(today|tonight|now|current|currently|latest|recent|news|weather|headline|price|stock|score|yesterday|tomorrow|live|update|2026|who won|who is)\b/i.test(
    text,
  );
}

function mapUiMessagesToGeminiContents(messages: UIMessage[]) {
  const contents = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const role = m.role === "assistant" ? "model" : "user";
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    for (const p of m.parts) {
      if (p.type === "text" && p.text) {
        parts.push({ text: p.text });
      } else if (p.type === "file" && typeof (p as { url?: unknown }).url === "string") {
        const parsed = parseDataUrl((p as { url: string }).url);
        if (parsed) {
          parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
        }
      }
    }
    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }
  return contents;
}

/**
 * Attempts real-time search grounding with Gemini 3.5 Flash using the Google Search tool.
 * Returns grounded response text with live web source citations, or null if unauthenticated/unavailable.
 */
async function tryGeminiSearchGrounding({
  messages,
  systemInstruction,
}: {
  messages: UIMessage[];
  systemInstruction: string;
}): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const contents = mapUiMessagesToGeminiContents(messages);
    if (contents.length === 0) return null;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    let text = response.text?.trim();
    if (!text) return null;

    // Extract real-time search grounding metadata from Gemini response
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const chunks = groundingMetadata?.groundingChunks;

    const sources: Array<{ title: string; url: string }> = [];
    const seen = new Set<string>();

    if (Array.isArray(chunks)) {
      for (const chunk of chunks) {
        const uri = chunk.web?.uri;
        const title = chunk.web?.title || uri;
        if (uri && !seen.has(uri)) {
          seen.add(uri);
          sources.push({ title, url: uri });
        }
      }
    }

    if (sources.length > 0 && !text.includes(sources[0].url)) {
      const sourcesBlock = [
        "\n\n---\n**🌐 Live Web Sources & Grounding:**",
        ...sources.slice(0, 5).map((s, idx) => `${idx + 1}. [${s.title}](${s.url})`),
      ].join("\n");
      text += sourcesBlock;
    }

    console.info(
      "[bravura] Gemini 3.5 Flash Search Grounding succeeded with sources:",
      sources.length,
    );
    return text;
  } catch (error) {
    console.warn(
      "[bravura] Gemini 3.5 Flash search grounding attempt failed (will use search fallback):",
      error,
    );
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

  const query = lastUserText(messages);
  const shouldSearch = Boolean(webSearch || mode === "research");

  // Build the base prompt with real-time search context
  let systemInstruction = buildSystemPrompt({ mode, deepThink, webSearch: shouldSearch });

  // When real-time data is requested, attempt native Gemini Google Search Grounding first (gemini-3.5-flash with googleSearch tool)
  if (shouldSearch) {
    const groundedText = await tryGeminiSearchGrounding({
      messages,
      systemInstruction,
    });

    if (groundedText) {
      const stream = createUIMessageStream({
        originalMessages: messages,
        async execute({ writer }) {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: "bravura-response" });
          writer.write({ type: "text-delta", id: "bravura-response", delta: groundedText });
          writer.write({ type: "text-end", id: "bravura-response" });
        },
        onError(error) {
          console.error("[bravura] ui stream error", error);
          return "Bravura AI couldn't complete that request. Please try again.";
        },
      });

      return createUIMessageStreamResponse({ stream });
    }
  }

  // Fallback to active provider with real-time web search injection
  const provider = resolveProvider();
  let searchSources: Array<{ title: string; url: string }> = [];

  if (shouldSearch) {
    const searchData = await resolveSearchBlock(query, abortSignal);
    if (searchData) {
      systemInstruction = `${systemInstruction}\n\n${searchData.block}`;
      searchSources = searchData.sources;
    }
  }

  try {
    let text = await provider.generateText({
      systemPrompt: systemInstruction,
      messages,
      deepThink,
      ...(abortSignal ? { abortSignal } : {}),
    });

    // If search sources were retrieved and not yet linked in text, append real-time citations
    if (searchSources.length > 0 && !text.includes(searchSources[0].url)) {
      const sourcesBlock = [
        "\n\n---\n**🌐 Real-Time Sources:**",
        ...searchSources.slice(0, 5).map((s, idx) => `${idx + 1}. [${s.title}](${s.url})`),
      ].join("\n");
      text += sourcesBlock;
    }

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

    console.error("[bravura] model request failed", {
      message: cause.message,
      stack: cause.stack,
      cause: error,
    });

    throw new GroqProviderError("AI model request failed.", cause);
  }
}
