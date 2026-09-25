import { createFileRoute } from "@tanstack/react-router";
import { OPENROUTER_BASE_URL } from "@/lib/agent/provider.server";

export interface OpenRouterModelItem {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  isFree: boolean;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

// Fallback curated free models in case of network issues or rate limits
export const FALLBACK_OPENROUTER_FREE_MODELS: OpenRouterModelItem[] = [
  {
    id: "openrouter/free",
    name: "Free Models Router",
    description:
      "OpenRouter smart router that dynamically routes to the best available free model with zero rate-limit friction.",
    contextLength: 200000,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "NVIDIA: Nemotron 3.5 Lightning (free)",
    description: "High-speed 1M context reasoning and code model from NVIDIA on OpenRouter.",
    contextLength: 1000000,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "LiquidAI: LFM2.5-2.6B (free)",
    description:
      "Ultra-efficient liquid neural architecture optimized for rapid conversational reasoning.",
    contextLength: 65536,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "inclusionai/ling-3.0-flash-sante:free",
    name: "inclusionAI: Ling 3.0 Flash Sante (free)",
    description:
      "262K context health and logic reasoning model with fine-grained chain-of-thought.",
    contextLength: 262144,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "inclusionai/ling-3.0-flash-fin:free",
    name: "inclusionAI: Ling 3.0 Flash Fin (free)",
    description: "262K context financial and analytical intelligence model on OpenRouter.",
    contextLength: 262144,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen: Qwen3.8 27B (free)",
    description: "Strong 262K context open reasoning model from Alibaba Qwen team.",
    contextLength: 262144,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "stealth/space-bunny-alpha",
    name: "Space Bunny Alpha (free)",
    description: "1M token context reasoning model with fast inference on OpenRouter free tier.",
    contextLength: 1000000,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google: Gemma 4 31B (free)",
    description: "Google open-weights reasoning model with 262K token context.",
    contextLength: 262144,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere: North Mini Code (free)",
    description: "Code and developer intelligence model with 256K token context.",
    contextLength: 256000,
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
  },
];

// In-memory server cache
let cachedModels: OpenRouterModelItem[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchOpenRouterModelsServer(): Promise<OpenRouterModelItem[]> {
  const now = Date.now();
  if (cachedModels && now < cacheExpiry) {
    return cachedModels;
  }

  const apiKey = process.env["OPENROUTER_API_KEY"]?.trim();
  const endpoint = `${OPENROUTER_BASE_URL.replace(/\/+$/, "")}/models`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "HTTP-Referer": "https://bravura.ai",
      "X-Title": "Bravura AI",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      headers,
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`[bravura] OpenRouter /models returned ${res.status}, using curated catalog`);
      return cachedModels || FALLBACK_OPENROUTER_FREE_MODELS;
    }

    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        name: string;
        description?: string;
        context_length?: number;
        pricing?: { prompt?: string; completion?: string };
      }>;
    };

    if (!Array.isArray(json.data) || json.data.length === 0) {
      return cachedModels || FALLBACK_OPENROUTER_FREE_MODELS;
    }

    const items: OpenRouterModelItem[] = [];

    // Always include openrouter/free first if not already present
    items.push({
      id: "openrouter/free",
      name: "Free Models Router",
      description:
        "Auto-routes to the best available free model on OpenRouter with zero token cost.",
      contextLength: 200000,
      isFree: true,
      pricing: { prompt: "0", completion: "0" },
    });

    for (const m of json.data) {
      if (m.id === "openrouter/free") continue;
      const promptCost = m.pricing?.prompt;
      const completionCost = m.pricing?.completion;
      const isFree =
        m.id.endsWith(":free") ||
        (promptCost === "0" && completionCost === "0") ||
        m.id.startsWith("openrouter/free");

      // We include all free models, plus notable models
      if (isFree) {
        items.push({
          id: m.id,
          name: m.name || m.id,
          description: m.description || "",
          contextLength: m.context_length || 131072,
          isFree: true,
          pricing: {
            prompt: promptCost || "0",
            completion: completionCost || "0",
          },
        });
      }
    }

    cachedModels = items;
    cacheExpiry = now + CACHE_TTL_MS;
    return items;
  } catch (err) {
    console.warn("[bravura] Failed to fetch live OpenRouter models, using catalog cache:", err);
    return cachedModels || FALLBACK_OPENROUTER_FREE_MODELS;
  }
}

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: async () => {
        const models = await fetchOpenRouterModelsServer();
        return new Response(
          JSON.stringify({
            provider: "openrouter",
            models,
            hasKey: Boolean(process.env["OPENROUTER_API_KEY"]?.trim()),
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=60, stale-while-revalidate=300",
            },
          },
        );
      },
    },
  },
});
