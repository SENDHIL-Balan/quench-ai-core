import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const urlObj = new URL(request.url);
        const targetUrl = urlObj.searchParams.get("url")?.trim();
        const rawFilename = urlObj.searchParams.get("filename")?.trim();

        if (!targetUrl) {
          return new Response("Missing url parameter.", { status: 400 });
        }

        const safeFilename =
          rawFilename && /^[a-zA-Z0-9_. -]+$/.test(rawFilename)
            ? rawFilename
            : `bravura-artwork-${Date.now()}.jpg`;

        // Handle base64 data URLs
        if (targetUrl.startsWith("data:image/")) {
          const match = targetUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/is);
          if (match && match[2]) {
            const mime = match[1] || "image/png";
            const ext = mime.split("/")[1] || "png";
            const filename = safeFilename.includes(".") ? safeFilename : `${safeFilename}.${ext}`;
            const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
            return new Response(buffer, {
              status: 200,
              headers: {
                "Content-Type": mime,
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": buffer.length.toString(),
              },
            });
          }
        }

        // Handle remote image URLs (e.g. Pollinations, CDN)
        try {
          const response = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Bravura-AI-Downloader/1.0",
              Accept: "image/*,*/*;q=0.8",
            },
          });

          if (!response.ok) {
            return new Response(`Failed to fetch image: ${response.status}`, {
              status: response.status,
            });
          }

          const contentType = response.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : "jpg";
          const filename = safeFilename.includes(".")
            ? safeFilename
            : `${safeFilename.replace(/\.[^/.]+$/, "")}.${ext}`;

          const arrayBuffer = await response.arrayBuffer();

          return new Response(arrayBuffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Content-Length": arrayBuffer.byteLength.toString(),
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch (err) {
          console.error("[api/download] Error proxying image download:", err);
          return new Response("Failed to download image from source.", { status: 502 });
        }
      },
    },
  },
});
