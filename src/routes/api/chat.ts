import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { runBaseAgent } from "@/lib/agent/base-agent.server";
import { AGENT_MODES, type ModeId } from "@/lib/agent/modes";
import { MissingProviderKeyError, NvidiaProviderError } from "@/lib/agent/provider.server";

type ChatBody = {
  messages?: unknown;
  mode?: unknown;
  deepThink?: unknown;
  webSearch?: unknown;
  voiceMode?: unknown;
  model?: unknown;
  provider?: unknown;
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return errorResponse("We couldn't read that request. Please try again.", 400);
        }

        const { messages, mode, deepThink, webSearch, voiceMode, model, provider } = body;
        if (!Array.isArray(messages) || messages.length === 0) {
          return errorResponse("Please type a message first.", 400);
        }

        const modeId: ModeId =
          typeof mode === "string" && mode in AGENT_MODES ? (mode as ModeId) : "chat";

        if (!AGENT_MODES[modeId].available) {
          return errorResponse(
            "Image generation will be connected later. Switch to another mode to continue.",
            400,
          );
        }

        try {
          return await runBaseAgent({
            messages: messages as UIMessage[],
            mode: modeId,
            deepThink: deepThink === true,
            webSearch: webSearch === true,
            voiceMode: voiceMode === true,
            model: typeof model === "string" ? model : undefined,
            provider: typeof provider === "string" ? provider : undefined,
            abortSignal: request.signal,
          });
        } catch (error) {
          if (error instanceof MissingProviderKeyError) {
            return errorResponse(
              "Bravura AI isn't connected to a model yet. Add your AI provider key (e.g. NVIDIA_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY) to continue.",
              503,
            );
          }
          if (error instanceof NvidiaProviderError) {
            const status = error.statusCode || 500;
            return errorResponse(error.message, status);
          }
          const status =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number((error as { statusCode: unknown }).statusCode)
              : 500;
          console.error("[bravura] agent run failed", error);
          if (status === 401) {
            return errorResponse(
              "The AI API key is invalid or expired. Check your API key and try again.",
              401,
            );
          }
          if (status === 404) {
            return errorResponse("The configured AI model was not found.", 404);
          }
          if (status === 429) {
            return errorResponse("Bravura AI is busy right now. Try again in a moment.", 429);
          }
          if (status === 400) {
            return errorResponse(
              "The AI provider rejected the request. Check the message format.",
              400,
            );
          }
          if (status === 503) {
            return errorResponse(
              "AI service is temporarily unavailable. Please try again shortly.",
              503,
            );
          }
          if (status === 402) {
            return errorResponse(
              "AI usage limit reached. Add credits to keep chatting with Bravura AI.",
              402,
            );
          }
          return errorResponse("Bravura AI couldn't complete that request. Please try again.", 500);
        }
      },
    },
  },
});
