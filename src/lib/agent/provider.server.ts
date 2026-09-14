import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * LLM provider layer.
 *
 * The rest of the app (agent + UI) never imports a vendor SDK — it only asks
 * for `resolveModel()`. To swap in OpenAI / Anthropic / a local model later,
 * add a branch here and keep the returned `LanguageModel` shape.
 */
export type ProviderId = "gemini" | "lovable";

export interface ResolvedProvider {
  provider: ProviderId;
  model: LanguageModel;
  modelId: string;
}

export class MissingProviderKeyError extends Error {
  constructor() {
    super("No AI provider credentials configured.");
    this.name = "MissingProviderKeyError";
  }
}

const GEMINI_MODEL = "gemini-2.5-flash";
const GATEWAY_MODEL = "google/gemini-3.8-flash";

export function resolveModel(): ResolvedProvider {
  // 1) Direct Google Gemini API key (set GEMINI_API_KEY as a secret).
  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) {
    const gemini = createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: geminiKey,
    });
    return { provider: "gemini", model: gemini(GEMINI_MODEL), modelId: GEMINI_MODEL };
  }

  // 2) Managed Lovable AI Gateway (also serves Gemini models, no key setup).
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: lovableKey,
      headers: {
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    return { provider: "lovable", model: gateway(GATEWAY_MODEL), modelId: GATEWAY_MODEL };
  }

  throw new MissingProviderKeyError();
}
