import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { runBaseAgent } from "@/lib/agent/base-agent.server";
import { AGENT_MODES, type ModeId } from "@/lib/agent/modes";
import { MissingProviderKeyError } from "@/lib/agent/provider.server";

<<<<<<< HEAD
type ChatBody = {
  messages?: unknown;
  mode?: unknown;
  deepThink?: unknown;
  webSearch?: unknown;
};
=======
type ChatBody = { messages?: unknown; mode?: unknown };
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39

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

<<<<<<< HEAD
        const { messages, mode, deepThink, webSearch } = body;
=======
        const { messages, mode } = body;
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
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
<<<<<<< HEAD
          return await runBaseAgent({
            messages: messages as UIMessage[],
            mode: modeId,
            deepThink: deepThink === true,
            webSearch: webSearch === true,
=======
          const result = await runBaseAgent({
            messages: messages as UIMessage[],
            mode: modeId,
          });
          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
          });
        } catch (error) {
          if (error instanceof MissingProviderKeyError) {
            return errorResponse(
<<<<<<< HEAD
              "Bravura AI isn't connected to a model yet. Add your AI provider key to continue.",
=======
              "Quench AI isn't connected to a model yet. Add your AI provider key to continue.",
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
              503,
            );
          }
          const status =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number((error as { statusCode: unknown }).statusCode)
              : 500;
          console.error("[quench] agent run failed", error);
<<<<<<< HEAD
          if (status === 401) {
            return errorResponse("The Groq API key is invalid or expired. Replace GROQ_API_KEY and restart the server.", 401);
          }
          if (status === 404) {
            return errorResponse("The configured Groq model was not found. Check GROQ_MODEL.", 404);
          }
          if (status === 429) {
            return errorResponse("Bravura AI is busy right now. Try again in a moment.", 429);
          }
          if (status === 400) {
            return errorResponse("Groq rejected the request. Check the model and message format.", 400);
          }
          if (status === 503) {
            return errorResponse("Groq is temporarily unavailable. Please try again shortly.", 503);
          }
          if (status === 402) {
            return errorResponse(
              "AI usage limit reached. Add credits to keep chatting with Bravura AI.",
              402,
            );
          }
          return errorResponse("Bravura AI couldn't complete that request. Please try again.", 500);
=======
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
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
        }
      },
    },
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
