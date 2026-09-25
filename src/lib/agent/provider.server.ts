import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import type { LanguageModel, UIMessage } from "ai";
import { GoogleGenAI } from "@google/genai";
import {
  AGENT_LIMITS,
  getDataUrlSizeInBytes,
  SUPPORTED_ATTACHMENT_MEDIA_TYPES,
} from "./limits.server";

function sanitizeModelName(envVal: string | undefined, defaultModel: string): string {
  if (!envVal) return defaultModel;
  const trimmed = envVal.trim();
  if (
    trimmed.startsWith("nvapi-") ||
    trimmed.startsWith("AIzaSy") ||
    trimmed.startsWith("AQ.") ||
    trimmed.startsWith("sk-") ||
    trimmed.startsWith("gsk_") ||
    trimmed.length > 60
  ) {
    return defaultModel;
  }
  return trimmed || defaultModel;
}

export const GROQ_MODEL = sanitizeModelName(process.env["GROQ_MODEL"], "openai/gpt-oss-120b");
export const GEMINI_MODEL = sanitizeModelName(process.env["GEMINI_MODEL"], "gemini-3.8-flash");
export const NVIDIA_MODEL = sanitizeModelName(
  process.env["NVIDIA_MODEL"],
  "nvidia/nemotron-3-super-120b-a12b",
);
export const KIMI_MODEL = sanitizeModelName(process.env["KIMI_MODEL"], "kimi-k2.6");
export const KIMI_BASE_URL = process.env["KIMI_BASE_URL"]?.trim() || "https://api.moonshot.ai/v1";
export const OPENROUTER_BASE_URL =
  process.env["OPENROUTER_BASE_URL"]?.trim() || "https://openrouter.ai/api/v1";
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

export function isVisionCapableModel(modelId?: string): boolean {
  if (!modelId) return false;
  const lower = modelId.toLowerCase().trim();
  return (
    lower.startsWith("gemini") ||
    lower.includes("gemini") ||
    lower.includes("vision") ||
    lower.includes("-vl") ||
    lower.includes("vl-") ||
    lower.includes("4o") ||
    lower.includes("omni") ||
    lower.includes("pixtral") ||
    lower.includes("claude-3") ||
    lower === "openrouter/free"
  );
}

export type SupportedModelId =
  | "openai/gpt-oss-120b"
  | "nvidia/nemotron-3-super-120b-a12b"
  | "gemini-3.8-flash"
  | "kimi-k2.6"
  | "kimi-k2.7-code"
  | string;

export interface ModelMetadata {
  id: string;
  name: string;
  provider: "groq" | "nvidia" | "gemini" | "kimi" | "openrouter";
  badge: string;
  description: string;
  contextWindow: number;
  reasoningSupport: boolean;
  isFree?: boolean;
}

export const SUPPORTED_MODELS: Record<SupportedModelId, ModelMetadata> = {
  "openai/gpt-oss-120b": {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "groq",
    badge: "117B MoE",
    description: "OpenAI 120B Mixture-of-Experts with ultra-fast Groq LPU reasoning & tools",
    contextWindow: 131072,
    reasoningSupport: true,
  },
  "nvidia/nemotron-3-super-120b-a12b": {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron 3 Super 120B",
    provider: "nvidia",
    badge: "120B Nemotron",
    description: "NVIDIA flagship 120B MoE reasoning model running on NVIDIA NIM API",
    contextWindow: 131072,
    reasoningSupport: true,
  },
  "gemini-3.8-flash": {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    provider: "gemini",
    badge: "Multimodal",
    description:
      "Google next-gen reasoning model with multimodal analysis and live search grounding",
    contextWindow: 1048576,
    reasoningSupport: true,
  },
  "kimi-k2.6": {
    id: "kimi-k2.6",
    name: "Kimi K2.6",
    provider: "kimi",
    badge: "262K Long Context",
    description: "Moonshot AI Kimi K2.6 flagship model with 262K token context & deep reasoning",
    contextWindow: 262144,
    reasoningSupport: true,
  },
  "kimi-k2.7-code": {
    id: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    provider: "kimi",
    badge: "Code Agent",
    description: "Moonshot AI specialized coding & algorithmic reasoning model with 262K context",
    contextWindow: 262144,
    reasoningSupport: true,
  },
};

export interface LLMProvider {
  generateText(options: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<string>;
  streamText?(options: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
    onDelta: (delta: string) => void | Promise<void>;
  }): Promise<string>;
}

export class AgentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentInputError";
  }
}

export class MissingProviderKeyError extends Error {
  constructor() {
    super(
      "No AI provider credentials configured. Please set OPENROUTER_API_KEY, NVIDIA_API_KEY, KIMI_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY.",
    );
    this.name = "MissingProviderKeyError";
  }
}

export class OpenRouterProviderError extends Error {
  public readonly statusCode: number | undefined;

  override name = "OpenRouterProviderError";

