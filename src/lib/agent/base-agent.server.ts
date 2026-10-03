import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { buildSystemPrompt, type ModeId } from "./modes";
import {
  AgentInputError,
  GroqProviderError,
  OpenRouterProviderError,
  DEFAULT_OPENROUTER_MODEL,
  resolveProvider,
} from "./provider.server";
import { searchWeb } from "@/lib/tools/web-search.server";
import { formatSearchForPrompt } from "@/lib/tools/format-search";
import { WebSearchError } from "@/lib/tools/web-search-types";
import { GoogleGenAI } from "@google/genai";
import { orchestrateAgentRun } from "./orchestrator.server";
import { getPromptSuggestions } from "./image-suggestions";
import type { ChatHistoryItem } from "@/lib/rag/rag-engine.server";

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
  otherChats?: ChatHistoryItem[];
  mode: ModeId;
  deepThink?: boolean;
  webSearch?: boolean;
  voiceMode?: boolean;
  model?: string;
  provider?: string;
  userLocation?: { latitude: number; longitude: number };
  userLocationDenied?: boolean;
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

function cleanImagePrompt(rawText: string): string {
  let cleaned = rawText.trim();
  cleaned = cleaned
    .replace(
      /^(?:can you\s+)?(?:please\s+)?(?:could you\s+)?(?:generate|create|draw|make|paint|render|produce|show me|give me)\s+(?:an?|me an?|a new|the)?\s*(?:image|picture|photo|photograph|artwork|drawing|illustration|painting|wallpaper|portrait|render|graphic)?\s*(?:of|about|depicting|showing|with)?\s*/i,
      "",
    )
    .replace(
      /^(?:image|picture|photo|artwork|drawing|illustration|painting)\s+(?:of|depicting|showing|with)\s*/i,
      "",
    )
    .replace(/^(?:draw|paint)\s+(?:me\s+)?(?:an?|a)\s*/i, "")
    .trim();

  return cleaned || rawText.trim();
}

