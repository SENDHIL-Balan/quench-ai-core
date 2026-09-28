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

import {
  searchPlacesText,
  searchPlacesNearby,
  getPlaceDetails,
  geocodePlace,
  reverseGeocodeLocation,
  computeDirections,
  formatMapsObservationForPrompt,
  type GoogleMapsResult,
} from "./google-maps.server";

export interface ToolExecutionContext {
  abortSignal?: AbortSignal;
  documentChunks?: DocumentChunk[];
  userQuery?: string;
  userLocation?: { latitude: number; longitude: number };
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
 * 5. Google Maps & Places Platform Tool
 */
export const googleMapsTool: ToolDefinition<{
  operation:
    "search_places" | "nearby_search" | "place_details" | "routes" | "geocode" | "reverse_geocode";
  query?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  placeId?: string;
  origin?: string;
  destination?: string;
  travelMode?: "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";
  openNow?: boolean;
  minRating?: number;
}> = {
  name: "google_maps",
  description:
    "Google Maps Platform agent tool for real-world places, nearby POIs (gyms, restaurants, hospitals, cafes), addresses, navigation directions, travel distance, and ratings.",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description:
          "The Google Maps capability to execute: 'search_places', 'nearby_search', 'place_details', 'routes', 'geocode', or 'reverse_geocode'",
        enum: [
          "search_places",
          "nearby_search",
          "place_details",
          "routes",
          "geocode",
          "reverse_geocode",
        ],
      },
      query: {
        type: "string",
        description:
          "Text search query (e.g. 'gyms near me', 'coffee shops in Chennai', address for geocoding)",
      },
      latitude: {
        type: "number",
        description:
          "Latitude coordinate for nearby search, reverse geocoding, or location biasing",
      },
      longitude: {
        type: "number",
        description:
          "Longitude coordinate for nearby search, reverse geocoding, or location biasing",
      },
      radiusMeters: {
        type: "number",
        description: "Search radius in meters for nearby search (default: 3000)",
      },
      placeId: {
        type: "string",
        description: "Specific Google Maps Place ID for place_details query",
      },
      origin: {
        type: "string",
        description: "Route starting point address, place name, or coordinates",
      },
      destination: {
        type: "string",
        description: "Route destination address, place name, or coordinates",
      },
      travelMode: {
        type: "string",
        description: "Navigation mode: DRIVE, WALK, BICYCLE, or TRANSIT",
        enum: ["DRIVE", "WALK", "BICYCLE", "TRANSIT"],
      },
    },
    required: ["operation"],
  },
  execute: async (params, context) => {
    try {
      const op = params.operation || "search_places";
      let mapsResult: GoogleMapsResult;

      // Determine effective user location if provided in context
      const userLoc =
        typeof params.latitude === "number" && typeof params.longitude === "number"
          ? { latitude: params.latitude, longitude: params.longitude }
          : context.userLocation;

      if (op === "routes") {
        const origin = params.origin || (userLoc ? `${userLoc.latitude},${userLoc.longitude}` : "");
        const destination = params.destination || params.query || "";
        if (!origin || !destination) {
          return {
            success: false,
            toolName: "google_maps",
            summary: "Directions require both an origin and a destination.",
            data: null,
            error: "Missing route origin or destination.",
          };
        }
        mapsResult = await computeDirections({
          origin,
          destination,
          travelMode: params.travelMode || "DRIVE",
        });
      } else if (op === "place_details") {
        if (!params.placeId) {
          return {
            success: false,
            toolName: "google_maps",
            summary: "Place details requires a valid placeId.",
            data: null,
            error: "Missing placeId.",
          };
        }
        mapsResult = await getPlaceDetails({ placeId: params.placeId });
      } else if (op === "geocode") {
        const address = params.query || context.userQuery || "";
        if (!address) {
          return {
            success: false,
            toolName: "google_maps",
            summary: "Geocoding requires an address or location name.",
            data: null,
            error: "Missing address to geocode.",
          };
        }
        mapsResult = await geocodePlace({ address });
      } else if (op === "reverse_geocode" && userLoc) {
        mapsResult = await reverseGeocodeLocation({
          latitude: userLoc.latitude,
          longitude: userLoc.longitude,
        });
      } else if (op === "nearby_search" && userLoc) {
        const queryStr = (params.query || context.userQuery || "").toLowerCase();
        const types: string[] = [];
        if (/\b(?:gym|gyms|fitness|workout)\b/.test(queryStr)) types.push("gym", "fitness_center");
        else if (/\b(?:coffee|cafe|cafes)\b/.test(queryStr)) types.push("coffee_shop", "cafe");
        else if (/\b(?:restaurant|restaurants|food|dine|dining|eat)\b/.test(queryStr))
          types.push("restaurant");
        else if (
          /\b(?:hospital|hospitals|clinic|clinics|doctor|doctors|medical|er|emergency)\b/.test(
            queryStr,
          )
        )
          types.push("hospital", "doctor");
        else if (/\b(?:pharmacy|pharmacies|chemist|drugstore)\b/.test(queryStr))
          types.push("pharmacy", "drugstore");
        else if (/\b(?:supermarket|supermarkets|grocery|groceries|market)\b/.test(queryStr))
          types.push("supermarket", "grocery_store");
        else if (/\b(?:hotel|hotels|motel|motels|resort|stay|lodging)\b/.test(queryStr))
          types.push("hotel", "lodging");
        else if (/\b(?:bar|bars|pub|pubs|brewery|club)\b/.test(queryStr)) types.push("bar");
        else if (/\b(?:bank|banks|atm|atms)\b/.test(queryStr)) types.push("bank", "atm");

        if (types.length > 0) {
          mapsResult = await searchPlacesNearby({
            latitude: userLoc.latitude,
            longitude: userLoc.longitude,
            radiusMeters: params.radiusMeters || 5000,
            includedTypes: types,
            maxResultCount: 6,
          });
        } else {
          mapsResult = await searchPlacesText({
            query: params.query || context.userQuery || "places",
            pageSize: 6,
            locationBias: { ...userLoc, radiusMeters: params.radiusMeters || 5000 },
            openNow: params.openNow,
            minRating: params.minRating,
          });
        }
      } else {
        // Default to Text Search (New) with location biasing if coordinates exist
        const query = params.query || context.userQuery || "places";
        mapsResult = await searchPlacesText({
          query,
          pageSize: 6,
          locationBias: userLoc
            ? { ...userLoc, radiusMeters: params.radiusMeters || 5000 }
            : undefined,
          openNow: params.openNow,
          minRating: params.minRating,
        });
      }

      const promptBlock = formatMapsObservationForPrompt(mapsResult);

      return {
        success: true,
        toolName: "google_maps",
        summary: mapsResult.summary,
        data: {
          mapsResult,
          promptBlock,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        toolName: "google_maps",
        summary: "Google Maps request could not be completed.",
        data: null,
        error: message,
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
  google_maps: googleMapsTool,
};