  constructor(message: string, statusCode?: number, cause?: unknown) {
    super(message);
    this.statusCode = statusCode;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class KimiProviderError extends Error {
  public readonly statusCode: number | undefined;

  override name = "KimiProviderError";

  constructor(message: string, statusCode?: number, cause?: unknown) {
    super(message);
    this.statusCode = statusCode;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class NvidiaProviderError extends Error {
  public readonly statusCode: number | undefined;

  override name = "NvidiaProviderError";

  constructor(message: string, statusCode?: number, cause?: unknown) {
    super(message);
    this.statusCode = statusCode;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class GroqProviderError extends Error {
  public readonly statusCode: number | undefined;

  override name = "GroqProviderError";

  constructor(message: string, cause?: unknown) {
    super(message);
    this.statusCode =
      typeof cause === "object" && cause !== null && "status" in cause
        ? Number((cause as { status?: unknown }).status)
        : undefined;
  }
}

export function getGroqKey(): string {
  const key = process.env["GROQ_API_KEY"];

  if (!key || !key.trim()) {
    console.error("[quench] Groq API key missing");
    throw new MissingProviderKeyError();
  }

  console.info("[quench] Groq API key detected");
  return key.trim();
}

type TextMessage = { role: "user" | "assistant"; content: string };

function clipText(text: string, maximumChars: number): string {
  if (text.length <= maximumChars) return text;

  const trimNotice = "\n\n[...content trimmed to stay within the chat budget...]\n\n";
  if (maximumChars <= trimNotice.length) return text.slice(0, maximumChars);

  const availableChars = maximumChars - trimNotice.length;
  const beginning = Math.ceil(availableChars * 0.7);
  const ending = Math.floor(availableChars * 0.3);
  return `${text.slice(0, beginning)}${trimNotice}${text.slice(-ending)}`;
}

function decodeDataUrl(url: string, expectedMediaType: string): Buffer {
  const match = url.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/is);
  if (!match || match[1]?.toLowerCase() !== expectedMediaType) {
    throw new AgentInputError("One attachment could not be read. Please upload it again.");
  }

  const base64 = match[2];
  if (!base64) {
    throw new AgentInputError("One attachment could not be read. Please upload it again.");
  }

  return Buffer.from(base64.replace(/\s/g, ""), "base64");
}

/**
 * Extract text from a PDF using pdfjs-dist (legacy Node build).
 *
 * Runs on the main thread — no Web Worker — so it works on any server
 * runtime (Node, Bun, Vercel, Netlify, Cloudflare).
 *
 * Text from all pages is joined and clipped to the agent's char budget.
 */
async function extractPdfText(url: string): Promise<string> {
  const size = getDataUrlSizeInBytes(url);
  if (size === undefined || size > AGENT_LIMITS.maxAttachmentBytes) {
    throw new AgentInputError(
      `PDF attachments must be ${Math.floor(AGENT_LIMITS.maxAttachmentBytes / 1024 / 1024)} MB or smaller.`,
    );
  }

  const bytes = decodeDataUrl(url, "application/pdf");

  let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (error) {
    console.error("[quench] failed to load pdfjs-dist", error);
    throw new AgentInputError(
      "PDF support is unavailable right now. Please try again in a moment.",
    );
  }

  try {
    pdfjs.GlobalWorkerOptions.workerSrc = "";
  } catch {
    // Older versions of pdfjs may not have GlobalWorkerOptions — ignore.
  }

  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      useSystemFonts: false,
      useWorkerFetch: false,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => {
          if (item && typeof item === "object" && "str" in item) {
            return (item as { str: string }).str;
          }
          return "";
        })
        .join(" ");
      pageTexts.push(pageText);
    }

    const fullText = pageTexts.join("\n\n").trim();

    if (!fullText) {
      throw new AgentInputError(
        "That PDF has no extractable text. If it's a scanned document, paste the relevant section as text.",
      );
    }

    return clipText(fullText, AGENT_LIMITS.maxPdfChars);
  } catch (error) {
    if (error instanceof AgentInputError) throw error;
    console.error("[quench] pdf extraction failed", {
      message: error instanceof Error ? error.message : String(error),
      cause: error,
    });
    throw new AgentInputError(
      "That PDF could not be read. Try a text-based PDF or paste the relevant section.",
    );
  }
}

function extractPlainTextFile(url: string, mediaType: string): string {
  const size = getDataUrlSizeInBytes(url);
  if (size === undefined || size > AGENT_LIMITS.maxAttachmentBytes) {
    throw new AgentInputError(
      `Text attachments must be ${Math.floor(AGENT_LIMITS.maxAttachmentBytes / 1024 / 1024)} MB or smaller.`,
    );
  }

  return clipText(
    decodeDataUrl(url, mediaType).toString("utf8").trim(),
    AGENT_LIMITS.maxTextFileChars,
  );
}

async function extractAttachmentText(
  part: Extract<UIMessage["parts"][number], { type: "file" }>,
): Promise<string> {
  const mediaType = part.mediaType.toLowerCase();
  if (mediaType.startsWith("image/")) {
    return `\n\n[Attached image: ${part.filename ?? "image"}]`;
  }
  if (!SUPPORTED_ATTACHMENT_MEDIA_TYPES.has(mediaType)) {
    return `\n\n[Attached document: ${part.filename ?? "document"}]`;
  }

  try {
    const text =
      mediaType === "application/pdf"
        ? await extractPdfText(part.url)
        : extractPlainTextFile(part.url, mediaType);
    return text ? `\n\n[Attached file: ${part.filename ?? "document"}]\n${text}` : "";
  } catch (err) {
    console.warn("[bravura] extractAttachmentText fallback:", err);
    return `\n\n[Attached file: ${part.filename ?? "document"}]`;
  }
}

function trimConversation(messages: TextMessage[]): TextMessage[] {
  let remainingChars = AGENT_LIMITS.maxContextChars;
  const selected: TextMessage[] = [];

  for (let index = messages.length - 1; index >= 0 && remainingChars > 0; index -= 1) {
    const message = messages[index];
    if (!message) continue;

    const content = clipText(message.content, remainingChars);
    selected.push({ ...message, content });
    remainingChars -= content.length;
  }

  return selected.reverse();
}

export async function mapUiMessagesToGroq(messages: UIMessage[]): Promise<TextMessage[]> {
  const recentMessages = messages.slice(-AGENT_LIMITS.maxMessages);
  const latestUserMessageIndex = recentMessages.map((message) => message.role).lastIndexOf("user");

  const mapped = await Promise.all(
    recentMessages.map(async (message, index) => {
      if (message.role !== "user" && message.role !== "assistant") return null;

      const textParts = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text);
      const attachmentParts =
        index === latestUserMessageIndex
          ? message.parts.filter(
              (part): part is Extract<(typeof message.parts)[number], { type: "file" }> =>
                part.type === "file",
            )
          : [];

      const attachmentText = await Promise.all(attachmentParts.map(extractAttachmentText));
      const content = [...textParts, ...attachmentText].join("\n").trim();
      return content ? { role: message.role, content } : null;
    }),
  );

  return trimConversation(mapped.filter((message): message is TextMessage => message !== null));
}

export class ModelProvider implements LLMProvider {
  constructor(
    public readonly model: LanguageModel,
    public readonly modelName: string,
    public readonly isGroq = false,
  ) {}