export function isImageGenerationIntent(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const t = text.trim().toLowerCase();

  // Negative filters: technical explanations, programming, tutorials, OCR
  if (
    /^(?:explain|how to|what is|how do (?:i|you)|why|tell me about|analyze|describe|read|ocr|write a python|python script|code to generate|how can i generate)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  if (
    /\b(?:how do i generate|can you explain|tutorial|code snippet|algorithm|what model|write code)\b/i.test(
      t,
    )
  ) {
    return false;
  }

  // 1. Explicit generation commands
  if (
    /\b(?:generate|create|draw|make|paint|render|produce)\s+(?:an?|me an?|a new|the)?\s*(?:image|picture|photo|photograph|artwork|drawing|illustration|painting|wallpaper|portrait|render|banner|graphic)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  // 2. Direct requests like "image of a cat", "picture of a sunset"
  if (
    /^(?:image|picture|photo|artwork|drawing|illustration|painting)\s+(?:of|showing|depicting)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  // 3. "can you draw / generate / paint / create"
  if (
    /\b(?:can you|could you|please)\s+(?:generate|draw|create|make|paint|render)\s+(?:an?|me an?|a)\s*(?:image|picture|photo|drawing|illustration|artwork|painting)?\b/i.test(
      t,
    )
  ) {
    return true;
  }

  // 4. "draw me a ..." or "paint me a ..."
  if (/\b(?:draw|paint)\s+(?:me\s+)?(?:a|an)\s+[a-z0-9]/i.test(t)) {
    return true;
  }

  if (
    /\b(?:show me|give me)\s+(?:an?|a)\s+(?:image|picture|photo|drawing|illustration)\s+of\b/i.test(
      t,
    )
  ) {
    return true;
  }

  return false;
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
  const { prompt: rawPrompt, referenceImage } = extractImagePromptAndReference(messages);
  const prompt = cleanImagePrompt(rawPrompt) || "A creative high-fidelity artwork";
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  // Detect aspect ratio from user request
  let aspectRatio = "1:1";
  let width = 1024;
  let height = 1024;

  const lowerRaw = rawPrompt.toLowerCase();
  if (/\b(?:16:9|landscape|wide|widescreen|horizontal)\b/i.test(lowerRaw)) {
    aspectRatio = "16:9";
    width = 1280;
    height = 720;
  } else if (/\b(?:9:16|portrait|vertical|tall)\b/i.test(lowerRaw)) {
    aspectRatio = "9:16";
    width = 720;
    height = 1280;
  } else if (/\b(?:4:3)\b/i.test(lowerRaw)) {
    aspectRatio = "4:3";
    width = 1024;
    height = 768;
  } else if (/\b(?:3:4)\b/i.test(lowerRaw)) {
    aspectRatio = "3:4";
    width = 768;
    height = 1024;
  }

  let enhancedPrompt = prompt;
  if (
    !/(?:8k|photorealistic|cinematic|masterpiece|octane|unreal engine|illustration)/i.test(prompt)
  ) {
    enhancedPrompt = `${prompt}, highly detailed, sharp focus, cinematic lighting, 8k resolution, photorealistic masterpiece`;
  }

  let generatedImageUrl: string | null = null;
  let modelNote = "Bravura Neural Flux";

  if (geminiKey && geminiKey.length > 5) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
      let geminiPrompt = enhancedPrompt;

      if (referenceImage) {
        const parsed = parseDataUrl(referenceImage);
        if (parsed) {
          parts.push({ inlineData: { data: parsed.data, mimeType: parsed.mimeType } });
          geminiPrompt = `Edit and transform this image: ${prompt}`;
        }
      }

      parts.push({ text: geminiPrompt });

      const candidateModels = ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image"];

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              imageConfig: {
                aspectRatio: (aspectRatio === "16:9" ||
                aspectRatio === "9:16" ||
                aspectRatio === "4:3" ||
                aspectRatio === "3:4"
                  ? aspectRatio
                  : "1:1") as "1:1",
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
          console.info(
            `[bravura-chat-image] model ${modelName} fallback needed:`,
            (err as Error)?.message?.slice(0, 100),
          );
        }
      }
    } catch (clientErr) {
      console.warn("[bravura-chat-image] Gemini client fallback:", clientErr);
    }
  }

  if (!generatedImageUrl) {
    const seed = Math.floor(Math.random() * 999999);
    const cleanPromptEncoded = encodeURIComponent(enhancedPrompt.slice(0, 360));
    generatedImageUrl = `https://image.pollinations.ai/prompt/${cleanPromptEncoded}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;
    modelNote = "Bravura Neural Flux";
  }

  const suggestions = getPromptSuggestions(prompt);
  const suggestionsBlock = [
    `### 💡 Try Creating Next:`,
    ...suggestions.map((s) => `- [✨ ${s}](#prompt:${encodeURIComponent(s)})`),
  ].join("\n");

  const replyText = [
    `### 🎨 Generated Artwork`,
    ``,
    `![${prompt}](${generatedImageUrl})`,
    ``,
    `**Prompt:** "${prompt}"  `,
    `**Engine:** \`${modelNote}\` • **Aspect Ratio:** \`${aspectRatio}\``,
    ``,
    suggestionsBlock,
  ].join("\n");

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
  otherChats,
  mode,
  deepThink = false,
  webSearch = false,
  voiceMode = false,
  model,
  provider,
  userLocation,
  userLocationDenied,
  abortSignal,
}: AgentRunInput): Promise<Response> {
  const userText = lastUserText(messages);
  const isImageRequest = mode === "image" || isImageGenerationIntent(userText);

  // If in Image mode or user explicitly requests image generation, route directly to image generation
  if (isImageRequest) {
    return handleImageModeAgent(messages);
  }

  const shouldSearch = Boolean(webSearch || mode === "research");

  // Run full Agent Orchestration (plan, select tools, execute RAG/Search/Calculator, evaluate)
  const orchestration = await orchestrateAgentRun({
    messages,
    otherChats,
    mode,
    deepThink,
    webSearch: shouldSearch,
    voiceMode,
    model,
    provider,
    userLocation,
    userLocationDenied,
    abortSignal,
  });

  const mapsPayload =
    orchestration.mapsData &&
    (orchestration.mapsData.places.length > 0 || orchestration.mapsData.route)
      ? `\n\n\`\`\`json:google_maps\n${JSON.stringify(orchestration.mapsData, null, 2)}\n\`\`\``
      : "";

  try {
    // If the provider supports direct streaming (e.g. OpenRouter SSE), stream tokens progressively
    if (typeof orchestration.provider.streamText === "function") {
      const activeProvider = orchestration.provider;
      const stream = createUIMessageStream({
        originalMessages: messages,
        async execute({ writer }) {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: "bravura-response" });
          try {
            const streamedText = await activeProvider.streamText!({
              systemPrompt: orchestration.finalPrompt,
              messages,
              deepThink,
              abortSignal,
              onDelta(delta) {
                writer.write({ type: "text-delta", id: "bravura-response", delta });
              },
            });

            if (
              orchestration.sources.length > 0 &&
              !streamedText.includes(orchestration.sources[0]!.url)
            ) {
              const sourcesBlock = [
                "\n\n---\n**🌐 Verified Sources & Grounding:**",
                ...orchestration.sources
                  .slice(0, 5)
                  .map((s, idx) => `${idx + 1}. [${s.title}](${s.url})`),
              ].join("\n");
              writer.write({ type: "text-delta", id: "bravura-response", delta: sourcesBlock });
            }

            if (mapsPayload) {
              writer.write({ type: "text-delta", id: "bravura-response", delta: mapsPayload });
            }
          } catch (streamErr) {
            console.warn(
              "[bravura] Stream failed on primary provider, executing graceful fallback:",
              streamErr,
            );
            const openrouterKey = process.env["OPENROUTER_API_KEY"]?.trim();
            const nvidiaKey = process.env["NVIDIA_API_KEY"]?.trim();
            const groqKey = process.env["GROQ_API_KEY"]?.trim();
            const geminiKey = process.env["GEMINI_API_KEY"]?.trim();

            let fallbackText = "";
            let fallbackName = "";

            // Build prioritized fallback candidate list (excluding failed primary model)
            const isPrimaryNvidia =
              model?.includes("nemotron") || model?.includes("nvidia") || provider === "nvidia";
            const isPrimaryGroq =
              model?.includes("gpt-oss") || model?.includes("groq") || provider === "groq";
            const isPrimaryGemini = model?.includes("gemini") || provider === "gemini";
            const isPrimaryOpenRouter = model?.includes("openrouter") || provider === "openrouter";

            const hasImages = messages.some((m) =>
              m.parts?.some(
                (p) =>
                  p.type === "file" &&
                  (p.mediaType?.startsWith("image/") ||
                    (typeof p.url === "string" && p.url.startsWith("data:image/"))),
              ),
            );

            const candidates: Array<{ name: string; modelId: string }> = [];

            // 1. Groq (Ultra-fast, lowest latency) - text only
            if (groqKey && !isPrimaryGroq && !hasImages) {
              candidates.push({ name: "GPT-OSS 120B (Groq)", modelId: "openai/gpt-oss-120b" });
            }

            // 2. OpenRouter smart routers (handles text & vision)
            if (openrouterKey && !isPrimaryOpenRouter) {
              candidates.push({ name: "OpenRouter Free Router", modelId: "openrouter/free" });
              candidates.push({ name: "OpenRouter Auto Router", modelId: "openrouter/auto" });
            }

            // 3. NVIDIA alternate models
            if (nvidiaKey && !isPrimaryNvidia) {
              candidates.push({
                name: "NVIDIA Nemotron 3 Super 120B",
                modelId: "nvidia/nemotron-3-super-120b-a12b",
              });
            } else if (nvidiaKey && isPrimaryNvidia) {
              candidates.push({
                name: "NVIDIA Nemotron 3 Nano Reasoning",
                modelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
              });
            }

            // 4. Gemini (only if valid AIzaSy key)
            if (geminiKey && geminiKey.startsWith("AIzaSy") && !isPrimaryGemini) {
              candidates.push({ name: "Gemini 3.8 Flash", modelId: "gemini-3.8-flash" });
            }

            // Try each candidate in sequence until one succeeds
            for (const candidate of candidates) {
              try {
                console.info(`[bravura] Attempting fallback with ${candidate.name}...`);
                const fallbackProvider = resolveProvider(candidate.modelId);
                const res = await fallbackProvider.generateText({
                  systemPrompt: orchestration.finalPrompt,
                  messages,
                  deepThink,
                  ...(abortSignal ? { abortSignal } : {}),
                });
                if (res && res.trim()) {
                  fallbackText = res.trim();
                  fallbackName = candidate.name;
                  break;
                }
              } catch (candidateErr) {
                console.warn(
                  `[bravura] Fallback candidate ${candidate.name} failed:`,
                  candidateErr instanceof Error ? candidateErr.message : candidateErr,
                );
              }
            }

            if (!fallbackText) {
              throw streamErr;
            }

            if (fallbackText) {
              const note = `\n\n> ℹ️ *Fulfilled by **${fallbackName}** because the requested model was temporarily unavailable.*`;
              writer.write({
                type: "text-delta",
                id: "bravura-response",
                delta: fallbackText + mapsPayload + note,
              });
            }
          } finally {
            writer.write({ type: "text-end", id: "bravura-response" });
          }
        },
        onError(error) {
          console.error("[bravura] provider stream error", error);
          return error instanceof Error
            ? error.message
            : "Bravura AI couldn't complete that request.";
        },
      });

      return createUIMessageStreamResponse({ stream });
    }

    let text = "";
    try {
      text = await orchestration.provider.generateText({
        systemPrompt: orchestration.finalPrompt,
        messages,
        deepThink,
        ...(abortSignal ? { abortSignal } : {}),
      });
    } catch (primaryError) {
      console.warn(
        "[bravura] Primary provider generateText failed, executing resilient fallback cascade:",
        primaryError instanceof Error ? primaryError.message : primaryError,
      );

      const kimiKey =
        process.env["KIMI_API_KEY"]?.trim() || process.env["MOONSHOT_API_KEY"]?.trim();
      const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
      const groqKey = process.env["GROQ_API_KEY"]?.trim();
      const nvidiaKey = process.env["NVIDIA_API_KEY"]?.trim();
      const openrouterKey = process.env["OPENROUTER_API_KEY"]?.trim();

      const isKimiPrimary =
        model?.includes("kimi") || model?.includes("moonshot") || provider === "kimi";
      const isNvidiaPrimary =
        model?.includes("nemotron") || model?.includes("nvidia") || provider === "nvidia";
      const isGroqPrimary =
        model?.includes("gpt-oss") || model?.includes("groq") || provider === "groq";
      const isGeminiPrimary = model?.includes("gemini") || provider === "gemini";
      const isOpenRouterPrimary = model?.includes("openrouter") || provider === "openrouter";

      const hasImages = messages.some((m) =>
        m.parts?.some(
          (p) =>
            p.type === "file" &&
            (p.mediaType?.startsWith("image/") ||
              (typeof p.url === "string" && p.url.startsWith("data:image/"))),
        ),
      );

      const candidates: Array<{ name: string; modelId: string }> = [];

      // 1. Groq (Ultra-fast, lowest latency) - text only
      if (groqKey && !isGroqPrimary && !hasImages) {
        candidates.push({ name: "GPT-OSS 120B (Groq)", modelId: "openai/gpt-oss-120b" });
      }

      // 2. OpenRouter smart routers (handles text & vision)
      if (openrouterKey && !isOpenRouterPrimary) {
        candidates.push({ name: "OpenRouter Free Router", modelId: "openrouter/free" });
        candidates.push({ name: "OpenRouter Auto Router", modelId: "openrouter/auto" });
      }

      // 3. NVIDIA alternate models
      if (nvidiaKey && !isPrimaryNvidia) {
        candidates.push({
          name: "NVIDIA Nemotron 3 Super 120B",
          modelId: "nvidia/nemotron-3-super-120b-a12b",
        });
      } else if (nvidiaKey && isPrimaryNvidia) {
        candidates.push({
          name: "NVIDIA Nemotron 3 Nano Reasoning",
          modelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        });
      }

      // 4. Gemini (only if valid AIzaSy key)
      if (geminiKey && geminiKey.startsWith("AIzaSy") && !isPrimaryGemini) {
        candidates.push({ name: "Gemini 3.8 Flash", modelId: "gemini-3.8-flash" });
      }

      let fallbackSucceeded = false;
      for (const cand of candidates) {
        try {
          console.info(`[bravura] Attempting fallback with ${cand.name}...`);
          const fallbackProvider = resolveProvider(cand.modelId);
          const res = await fallbackProvider.generateText({
            systemPrompt: orchestration.finalPrompt,
            messages,
            deepThink,
            ...(abortSignal ? { abortSignal } : {}),
          });
          if (res && res.trim()) {
            text = res.trim();
            text += `\n\n> ℹ️ *Fulfilled by **${cand.name}** because the requested model was temporarily unavailable.*`;
            fallbackSucceeded = true;
            break;
          }
        } catch (candErr) {
          console.warn(
            `[bravura] Fallback candidate ${cand.name} failed:`,
            candErr instanceof Error ? candErr.message : candErr,
          );
        }
      }

      if (!fallbackSucceeded) {
        throw primaryError;
      }
    }

    // If search or RAG sources were retrieved and not yet linked in text, append citations
    if (orchestration.sources.length > 0 && !text.includes(orchestration.sources[0]!.url)) {
      const sourcesBlock = [
        "\n\n---\n**🌐 Verified Sources & Grounding:**",
        ...orchestration.sources.slice(0, 5).map((s, idx) => `${idx + 1}. [${s.title}](${s.url})`),
      ].join("\n");
      text += sourcesBlock;
    }

    if (mapsPayload) {
      text += mapsPayload;
    }

    const stream = createUIMessageStream({
      originalMessages: messages,
      async execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "bravura-response" });

        // Stream in natural-sized token chunks to ensure smooth and swift UI responsiveness
        const chunkSize = Math.max(32, Math.ceil(text.length / 100));
        for (let i = 0; i < text.length; i += chunkSize) {
          if (abortSignal?.aborted) break;
          const chunk = text.slice(i, i + chunkSize);
          writer.write({ type: "text-delta", id: "bravura-response", delta: chunk });
          if (text.length > 300) {
            await new Promise((r) => setTimeout(r, 4));
          }
        }

        writer.write({ type: "text-end", id: "bravura-response" });
      },
      onError(error) {
        console.error("[bravura] ui stream error", error);
        return "Bravura AI couldn't complete that request. Please try again.";
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (
      error instanceof GroqProviderError ||
      error instanceof AgentInputError ||
      error instanceof OpenRouterProviderError
    ) {
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
