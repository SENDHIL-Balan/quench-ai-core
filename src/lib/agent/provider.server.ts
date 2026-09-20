import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import type { LanguageModel, UIMessage } from "ai";
import {
  AGENT_LIMITS,
  getDataUrlSizeInBytes,
  SUPPORTED_ATTACHMENT_MEDIA_TYPES,
} from "./limits.server";

export const GROQ_MODEL = process.env["GROQ_MODEL"]?.trim() || "openai/gpt-oss-20b";
export const GEMINI_MODEL = process.env["GEMINI_MODEL"]?.trim() || "gemini-2.5-flash";

export interface LLMProvider {
  generateText(options: {
    systemPrompt: string;
    messages: UIMessage[];
    deepThink: boolean;
    abortSignal?: AbortSignal;
    maxOutputTokens?: number;
    temperature?: number;
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
    super("No AI provider credentials configured. Please set GEMINI_API_KEY or GROQ_API_KEY.");
    this.name = "MissingProviderKeyError";
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
  if (!SUPPORTED_ATTACHMENT_MEDIA_TYPES.has(mediaType)) {
    throw new AgentInputError("Supported attachments are PDF, TXT, Markdown, CSV, and JSON files.");
  }

  const text =
    mediaType === "application/pdf"
      ? await extractPdfText(part.url)
      : extractPlainTextFile(part.url, mediaType);
  return text ? `\n\n[Attached file: ${part.filename ?? "document"}]\n${text}` : "";
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
        temperature: temperature ?? (deepThink ? 0.55 : 0.72),
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
  constructor(apiKey: string) {
    const client = createGroq({ apiKey });
    super(client(GROQ_MODEL), GROQ_MODEL, true);
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

export function resolveProvider(): LLMProvider {
  const groqKey = process.env["GROQ_API_KEY"]?.trim();
  if (groqKey) {
    return new GroqProvider(groqKey);
  }

  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
  if (geminiKey && geminiKey.startsWith("AIzaSy")) {
    return new GeminiCompatibleProvider(geminiKey);
  }

  const openAiKey = process.env["OPENAI_API_KEY"]?.trim();
  if (openAiKey) {
    return new OpenAICompatibleProvider(openAiKey);
  }

  if (geminiKey) {
    return new GeminiCompatibleProvider(geminiKey);
  }

  throw new MissingProviderKeyError();
}