  async generateText({
    systemPrompt,
    messages,
    deepThink,
    abortSignal,
    maxOutputTokens,
    temperature,
  }: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<string> {
    try {
      const groqProviderOptions =
        this.isGroq && this.modelName.startsWith("openai/gpt-oss-")
          ? {
              groq: {
                reasoningEffort: deepThink ? "medium" : "low",
                reasoningFormat: "hidden",
              },
            }
          : undefined;

      const defaultMaxTokens = deepThink
        ? AGENT_LIMITS.maxDeepThinkOutputTokens
        : AGENT_LIMITS.maxOutputTokens;

      const result = await generateText({
        model: this.model,
        system: systemPrompt,
        messages: await mapUiMessagesToGroq(messages),
        maxOutputTokens: maxOutputTokens ?? defaultMaxTokens,
        temperature: temperature ?? (deepThink ? 0.45 : 0.3),
        maxRetries: 0,
        ...(abortSignal ? { abortSignal } : {}),
        ...(groqProviderOptions ? { providerOptions: groqProviderOptions } : {}),
      });

      console.info("[quench] model usage", {
        model: this.modelName,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        totalTokens: result.usage?.totalTokens,
      });

      if (result.text && result.text.trim().length > 0) {
        return result.text.trim();
      }

      throw new GroqProviderError("AI model returned an empty response.");
    } catch (error) {
      if (error instanceof AgentInputError) {
        console.warn("[quench] attachment rejected", { message: error.message });
        throw error;
      }

      const statusCode =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: unknown }).status)
          : undefined;

      console.error("[quench] model request failed", {
        statusCode,
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      });

      throw new GroqProviderError("AI model request failed.", error);
    }
  }
}

export class GroqProvider extends ModelProvider {
  constructor(apiKey: string, modelName: string = GROQ_MODEL) {
    const client = createGroq({ apiKey });
    super(client(modelName), modelName, true);
  }
}

export class GeminiCompatibleProvider extends ModelProvider {
  constructor(apiKey: string) {
    const client = createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey,
    });
    super(client(GEMINI_MODEL), GEMINI_MODEL, false);
  }
}

export class OpenAICompatibleProvider extends ModelProvider {
  constructor(apiKey: string) {
    const client = createOpenAICompatible({
      name: "openai",
      apiKey,
    });
    super(client("gpt-4o-mini"), "gpt-4o-mini", false);
  }
}

