/**
 * Bravura AI — Tavily web search client
 *
 * Server-only. Never import this from a client component.
 * Fails loudly to the caller; the caller (base agent) decides whether
 * to fail-open (answer without search) or hard-fail.
 */

import {
  WebSearchError,
  type WebSearchBundle,
  type WebSearchResult,
} from "./web-search-types";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_RESULTS = 5;

type TavilyResponseItem = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  score?: unknown;
};

type TavilyResponse = {
  results?: unknown;
  query?: unknown;
};

function getTavilyKey(): string {
  const key = process.env["TAVILY_API_KEY"];
  if (!key || !key.trim()) {
    throw new WebSearchError(
      "Web search is not configured. Add TAVILY_API_KEY on the server.",
      "missing_key",
    );
  }
  return key.trim();
}

function coerceString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseTavilyResults(raw: unknown, query: string): WebSearchBundle {
  const payload = raw as TavilyResponse;
  const items = Array.isArray(payload?.results) ? (payload.results as TavilyResponseItem[]) : [];

  const now = new Date().toISOString();

  const results: WebSearchResult[] = items
    .map((item, i): WebSearchResult | null => {
      const title = coerceString(item?.title).trim();
      const url = coerceString(item?.url).trim();
      const snippet = coerceString(item?.content).trim();
      if (!url) return null;
      return {
        index: i + 1,
        title: title || url,
        url,
        snippet,
        fetchedAt: now,
      };
    })
    .filter((r): r is WebSearchResult => r !== null)
    .slice(0, MAX_RESULTS);

  return {
    query,
    provider: "tavily",
    results,
    searchedAt: now,
  };
}

export async function searchWeb(
  query: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<WebSearchBundle> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new WebSearchError("Empty search query.", "invalid_response");
  }

  const apiKey = getTavilyKey();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Link caller's abort signal, if provided.
  if (options?.signal) {
    if (options.signal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  let response: Response;
  try {
    response = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: trimmed,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false,
        max_results: MAX_RESULTS,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === "AbortError") {
      throw new WebSearchError("Web search timed out.", "timeout", undefined, error);
    }
    throw new WebSearchError("Web search failed to reach the provider.", "provider_error", undefined, error);
  }
  clearTimeout(timer);

  if (response.status === 401 || response.status === 403) {
    throw new WebSearchError(
      "Web search key was rejected. Check TAVILY_API_KEY.",
      "provider_error",
      response.status,
    );
  }
  if (response.status === 429) {
    throw new WebSearchError(
      "Web search rate limit reached. Try again later.",
      "rate_limited",
      response.status,
    );
  }
  if (!response.ok) {
    throw new WebSearchError(
      `Web search provider returned ${response.status}.`,
      "provider_error",
      response.status,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new WebSearchError(
      "Web search provider returned unreadable data.",
      "invalid_response",
      undefined,
      error,
    );
  }

  return parseTavilyResults(json, trimmed);
}