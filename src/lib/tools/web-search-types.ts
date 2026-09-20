/**
 * Bravura AI — web search types
 *
 * Shared, client-safe types. No Node or server-only APIs here.
 */

export interface WebSearchResult {
  /** 1-based index for citation. Assigned by the formatter. */
  index: number;
  title: string;
  url: string;
  snippet: string;
  /** ISO timestamp when Tavily returned this result. */
  fetchedAt: string;
}

export interface WebSearchBundle {
  /** The query that was searched. */
  query: string;
  /** Provider that produced these results (e.g. "tavily"). */
  provider: string;
  results: WebSearchResult[];
  /** ISO timestamp of the search itself. */
  searchedAt: string;
}

export class WebSearchError extends Error {
  public readonly statusCode: number | undefined;
  public readonly code:
    "missing_key" | "rate_limited" | "timeout" | "provider_error" | "invalid_response";

  constructor(message: string, code: WebSearchError["code"], statusCode?: number, cause?: unknown) {
    super(message);
    this.name = "WebSearchError";
    this.code = code;
    this.statusCode = statusCode;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