export function mapUiMessagesToGemini(messages: UIMessage[]) {
  const contents = [];
  const recentMessages = messages.slice(-AGENT_LIMITS.maxMessages);

  for (const m of recentMessages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const role = m.role === "assistant" ? "model" : "user";
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    for (const p of m.parts) {
      if (p.type === "text" && p.text) {
        parts.push({ text: p.text });
      } else if (p.type === "file" && typeof p.url === "string") {
        const match = p.url.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/is);
        if (match && match[1] && match[2]) {
          const mimeType = match[1].toLowerCase().trim();
          const base64Data = match[2].replace(/\s/g, "");
          if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          } else {
            try {
              const textContent = Buffer.from(base64Data, "base64").toString("utf-8");
              if (textContent && !textContent.startsWith("%PDF")) {
                parts.push({
                  text: `\n[Attached document: ${p.filename || "file"}]\n${textContent}`,
                });
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  return contents;
}

export class GeminiNativeProvider implements LLMProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  async generateText({
    systemPrompt,
    messages,
    deepThink,
    maxOutputTokens,
    temperature,
  }: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<string> {
    try {
      const contents = mapUiMessagesToGemini(messages);

      if (contents.length === 0) {
        throw new GroqProviderError("No message contents to send to Gemini.");
      }

      const response = await this.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: temperature ?? (deepThink ? 0.35 : 0.7),
          topP: 0.95,
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new GroqProviderError("Gemini returned an empty response.");
      }
      return text;
    } catch (err) {
      if (err instanceof GroqProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      console.error("[bravura] Gemini native provider error:", message);
      throw new GroqProviderError(`Gemini model error: ${message}`, err);
    }
  }

  async streamText({
    systemPrompt,
    messages,
    deepThink,
    abortSignal,
    maxOutputTokens,
    temperature,
    onDelta,
  }: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
    onDelta: (delta: string) => void | Promise<void>;
  }): Promise<string> {
    try {
      const contents = mapUiMessagesToGemini(messages);

      if (contents.length === 0) {
        throw new GroqProviderError("No message contents to send to Gemini.");
      }

      const responseStream = await this.ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: temperature ?? (deepThink ? 0.35 : 0.7),
          topP: 0.95,
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        },
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        if (abortSignal?.aborted) break;
        const text = chunk.text;
        if (text) {
          fullText += text;
          await onDelta(text);
        }
      }

      return fullText;
    } catch (err) {
      if (err instanceof GroqProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      console.error("[bravura] Gemini native streaming error:", message);
      throw new GroqProviderError(`Gemini model streaming error: ${message}`, err);
    }
  }
}

export class NvidiaProvider implements LLMProvider {
  constructor(
    public readonly apiKey: string,
    public readonly modelName: string = NVIDIA_MODEL,
  ) {}

  async generateText({
    systemPrompt,
    messages,
    deepThink,
    abortSignal,
    maxOutputTokens,
    temperature,
  }: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const startTime = Date.now();
    try {
      console.info("[bravura] Dispatching NVIDIA API request", {
        provider: "NVIDIA",
        model: this.modelName,
        deepThink,
      });

      const hasImages = messages.some((m) =>
        m.parts?.some(
          (p) =>
            p.type === "file" &&
            (p.mediaType?.startsWith("image/") ||
              (typeof p.url === "string" && p.url.startsWith("data:image/"))),
        ),
      );

      const activeModel =
        hasImages && !this.modelName.includes("vision") && !this.modelName.includes("vl")
          ? "meta/llama-3.2-11b-vision-instruct"
          : this.modelName;

      let apiMessages: Array<{ role: string; content: unknown }>;
      if (hasImages) {
        apiMessages = [
          { role: "system", content: systemPrompt },
          ...mapUiMessagesToOpenRouter(messages),
        ];
      } else {
        const textMessages = await mapUiMessagesToGroq(messages);
        apiMessages = [
          { role: "system", content: systemPrompt },
          ...textMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];
      }

      const defaultMaxTokens = deepThink
        ? AGENT_LIMITS.maxDeepThinkOutputTokens
        : AGENT_LIMITS.maxOutputTokens;

      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: activeModel,
          messages: apiMessages,
          max_tokens: maxOutputTokens ?? defaultMaxTokens,
          temperature: temperature ?? (deepThink ? 0.3 : 0.6),
          top_p: 0.95,
        }),
        ...(abortSignal ? { signal: abortSignal } : {}),
      });

      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        let errBody: Record<string, unknown> = {};
        try {
          errBody = (await res.json()) as Record<string, unknown>;
        } catch {
          // non-json response
        }

        const errorDetail =
          (errBody.detail as string) ||
          (errBody.title as string) ||
          ((errBody.error as { message?: string })?.message as string) ||
          `HTTP ${res.status}`;

        console.error("[bravura] NVIDIA API error response", {
          provider: "NVIDIA",
          model: this.modelName,
          status: res.status,
          latencyMs: durationMs,
          errorDetail,
        });

        if (res.status === 401 || res.status === 403) {
          throw new NvidiaProviderError(
            "The NVIDIA API key is invalid, forbidden, or expired. Please verify your NVIDIA_API_KEY environment variable.",
            res.status,
          );
        }
        if (res.status === 404) {
          throw new NvidiaProviderError(
            `The requested NVIDIA model (${this.modelName}) is not available on this endpoint.`,
            404,
          );
        }
        if (res.status === 429) {
          throw new NvidiaProviderError(
            "NVIDIA API rate limit exceeded. Please try again in a moment.",
            429,
          );
        }
        if (res.status === 504 || res.status === 503) {
          throw new NvidiaProviderError(
            "NVIDIA API service timed out or is temporarily unavailable.",
            res.status,
          );
        }

        throw new NvidiaProviderError(`NVIDIA API error: ${errorDetail}`, res.status);
      }

      const data = (await res.json()) as {
        choices?: Array<{
          message?: { content?: string; reasoning_content?: string };
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const choice = data.choices?.[0]?.message;
      let text = choice?.content?.trim();

      // If text content is empty but reasoning content exists
      if (!text && choice?.reasoning_content) {
        text = choice.reasoning_content.trim();
      }

      if (!text) {
        throw new NvidiaProviderError("NVIDIA model returned an empty response.", 500);
      }

      console.info("[bravura] NVIDIA API response received successfully", {
        provider: "NVIDIA",
        model: this.modelName,
        status: 200,
        latencyMs: durationMs,
        tokens: data.usage?.total_tokens,
      });

      return text;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      if (err instanceof NvidiaProviderError || err instanceof AgentInputError) {
        throw err;
      }
      const isAbort = (err instanceof Error && err.name === "AbortError") || abortSignal?.aborted;
      if (isAbort) {
        console.info("[bravura] NVIDIA request aborted by user", {
          provider: "NVIDIA",
          model: this.modelName,
          latencyMs: durationMs,
        });
        throw err;
      }

      const msg = err instanceof Error ? err.message : String(err);
      console.error("[bravura] NVIDIA request execution failed", {
        provider: "NVIDIA",
        model: this.modelName,
        latencyMs: durationMs,
        errorMessage: msg,
      });
      throw new NvidiaProviderError(`NVIDIA request failed: ${msg}`, 500, err);
    }
  }
}

