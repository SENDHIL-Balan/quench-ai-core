import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { runBaseAgent } from "@/lib/agent/base-agent.server";
import { AGENT_MODES, type ModeId } from "@/lib/agent/modes";
import { MissingProviderKeyError } from "@/lib/agent/provider.server";

type ChatBody = { messages?: unknown; mode?: unknown };

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

        const { messages, mode } = body;
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
          const result = await runBaseAgent({
            messages: messages as UIMessage[],
            mode: modeId,
          });
          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
          });
        } catch (error) {
          if (error instanceof MissingProviderKeyError) {
            return errorResponse(
              "Quench AI isn't connected to a model yet. Add your AI provider key to continue.",
              503,
            );
          }
          const status =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number((error as { statusCode: unknown }).statusCode)
              : 500;
          console.error("[quench] agent run failed", error);
          if (status === 429) {
            return errorResponse("Quench AI is busy right now. Try again in a moment.", 429);
          }
          if (status === 402) {
            return errorResponse(
              "AI usage limit reached. Add credits to keep chatting with Quench AI.",
              402,
            );
          }
          return errorResponse("Quench AI couldn't complete that request. Please try again.", 500);
        }
      },
    },
  },
});
