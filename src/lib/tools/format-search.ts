/**
 * Bravura AI — web search prompt formatter
 *
 * Pure function. Turns a WebSearchBundle into the block that the agent
 * appends to its system prompt before calling the model.
 *
 * Kept deliberately explicit: the model sees exactly what came back, with
 * numbered citations it can reference inline as [1], [2], ...
 */

import type { WebSearchBundle } from "./web-search-types";

const MAX_SNIPPET_CHARS = 500;

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Returns a prompt block to append to the system prompt, or null when
 * there are no usable results (in which case the caller should fall back
 * to answering without search).
 */
export function formatSearchForPrompt(bundle: WebSearchBundle): string | null {
  if (bundle.results.length === 0) return null;

  const lines: string[] = [];
  lines.push(
    "The user has enabled web search. The following results were retrieved for their latest message.",
  );
  lines.push(
    "Use them when relevant. Prefer them over your prior knowledge for time-sensitive facts.",
  );
  lines.push("Cite sources inline using bracket numbers that match the list below, e.g. [1].");
  lines.push("If the results do not answer the question, say so honestly instead of guessing.");
  lines.push("");
  lines.push(
    `<web-search-results query="${escapeAttr(bundle.query)}" provider="${escapeAttr(bundle.provider)}">`,
  );
  for (const r of bundle.results) {
    lines.push(`[${r.index}] ${r.title}`);
    lines.push(`    ${r.url}`);
    if (r.snippet) {
      lines.push(`    ${clip(r.snippet, MAX_SNIPPET_CHARS).replace(/\s+/g, " ")}`);
    }
    lines.push("");
  }
  lines.push("</web-search-results>");
  return lines.join("\n");
}