export class KimiProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    public readonly modelName: string = KIMI_MODEL,
    private readonly baseURL: string = KIMI_BASE_URL,
  ) {}

  async generateText({
    systemPrompt,
    messages,
    deepThink,
    abortSignal,
    maxOutputTokens,
    temperature,
  }: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const startTime = Date.now();
    try {
      console.info("[bravura] Dispatching Kimi (Moonshot AI) API request", {
        provider: "Kimi",
        model: this.modelName,
        deepThink,
      });

      const textMessages = await mapUiMessagesToGroq(messages);
      const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...textMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const defaultMaxTokens = deepThink
        ? AGENT_LIMITS.maxDeepThinkOutputTokens
        : AGENT_LIMITS.maxOutputTokens;

      const endpoint = `${this.baseURL.replace(/\/+$/, "")}/chat/completions`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: apiMessages,
          max_tokens: maxOutputTokens ?? defaultMaxTokens,
          temperature: temperature ?? (deepThink ? 0.3 : 0.6),
        }),
        ...(abortSignal ? { signal: abortSignal } : {}),
      });

      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        let errBody: Record<string, unknown> = {};
        try {
          errBody = (await res.json()) as Record<string, unknown>;
        } catch {
          // non-json response
        }

        const errObj = (errBody.error as { message?: string; type?: string }) || {};
        const errorType = (errObj.type as string) || "";
        const errorDetail =
          errObj.message ||
          (errBody.message as string) ||
          (errBody.detail as string) ||
          `HTTP ${res.status}`;

        const isQuotaNotice =
          res.status === 402 ||
          res.status === 429 ||
          errorType === "exceeded_current_quota_error" ||
          errorDetail.toLowerCase().includes("balance") ||
          errorDetail.toLowerCase().includes("quota");

        if (isQuotaNotice) {
          console.warn("[bravura] Kimi account notice (insufficient balance / quota)", {
            provider: "Kimi",
            model: this.modelName,
            status: res.status,
            latencyMs: durationMs,
            errorType,
            errorDetail,
          });
        } else {
          console.error("[bravura] Kimi API unexpected error", {
            provider: "Kimi",
            model: this.modelName,
            status: res.status,
            latencyMs: durationMs,
            errorType,
            errorDetail,
          });
        }

        if (isQuotaNotice) {
          throw new KimiProviderError(
            `Kimi (Moonshot AI) quota exceeded: ${errorDetail}. Please check your Moonshot account balance or choose Nemotron / Gemini / Groq.`,
            res.status,
          );
        }

        if (res.status === 401 || res.status === 403) {
          throw new KimiProviderError(
            "The Kimi API key is invalid or unauthorized. Please verify your KIMI_API_KEY.",
            res.status,
          );
        }

        throw new KimiProviderError(`Kimi API error: ${errorDetail}`, res.status);
      }

      const data = (await res.json()) as {
        choices?: Array<{
          message?: { content?: string; reasoning_content?: string };
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const choice = data.choices?.[0]?.message;
      let text = choice?.content?.trim();

      if (!text && choice?.reasoning_content) {
        text = choice.reasoning_content.trim();
      }

      if (!text) {
        throw new KimiProviderError("Kimi model returned an empty response.", 500);
      }

      console.info("[bravura] Kimi API response received successfully", {
        provider: "Kimi",
        model: this.modelName,
        status: 200,
        latencyMs: durationMs,
        tokens: data.usage?.total_tokens,
      });

      return text;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      if (err instanceof KimiProviderError || err instanceof AgentInputError) {
        throw err;
      }
      const isAbort = (err instanceof Error && err.name === "AbortError") || abortSignal?.aborted;
      if (isAbort) {
        console.info("[bravura] Kimi request aborted by user", {
          provider: "Kimi",
          model: this.modelName,
          latencyMs: durationMs,
        });
        throw err;
      }

      const msg = err instanceof Error ? err.message : String(err);
      console.error("[bravura] Kimi request execution failed", {
        provider: "Kimi",
        model: this.modelName,
        latencyMs: durationMs,
        errorMessage: msg,
      });
      throw new KimiProviderError(`Kimi request failed: ${msg}`, 500, err);
    }
  }
}

export function mapUiMessagesToOpenRouter(messages: UIMessage[]) {
  const recentMessages = messages.slice(-AGENT_LIMITS.maxMessages);
  const result: Array<{
    role: "system" | "user" | "assistant";
    content:
      | string
      | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
  }> = [];

  for (const m of recentMessages) {
    if (m.role !== "user" && m.role !== "assistant") continue;

    const textParts = m.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();

    const fileParts = m.parts.filter(
      (p): p is Extract<(typeof m.parts)[number], { type: "file" }> => p.type === "file",
    );

    const hasImages = fileParts.some(
      (p) => p.mediaType?.startsWith("image/") || p.url?.startsWith("data:image/"),
    );

    if (hasImages && m.role === "user") {
      const contentParts: Array<
        { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
      > = [];

      if (textParts) {
        contentParts.push({ type: "text", text: textParts });
      }

      for (const f of fileParts) {
        if (f.mediaType?.startsWith("image/") || f.url?.startsWith("data:image/")) {
          contentParts.push({
            type: "image_url",
            image_url: { url: f.url },
          });
        }
      }

      result.push({ role: m.role, content: contentParts });
    } else {
      let content = textParts;
      for (const f of fileParts) {
        if (!f.mediaType?.startsWith("image/")) {
          try {
            const match = f.url.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/is);
            if (match && match[2]) {
              const textContent = Buffer.from(match[2], "base64").toString("utf-8");
              if (textContent && !textContent.startsWith("%PDF")) {
                content += `\n\n[Attached document: ${f.filename || "file"}]\n${textContent}`;
              }
            }
          } catch {
            // ignore
          }
        }
      }
      if (content) {
        result.push({ role: m.role, content });
      }
    }
  }

  return result;
}

export class OpenRouterProvider implements LLMProvider {
  constructor(
    public readonly apiKey: string,
    public readonly modelName: string = DEFAULT_OPENROUTER_MODEL,
    public readonly baseURL: string = OPENROUTER_BASE_URL,
  ) {}

