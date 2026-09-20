<<<<<<< HEAD
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { buildSystemPrompt, type ModeId } from "./modes";
import { AgentInputError, GroqProviderError, resolveProvider } from "./provider.server";
import { searchWeb } from "@/lib/tools/web-search.server";
import { formatSearchForPrompt } from "@/lib/tools/format-search";
import { WebSearchError } from "@/lib/tools/web-search-types";

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

/** Extract the last text part from the last user message. Used as the search query. */
function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== "user") continue;
    const text = message.parts
      .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
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

export async function runBaseAgent({
  messages,
  mode,
  deepThink = false,
  webSearch = false,
  abortSignal,
}: AgentRunInput): Promise<Response> {
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
        writer.write({ type: "text-start", id: "groq-response" });
        writer.write({ type: "text-delta", id: "groq-response", delta: text });
        writer.write({ type: "text-end", id: "groq-response" });
      },
      onError(error) {
        console.error("[quench] ui stream error", error);
        return "Bravura AI couldn't complete that request. Please try again.";
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (error instanceof GroqProviderError || error instanceof AgentInputError) {
      throw error;
    }

    const cause = error instanceof Error ? error : new Error(String(error));

    console.error("[quench] groq request failed", {
      message: cause.message,
      stack: cause.stack,
      cause: error,
    });

    throw new GroqProviderError("Groq request failed.", cause);
  }
}
=======
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildSystemPrompt, type ModeId } from "./modes";
import { resolveModel } from "./provider.server";

/**
 * Quench AI base agent.
 *
 * Deliberately a single-step loop: prompt -> system instruction -> LLM -> stream.
 * Extension points for later: inject `tools`, add a planner before the call,
 * add memory retrieval before `convertToModelMessages`, add `stopWhen` for
 * multi-step tool loops.
 */
export interface AgentRunInput {
  messages: UIMessage[];
  mode: ModeId;
}

export async function runBaseAgent({ messages, mode }: AgentRunInput) {
  const { model } = resolveModel();

  return streamText({
    model,
    system: buildSystemPrompt(mode),
    messages: await convertToModelMessages(messages),
    // Extension point: tools: {}, stopWhen: stepCountIs(50)
  });
}
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
