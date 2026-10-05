import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
    }),
    ...(command === "build"
      ? [
          nitro(
            process.env.VERCEL
              ? {}
              : { defaultPreset: process.env.NITRO_PRESET || "cloudflare-module" },
          ),
        ]
      : []),
    viteReact(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("pdfjs-dist")) return "pdfjs";
          if (id.includes("react-markdown") || id.includes("remark-gfm")) return "markdown";
          if (id.includes("recharts")) return "charts";
          if (id.includes("embla-carousel")) return "carousel";
          if (id.includes("@radix-ui/")) return "radix";
          return undefined;
        },
      },
    },
  },
}));