  async generateText({
    systemPrompt,
    messages,
    deepThink,
    abortSignal,
    maxOutputTokens,
    temperature,
  }: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const startTime = Date.now();
    try {
      console.info("[bravura] Dispatching OpenRouter API request", {
        provider: "OpenRouter",
        model: this.modelName,
        deepThink,
      });

      const hasImages = messages.some((m) =>
        m.parts?.some(
          (p) =>
            p.type === "file" &&
            (p.mediaType?.startsWith("image/") ||
              (typeof p.url === "string" && p.url.startsWith("data:image/"))),
        ),
      );

      const targetModel =
        hasImages && !isVisionCapableModel(this.modelName)
          ? DEFAULT_OPENROUTER_MODEL
          : this.modelName;

      const apiMessages = [
        { role: "system" as const, content: systemPrompt },
        ...mapUiMessagesToOpenRouter(messages),
      ];

      const defaultMaxTokens = deepThink
        ? AGENT_LIMITS.maxDeepThinkOutputTokens
        : AGENT_LIMITS.maxOutputTokens;

      const endpoint = `${this.baseURL.replace(/\/+$/, "")}/chat/completions`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://bravura.ai",
          "X-Title": "Bravura AI",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: targetModel,
          messages: apiMessages,
          max_tokens: maxOutputTokens ?? defaultMaxTokens,
          temperature: temperature ?? (deepThink ? 0.3 : 0.6),
          top_p: 0.95,
        }),
        ...(abortSignal ? { signal: abortSignal } : {}),
      });

      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        let errBody: Record<string, unknown> = {};
        try {
          errBody = (await res.json()) as Record<string, unknown>;
        } catch {
          // non-json response
        }

        const errObj =
          (errBody.error as { message?: string; code?: number; metadata?: { raw?: string } }) || {};
        const errorDetail =
          errObj.message ||
          (errBody.message as string) ||
          (errBody.detail as string) ||
          `HTTP ${res.status}`;

        console.error("[bravura] OpenRouter API error response", {
          provider: "OpenRouter",
          model: this.modelName,
          status: res.status,
          latencyMs: durationMs,
          errorDetail,
        });

        if (res.status === 401) {
          throw new OpenRouterProviderError(
            "The OpenRouter API key is invalid or unauthorized. Please verify your OPENROUTER_API_KEY environment variable.",
            401,
          );
        }
        if (res.status === 403) {
          throw new OpenRouterProviderError(
            `Access to OpenRouter model (${this.modelName}) was denied (HTTP 403). Please verify model permissions or select another model.`,
            403,
          );
        }

        // Automatic seamless failover if a specific model is offline, decommissioned (404/400), or rate-limited
        const isModelAvailabilityError =
          res.status === 400 ||
          res.status === 404 ||
          res.status === 429 ||
          res.status >= 500 ||
          /not found|decommissioned|unknown model|does not exist/i.test(errorDetail);

        if (isModelAvailabilityError) {
          const fallbackModel =
            this.modelName !== DEFAULT_OPENROUTER_MODEL
              ? DEFAULT_OPENROUTER_MODEL
              : "nvidia/nemotron-3.5-lightning:free";

          if (this.modelName !== fallbackModel) {
            console.warn(
              `[bravura] OpenRouter model (${this.modelName}) returned HTTP ${res.status} (${errorDetail}). Automatically routing to ${fallbackModel}...`,
            );
            const fallbackProvider = new OpenRouterProvider(
              this.apiKey,
              fallbackModel,
              this.baseURL,
            );
            return await fallbackProvider.generateText({
              systemPrompt,
              messages,
              deepThink,
              abortSignal,
              maxOutputTokens,
              temperature,
            });
          }
        }

        if (res.status === 404) {
          throw new OpenRouterProviderError(
            `The requested OpenRouter model (${this.modelName}) was not found or is currently decommissioned.`,
            404,
          );
        }
        if (res.status === 429) {
          throw new OpenRouterProviderError(
            `OpenRouter rate limit reached or upstream model provider is temporarily busy for ${this.modelName}. Please try again shortly or switch to the Free Models Router (openrouter/free).`,
            429,
          );
        }
        if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
          throw new OpenRouterProviderError(
            "OpenRouter or upstream model service is temporarily unavailable. Please try again in a few moments.",
            res.status,
          );
        }

        throw new OpenRouterProviderError(`OpenRouter API error: ${errorDetail}`, res.status);
      }

      const data = (await res.json()) as {
        choices?: Array<{
          message?: { content?: string; reasoning?: string; reasoning_content?: string };
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const choice = data.choices?.[0]?.message;
      let text = choice?.content?.trim();

      if (!text && (choice?.reasoning || choice?.reasoning_content)) {
        text = (choice.reasoning || choice.reasoning_content)?.trim();
      }

      if (!text) {
        throw new OpenRouterProviderError("OpenRouter model returned an empty response.", 500);
      }

      console.info("[bravura] OpenRouter API response received successfully", {
        provider: "OpenRouter",
        model: this.modelName,
        status: 200,
        latencyMs: durationMs,
        tokens: data.usage?.total_tokens,
      });

      return text;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      if (err instanceof OpenRouterProviderError || err instanceof AgentInputError) {
        throw err;
      }
      const isAbort = (err instanceof Error && err.name === "AbortError") || abortSignal?.aborted;
      if (isAbort) {
        console.info("[bravura] OpenRouter request aborted by user", {
          provider: "OpenRouter",
          model: this.modelName,
          latencyMs: durationMs,
        });
        throw err;
      }

      const msg = err instanceof Error ? err.message : String(err);
      console.error("[bravura] OpenRouter request execution failed", {
        provider: "OpenRouter",
        model: this.modelName,
        latencyMs: durationMs,
        errorMessage: msg,
      });
      throw new OpenRouterProviderError(`OpenRouter request failed: ${msg}`, 500, err);
    }
  }

  async streamText({
    systemPrompt,
    messages,
    deepThink,
    abortSignal,
    maxOutputTokens,
    temperature,
    onDelta,
  }: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
    onDelta: (delta: string) => void | Promise<void>;
  }): Promise<string> {
    const startTime = Date.now();
    try {
      console.info("[bravura] Dispatching OpenRouter streaming request", {
        provider: "OpenRouter",
        model: this.modelName,
        deepThink,
      });

      const hasImages = messages.some((m) =>
        m.parts?.some(
          (p) =>
            p.type === "file" &&
            (p.mediaType?.startsWith("image/") ||
              (typeof p.url === "string" && p.url.startsWith("data:image/"))),
        ),
      );

      const targetModel =
        hasImages && !isVisionCapableModel(this.modelName)
          ? DEFAULT_OPENROUTER_MODEL
          : this.modelName;

      const apiMessages = [
        { role: "system" as const, content: systemPrompt },
        ...mapUiMessagesToOpenRouter(messages),
      ];

      const defaultMaxTokens = deepThink
        ? AGENT_LIMITS.maxDeepThinkOutputTokens
        : AGENT_LIMITS.maxOutputTokens;

      const endpoint = `${this.baseURL.replace(/\/+$/, "")}/chat/completions`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://bravura.ai",
          "X-Title": "Bravura AI",
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: targetModel,
          messages: apiMessages,
          stream: true,
          max_tokens: maxOutputTokens ?? defaultMaxTokens,
          temperature: temperature ?? (deepThink ? 0.3 : 0.6),
          top_p: 0.95,
        }),
        ...(abortSignal ? { signal: abortSignal } : {}),
      });

      if (!res.ok) {
        let errBody: Record<string, unknown> = {};
        try {
          errBody = (await res.json()) as Record<string, unknown>;
        } catch {
          // ignore non-json
        }
        const errObj = (errBody.error as { message?: string }) || {};
        const errorDetail = errObj.message || (errBody.message as string) || `HTTP ${res.status}`;

        if (res.status === 401) {
          throw new OpenRouterProviderError(
            "The OpenRouter API key is invalid or unauthorized. Please verify your OPENROUTER_API_KEY environment variable.",
            401,
          );
        }
        if (res.status === 403) {
          throw new OpenRouterProviderError(
            `Access to OpenRouter model (${this.modelName}) was denied (HTTP 403).`,
            403,
          );
        }

        // Automatic seamless failover if a specific model is offline, decommissioned (404/400), or rate-limited
        const isModelAvailabilityError =
          res.status === 400 ||
          res.status === 404 ||
          res.status === 429 ||
          res.status >= 500 ||
          /not found|decommissioned|unknown model|does not exist/i.test(errorDetail);

        if (isModelAvailabilityError) {
          const fallbackModel =
            this.modelName !== DEFAULT_OPENROUTER_MODEL
              ? DEFAULT_OPENROUTER_MODEL
              : "nvidia/nemotron-3.5-lightning:free";

          if (this.modelName !== fallbackModel) {
            console.warn(
              `[bravura] OpenRouter model (${this.modelName}) returned HTTP ${res.status} (${errorDetail}). Seamlessly falling back to ${fallbackModel}...`,
            );
            const fallbackProvider = new OpenRouterProvider(
              this.apiKey,
              fallbackModel,
              this.baseURL,
            );
            return await fallbackProvider.streamText({
              systemPrompt,
              messages,
              deepThink,
              abortSignal,
              maxOutputTokens,
              temperature,
              onDelta,
            });
          }
        }

        if (res.status === 404) {
          throw new OpenRouterProviderError(
            `The requested OpenRouter model (${this.modelName}) was not found or is currently decommissioned.`,
            404,
          );
        }
        if (res.status === 429) {
          throw new OpenRouterProviderError(
            `OpenRouter rate limit reached for ${this.modelName}. Please try again shortly or select openrouter/free.`,
            429,
          );
        }
        throw new OpenRouterProviderError(`OpenRouter streaming error: ${errorDetail}`, res.status);
      }

      if (!res.body) {
        throw new OpenRouterProviderError("OpenRouter returned an empty stream body.", 500);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";
      let fullReasoning = "";
      let buffer = "";

      try {
        while (true) {
          if (abortSignal?.aborted) {
            await reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || !line.startsWith("data:")) continue;
            const dataStr = line.slice(5).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const chunk = JSON.parse(dataStr) as {
                choices?: Array<{
                  delta?: { content?: string; reasoning?: string; reasoning_content?: string };
                }>;
              };
              const delta = chunk.choices?.[0]?.delta;
              if (delta) {
                if (delta.content) {
                  fullContent += delta.content;
                  await onDelta(delta.content);
                } else if (delta.reasoning || delta.reasoning_content) {
                  const reasoningDelta = delta.reasoning || delta.reasoning_content || "";
                  fullReasoning += reasoningDelta;
                  if (deepThink) {
                    await onDelta(reasoningDelta);
                  }
                }
              }
            } catch {
              // ignore partial chunk json
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!fullContent && fullReasoning && !deepThink) {
        await onDelta(fullReasoning);
        fullContent = fullReasoning;
      }

      const durationMs = Date.now() - startTime;
      console.info("[bravura] OpenRouter streaming completed successfully", {
        provider: "OpenRouter",
        model: this.modelName,
        latencyMs: durationMs,
        chars: fullContent.length,
      });

      return fullContent;
    } catch (err) {
      if (err instanceof OpenRouterProviderError) throw err;
      const isAbort = (err instanceof Error && err.name === "AbortError") || abortSignal?.aborted;
      if (isAbort) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new OpenRouterProviderError(`OpenRouter streaming failed: ${msg}`, 500, err);
    }
  }
}

