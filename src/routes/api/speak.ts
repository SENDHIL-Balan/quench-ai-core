import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/speak
 *
 * Body: JSON { text: string, voice?: string }
 * Returns: audio/mpeg stream
 *
 * Server-side only. DEEPGRAM_API_KEY never leaves the server.
 */

const DEFAULT_VOICE = "aura-asteria-en";
const MAX_TEXT_LENGTH = 2000;

type SpeakBody = {
  text?: unknown;
  voice?: unknown;
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["DEEPGRAM_API_KEY"];
        if (!apiKey || !apiKey.trim()) {
          console.error("[bravura] DEEPGRAM_API_KEY missing");
          return errorResponse("Voice output is not configured on the server.", 503);
        }

        let body: SpeakBody;
        try {
          body = (await request.json()) as SpeakBody;
        } catch {
          return errorResponse("Could not read the request.", 400);
        }

        const text = typeof body.text === "string" ? body.text.trim() : "";
        const voice =
          typeof body.voice === "string" && body.voice.trim()
            ? body.voice.trim()
            : DEFAULT_VOICE;

        if (!text) {
          return errorResponse("No text provided.", 400);
        }

        if (text.length > MAX_TEXT_LENGTH) {
          return errorResponse("Text is too long to speak at once.", 413);
        }

        let upstream: Response;
        try {
          upstream = await fetch(
            `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voice)}`,
            {
              method: "POST",
              headers: {
                Authorization: `Token ${apiKey.trim()}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text }),
            },
          );
        } catch (error) {
          console.error("[bravura] deepgram speak fetch failed", error);
          return errorResponse("Voice service is unreachable right now.", 502);
        }

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("[bravura] deepgram speak error", {
            status: upstream.status,
            detail: detail.slice(0, 500),
          });

          if (upstream.status === 401 || upstream.status === 403) {
            return errorResponse("Voice service rejected our key.", 502);
          }
          if (upstream.status === 429) {
            return errorResponse("Voice service is rate limited. Try again shortly.", 429);
          }
          return errorResponse("Voice service could not generate audio.", 502);
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "audio/mpeg",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});