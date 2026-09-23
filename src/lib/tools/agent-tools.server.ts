/**
 * Bravura AI — Agent Tools Registry
 *
 * Implements standard agent tools with validation, timeout handling, and structured results.
 */

import { searchWeb } from "./web-search.server";
import { formatSearchForPrompt } from "./format-search";
import { WebSearchError } from "./web-search-types";
import {
  retrieveRelevantChunks,
  formatRagContextForPrompt,
  type DocumentChunk,
} from "../rag/rag-engine.server";

export interface ToolDefinition<TParams = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  execute: (
    params: TParams,
    context: ToolExecutionContext,
  ) => Promise<ToolExecutionResult<TResult>>;
}

export interface ToolExecutionContext {
  abortSignal?: AbortSignal;
  documentChunks?: DocumentChunk[];
  userQuery?: string;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  toolName: string;
  summary: string;
  data: T;
  error?: string;
}

/**
 * 1. Web Search Tool
 */
export const webSearchTool: ToolDefinition<{ query: string }> = {
  name: "web_search",
  description:
    "Search the live web for up-to-date facts, current events, recent news, live scores, or weather.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The specific web search query" },
    },
    required: ["query"],
  },
  execute: async ({ query }, context) => {
    try {
      const bundle = await searchWeb(query, { signal: context.abortSignal, timeoutMs: 8000 });
      const promptBlock = formatSearchForPrompt(bundle);
      const sources = bundle.results.map((r) => ({ title: r.title, url: r.url }));
      return {
        success: true,
        toolName: "web_search",
        summary: `Retrieved ${bundle.results.length} live sources for "${query}".`,
        data: { promptBlock, sources, results: bundle.results },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        toolName: "web_search",
        summary: `Web search could not retrieve external data.`,
        data: null,
        error: message,
      };
    }
  },
};

/**
 * 2. Calculator & Mathematical Evaluation Tool
 */
export const calculatorTool: ToolDefinition<{ expression: string }> = {
  name: "calculator",
  description:
    "Evaluate mathematical calculations, compound interest, percentages, or algebraic expressions safely.",
  parameters: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description:
          "The mathematical expression to calculate, e.g. '(1500 * 1.08^5) - 1500' or 'sqrt(144) + 25 * 4'",
      },
    },
    required: ["expression"],
  },
  execute: async ({ expression }) => {
    try {
      // Safe mathematical evaluation (strictly whitelisted characters: numbers, operators, Math functions)
      const sanitized = expression
        .replace(/,/g, "")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/\^/g, "**")
        .trim();

      // Only allow safe math tokens
      const isSafe = /^[\d\s+\-*/().%*eEMath.sqrtcospitanglogabsminax^]+$/.test(sanitized);
      if (!isSafe) {
        return {
          success: false,
          toolName: "calculator",
          summary: "Invalid expression characters.",
          data: null,
          error: "Expression contains unsupported symbols.",
        };
      }

      // Safe evaluation using Function with Math scope
      const compute = new Function("Math", `"use strict"; return (${sanitized});`);
      const result = compute(Math);

      if (typeof result !== "number" || isNaN(result)) {
        return {
          success: false,
          toolName: "calculator",
          summary: "Calculation resulted in non-numeric output.",
          data: null,
          error: "Calculation resulted in NaN or undefined.",
        };
      }

      return {
        success: true,
        toolName: "calculator",
        summary: `Calculated ${expression} = ${result}`,
        data: { expression, result, formatted: Number(result.toFixed(6)) },
      };
    } catch (err) {
      return {
        success: false,
        toolName: "calculator",
        summary: "Failed to evaluate mathematical expression.",
        data: null,
        error: err instanceof Error ? err.message : "Syntax error in expression",
      };
    }
  },
};

/**
 * 3. Document RAG Search Tool
 */
export const documentRagTool: ToolDefinition<{ query: string }> = {
  name: "document_rag",
  description:
    "Search uploaded documents, PDF files, and attachments for relevant excerpts and citations.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The specific query to match against document knowledge base",
      },
    },
    required: ["query"],
  },
  execute: async ({ query }, context) => {
    const chunks = context.documentChunks || [];
    if (chunks.length === 0) {
      return {
        success: false,
        toolName: "document_rag",
        summary: "No document knowledge base is currently loaded.",
        data: null,
        error: "No uploaded documents available for RAG search.",
      };
    }

    try {
      const results = await retrieveRelevantChunks(query, chunks, 4);
      if (results.length === 0) {
        return {
          success: true,
          toolName: "document_rag",
          summary: `No high-confidence matches found in uploaded documents for "${query}".`,
          data: { results: [], promptBlock: "" },
        };
      }

      const promptBlock = formatRagContextForPrompt(results);
      return {
        success: true,
        toolName: "document_rag",
        summary: `Found ${results.length} relevant passages in uploaded documents.`,
        data: {
          results: results.map((r) => ({
            citation: r.citation,
            score: Number(r.score.toFixed(3)),
            preview: r.chunk.text.slice(0, 160) + "...",
          })),
          promptBlock,
        },
      };
    } catch (err) {
      return {
        success: false,
        toolName: "document_rag",
        summary: "Error querying document knowledge base.",
        data: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

/**
 * 4. Datetime Tool
 */
export const datetimeTool: ToolDefinition<{ timezone?: string }> = {
  name: "datetime",
  description: "Get the exact current date, time, day of week, and timezone information.",
  parameters: {
    type: "object",
    properties: {
      timezone: {
        type: "string",
        description: "Optional IANA timezone name (e.g. 'America/New_York', 'UTC')",
      },
    },
  },
  execute: async ({ timezone }) => {
    const now = new Date();
    const tz = timezone || "UTC";
    try {
      const formatted = now.toLocaleString("en-US", {
        timeZone: tz === "UTC" ? "UTC" : undefined,
        dateStyle: "full",
        timeStyle: "long",
      });
      return {
        success: true,
        toolName: "datetime",
        summary: `Current date and time: ${formatted}`,
        data: {
          iso: now.toISOString(),
          formatted,
          timezone: tz,
          dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
          epochMs: now.getTime(),
        },
      };
    } catch {
      return {
        success: true,
        toolName: "datetime",
        summary: `Current date and time: ${now.toUTCString()}`,
        data: { iso: now.toISOString(), formatted: now.toUTCString(), timezone: "UTC" },
      };
    }
  },
};

/**
 * All available agent tools
 */
export const AGENT_TOOLS: Record<string, ToolDefinition> = {
  web_search: webSearchTool,
  calculator: calculatorTool,
  document_rag: documentRagTool,
  datetime: datetimeTool,
};