/**
 * Resolves the active LLM Provider based on explicit user preference,
 * model identifier, or configured API credentials.
 * Supports OpenRouter, Kimi (Moonshot AI), Nemotron 3 Super 120B (NVIDIA), GPT-OSS 120B (Groq), and Gemini 3.8 Flash.
 */
export function resolveProvider(preferredModel?: string, preferredProvider?: string): LLMProvider {
  const modelToUse = preferredModel?.trim();
  const openrouterKey = process.env["OPENROUTER_API_KEY"]?.trim();
  const kimiKey = process.env["KIMI_API_KEY"]?.trim() || process.env["MOONSHOT_API_KEY"]?.trim();
  const nvidiaKey = process.env["NVIDIA_API_KEY"]?.trim();
  const groqKey = process.env["GROQ_API_KEY"]?.trim();
  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();

  // Helper to test if model identifier belongs to OpenRouter
  const isOpenRouterTarget =
    preferredProvider === "openrouter" ||
    modelToUse === "openrouter" ||
    modelToUse === "openrouter/free" ||
    Boolean(modelToUse?.startsWith("openrouter/")) ||
    (Boolean(modelToUse?.includes(":free")) &&
      !modelToUse?.startsWith("gemini") &&
      !modelToUse?.startsWith("kimi")) ||
    (Boolean(modelToUse?.includes("/")) &&
      modelToUse !== "openai/gpt-oss-120b" &&
      modelToUse !== "nvidia/nemotron-3-super-120b-a12b" &&
      modelToUse !== "mistralai/mistral-nemotron");

  // 1. Explicit request for OpenRouter
  if (isOpenRouterTarget) {
    if (openrouterKey) {
      const activeOpenRouterModel =
        modelToUse?.startsWith("openrouter/") && modelToUse !== "openrouter/free"
          ? modelToUse.replace(/^openrouter\//, "")
          : modelToUse || DEFAULT_OPENROUTER_MODEL;
      console.info(
        `[bravura] Routing AI request directly to OpenRouter API (${activeOpenRouterModel})`,
      );
      return new OpenRouterProvider(openrouterKey, activeOpenRouterModel);
    }
    console.warn(
      "[bravura] OpenRouter model requested but OPENROUTER_API_KEY missing, attempting fallback...",
    );
  }

  // 2. Explicit request for Kimi / Moonshot
  if (
    modelToUse === "kimi-k2.6" ||
    modelToUse === "kimi-k2.7-code" ||
    modelToUse === "kimi" ||
    modelToUse?.startsWith("kimi-") ||
    modelToUse?.startsWith("moonshot-") ||
    preferredProvider === "kimi" ||
    preferredProvider === "moonshot"
  ) {
    if (kimiKey) {
      const activeKimiModel =
        modelToUse === "kimi-k2.7-code"
          ? "kimi-k2.7-code"
          : modelToUse && modelToUse.startsWith("kimi-")
            ? modelToUse
            : KIMI_MODEL;
      console.info(
        `[bravura] Routing AI request directly to Kimi Moonshot API (${activeKimiModel})`,
      );
      return new KimiProvider(kimiKey, activeKimiModel);
    }
    console.warn("[bravura] Kimi model requested but KIMI_API_KEY missing, attempting fallback...");
  }

  // 3. Explicit request for NVIDIA or Nemotron
  if (
    modelToUse === "nvidia/nemotron-3-super-120b-a12b" ||
    modelToUse === "nemotron" ||
    modelToUse === "mistralai/mistral-nemotron" ||
    modelToUse?.startsWith("nvidia/") ||
    preferredProvider === "nvidia"
  ) {
    if (nvidiaKey) {
      const activeNvidiaModel =
        modelToUse && (modelToUse.startsWith("nvidia/") || modelToUse.startsWith("mistralai/"))
          ? modelToUse
          : NVIDIA_MODEL;
      console.info(
        `[bravura] Routing AI request directly to NVIDIA NIM API (${activeNvidiaModel})`,
      );
      return new NvidiaProvider(nvidiaKey, activeNvidiaModel);
    }
    console.warn(
      "[bravura] NVIDIA model requested but NVIDIA_API_KEY missing, attempting fallback...",
    );
  }

  // 4. Explicit request for GPT-OSS 120B or Groq provider
  if (
    modelToUse === "openai/gpt-oss-120b" ||
    modelToUse === "gpt-oss-120b" ||
    preferredProvider === "groq"
  ) {
    if (groqKey) {
      console.info("[bravura] Routing AI request directly to GPT-OSS 120B via Groq LPU");
      return new GroqProvider(groqKey, "openai/gpt-oss-120b");
    }
    console.warn(
      "[bravura] GPT-OSS 120B requested but GROQ_API_KEY missing, falling back to other providers",
    );
  }

  // 5. Explicit request for Gemini
  if (
    modelToUse === "gemini-3.8-flash" ||
    modelToUse === "gemini" ||
    preferredProvider === "gemini"
  ) {
    if (geminiKey && geminiKey.startsWith("AIzaSy")) {
      console.info("[bravura] Routing AI request to Gemini Native Provider (gemini-3.8-flash)");
      return new GeminiNativeProvider(geminiKey);
    }
    if (geminiKey) {
      console.info("[bravura] Routing AI request to Gemini Compatible Provider");
      return new GeminiCompatibleProvider(geminiKey);
    }
  }

  // 6. Default priority if specific model not explicitly forced:
  // If OpenRouter is requested or configured as primary
  if (openrouterKey && (modelToUse?.includes("openrouter") || modelToUse?.includes(":free"))) {
    console.info(`[bravura] Active model: ${DEFAULT_OPENROUTER_MODEL} (OpenRouter Provider)`);
    return new OpenRouterProvider(openrouterKey, DEFAULT_OPENROUTER_MODEL);
  }

  // If Kimi is configured, use Kimi
  if (kimiKey && (modelToUse?.startsWith("kimi") || !nvidiaKey)) {
    console.info(`[bravura] Active model: ${KIMI_MODEL} (Kimi Provider)`);
    return new KimiProvider(kimiKey, KIMI_MODEL);
  }

  // If NVIDIA is configured, use Nemotron
  if (nvidiaKey) {
    console.info(`[bravura] Active model: ${NVIDIA_MODEL} (NVIDIA Provider)`);
    return new NvidiaProvider(nvidiaKey, NVIDIA_MODEL);
  }

  // If Groq is configured, use fast GPT-OSS 120B
  if (groqKey) {
    console.info(`[bravura] Active model: ${GROQ_MODEL} (Groq Provider)`);
    return new GroqProvider(groqKey, GROQ_MODEL);
  }

  // If OpenRouter is configured, fallback to OpenRouter Free Router
  if (openrouterKey) {
    console.info(
      `[bravura] Active model: ${DEFAULT_OPENROUTER_MODEL} (OpenRouter Provider fallback)`,
    );
    return new OpenRouterProvider(openrouterKey, DEFAULT_OPENROUTER_MODEL);
  }

  // Fallback to Kimi if key present
  if (kimiKey) {
    console.info(`[bravura] Active model: ${KIMI_MODEL} (Kimi Provider)`);
    return new KimiProvider(kimiKey, KIMI_MODEL);
  }

  // Fallback to Gemini
  if (geminiKey && geminiKey.startsWith("AIzaSy")) {
    console.info("[bravura] Active model: gemini-3.8-flash (Gemini Provider)");
    return new GeminiNativeProvider(geminiKey);
  }

  const openAiKey = process.env["OPENAI_API_KEY"]?.trim();
  if (openAiKey) {
    return new OpenAICompatibleProvider(openAiKey);
  }

  if (geminiKey) {
    return new GeminiNativeProvider(geminiKey);
  }

  throw new MissingProviderKeyError();
}
