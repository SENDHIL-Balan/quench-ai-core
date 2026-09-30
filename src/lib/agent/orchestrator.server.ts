/**
 * Bravura AI — AI Agent Orchestration Layer
 *
 * Implements the Agent Architecture:
 * User Goal -> Understand Request -> Plan -> Select Tool / Action -> Execute Tool ->
 * Observe Result -> Reason / Evaluate -> Final Response Stream
 *
 * Features:
 * - Max tool-call limits (prevents infinite loops)
 * - Safe high-level activity progression (Searching sources, Analyzing results, etc.)
 * - Context management with token budgeting
 * - Timeout handling and graceful error recovery
 */

import type { UIMessage } from "ai";
import { AGENT_TOOLS, type ToolExecutionResult } from "../tools/agent-tools.server";
import { chunkDocumentText, type DocumentChunk } from "../rag/rag-engine.server";
import { resolveProvider, isVisionCapableModel, type LLMProvider } from "./provider.server";
import { buildSystemPrompt, type ModeId } from "./modes";
import {
  extractAndProcessAttachments,
  buildDocumentContextForPrompt,
} from "../attachments/document-processor.server";
import type { GoogleMapsResult } from "../tools/google-maps.server";

export interface AgentPlanStep {
  toolName: string;
  params: Record<string, unknown>;
  reason: string;
}

export interface OrchestratorOptions {
  messages: UIMessage[];
  mode: ModeId;
  deepThink?: boolean;
  webSearch?: boolean;
  voiceMode?: boolean;
  model?: string;
  provider?: string;
  userLocation?: { latitude: number; longitude: number };
  userLocationDenied?: boolean;
  abortSignal?: AbortSignal;
}

export interface OrchestrationResult {
  finalPrompt: string;
  provider: LLMProvider;
  sources: Array<{ title: string; url: string }>;
  activityStages: string[];
  mapsData?: GoogleMapsResult | null;
}

const MAX_STEPS = 3;

/**
 * Extracts latest user text from the messages array.
 */
function getLatestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === "user") {
      const texts = m.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ")
        .trim();
      if (texts) return texts;
    }
  }
  return "";
}

/**
 * Extracts any attached text or document content from user messages into RAG chunks.
 */
function extractAttachedDocumentChunks(messages: UIMessage[]): DocumentChunk[] {
  const allChunks: DocumentChunk[] = [];

  for (const m of messages) {
    if (m.role !== "user") continue;
    for (const p of m.parts) {
      const filePart = p as { type: string; url?: string; filename?: string };
      if (filePart.type === "file" && typeof filePart.url === "string") {
        const fileUrl = filePart.url;
        const filename = filePart.filename || "attached-file";
        // Check if data URL contains text
        const match = fileUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/is);
        if (match && match[2]) {
          try {
            const decoded = Buffer.from(match[2].replace(/\s/g, ""), "base64").toString("utf-8");
            if (decoded && decoded.trim().length > 30) {
              const fileChunks = chunkDocumentText(decoded, filename);
              allChunks.push(...fileChunks);
            }
          } catch {
            // Ignore binary files not text-decodable
          }
        }
      }
    }
  }

  return allChunks;
}

/**
 * Extracts referenced place from previous assistant messages containing Google Maps observation.
 */
function extractReferencedPlaceFromMessages(
  messages: UIMessage[],
  queryText: string,
): { placeId: string; name: string } | null {
  const lowerQuery = queryText.toLowerCase();

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== "assistant") continue;

    for (const p of m.parts) {
      if (p.type === "text" && p.text) {
        const match = p.text.match(/```json:google_maps\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          try {
            const data = JSON.parse(match[1]);
            const places = data.places;
            if (Array.isArray(places) && places.length > 0) {
              // 1. Direct name match in query
              for (const pl of places) {
                if (pl.name && lowerQuery.includes(pl.name.toLowerCase())) {
                  return { placeId: pl.placeId, name: pl.name };
                }
              }

              // 2. Positional and relative references
              let targetIndex = 0;
              if (/\b(?:first|1st)\b/i.test(queryText)) targetIndex = 0;
              else if (/\b(?:second|2nd)\b/i.test(queryText)) targetIndex = 1;
              else if (/\b(?:third|3rd)\b/i.test(queryText)) targetIndex = 2;
              else if (/\b(?:fourth|4th)\b/i.test(queryText)) targetIndex = 3;
              else if (/\b(?:fifth|5th)\b/i.test(queryText)) targetIndex = 4;
              else if (/\b(?:last|final)\b/i.test(queryText)) targetIndex = places.length - 1;
              else if (/\b(?:highest[- ]rated|best|top[- ]rated)\b/i.test(queryText)) {
                const sorted = [...places].sort((a, b) => (b.rating || 0) - (a.rating || 0));
                return { placeId: sorted[0].placeId, name: sorted[0].name };
              } else if (/\b(?:closest|nearest)\b/i.test(queryText)) {
                const sorted = [...places].sort(
                  (a, b) => (a.distanceMeters || Infinity) - (b.distanceMeters || Infinity),
                );
                return { placeId: sorted[0].placeId, name: sorted[0].name };
              }

              const selected = places[targetIndex] || places[0];
              return { placeId: selected.placeId, name: selected.name };
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }
  return null;
}

/**
 * Detects whether the query requires Google Maps Platform.
 */
function detectGoogleMapsIntent(
  userText: string,
  messages: UIMessage[],
  userLocation?: { latitude: number; longitude: number },
): AgentPlanStep | null {
  const text = userText.trim().toLowerCase();

  // Negative filters: programming, algorithms, conceptual, educational, or creative queries
  const isTechnicalOrConversational =
    /\b(loop|loops|infinite|code|coding|function|variable|python|javascript|typescript|react|html|css|algorithm|debug|error|compile|syntax|class|array|object|database|sql|api|backend|frontend|while|for loop|recursion|write|story|essay|poem|math|calculate|translate|review|summary|read words)\b/i.test(
      text,
    );
  const isExplicitMapQuery =
    /\b(navigate|directions? to|how far is|distance to|map of|located at|where is the nearest|near me|around me|closest to me|where am i|find address)\b/i.test(
      text,
    );

  if (isTechnicalOrConversational && !isExplicitMapQuery) {
    return null;
  }

  if (
    /^(?:what is (?:rag|ai|ml|machine learning|python|coding|a component|docker)|explain (?:ai|ml|machine learning|python|rag)|write (?:python|code|a react|a script)|create a workout (?:plan|routine)|help me (?:code|write|debug))\b/i.test(
      text,
    )
  ) {
    return null;
  }

  // 0. Current Location / Where Am I / My Location
  const isWhereAmIQuery =
    /\b(where am i|where i am|where.*(?:right now|located|spot)|where.*riht|where im|my location|my current location|current location|what is my location|what's my location|show my location|locate me|pin my location|my coordinates|where am i now|where am i standing|what city am i in|what country am i in|what address am i at|show where i am)\b/i.test(
      text,
    );

  if (isWhereAmIQuery) {
    return {
      toolName: "google_maps",
      params: {
        operation: "reverse_geocode",
        ...(userLocation
          ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
          : {}),
      },
      reason: "Determine user's exact current address and location via Google Maps Platform",
    };
  }

  // 1. Directions / Routes / Navigation
  const routeBetweenMatch = text.match(
    /(?:directions?|how far is|distance between|distance from|travel time between|travel time from|drive from)\s+(?:from\s+)?(.+?)\s+(?:to|and|from)\s+(.+)/i,
  );
  if (routeBetweenMatch && routeBetweenMatch[1] && routeBetweenMatch[2]) {
    let rawOrigin = routeBetweenMatch[1].replace(/^from\s+/i, "").trim();
    let rawDest = routeBetweenMatch[2].replace(/[?.!]+$/, "").trim();

    // Handle "how far is Chennai airport from me" or "how far is Chennai airport from T Nagar"
    const isSeparatedByFrom = /\bfrom\b/i.test(
      routeBetweenMatch[0].slice(routeBetweenMatch[1].length),
    );
    if (isSeparatedByFrom && !routeBetweenMatch[0].toLowerCase().startsWith("drive from")) {
      // Swapping so origin is starting point and dest is destination
      const temp = rawOrigin;
      rawOrigin = rawDest;
      rawDest = temp;
    }

    const isOriginMe = /\b(me|here|my location|current location)\b/i.test(rawOrigin);
    const isDestMe = /\b(me|here|my location|current location)\b/i.test(rawDest);

    const origin =
      isOriginMe && userLocation ? `${userLocation.latitude},${userLocation.longitude}` : rawOrigin;
    const dest =
      isDestMe && userLocation ? `${userLocation.latitude},${userLocation.longitude}` : rawDest;

    let travelMode: "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT" = "DRIVE";
    if (/\b(?:walk|walking|on foot)\b/i.test(text)) travelMode = "WALK";
    else if (/\b(?:bike|biking|cycle|cycling)\b/i.test(text)) travelMode = "BICYCLE";
    else if (/\b(?:transit|metro|bus|train|subway)\b/i.test(text)) travelMode = "TRANSIT";

    return {
      toolName: "google_maps",
      params: {
        operation: "routes",
        origin,
        destination: dest,
        travelMode,
      },
      reason: `Route navigation between ${rawOrigin} and ${rawDest}`,
    };
  }

  const routeToMatch = text.match(
    /(?:how (?:do I|to) get to|give me directions? to|directions? to|navigate to|how far is|how long does it take to get to)\s+(.+)/i,
  );
  if (routeToMatch && routeToMatch[1]) {
    const rawDest = routeToMatch[1].replace(/[?.!]+$/, "").trim();
    let travelMode: "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT" = "DRIVE";
    if (/\b(?:walk|walking|on foot)\b/i.test(text)) travelMode = "WALK";
    else if (/\b(?:bike|biking|cycle|cycling)\b/i.test(text)) travelMode = "BICYCLE";
    else if (/\b(?:transit|metro|bus|train|subway)\b/i.test(text)) travelMode = "TRANSIT";

    return {
      toolName: "google_maps",
      params: {
        operation: "routes",
        origin: userLocation
          ? `${userLocation.latitude},${userLocation.longitude}`
          : "current location",
        destination: rawDest,
        travelMode,
      },
      reason: `Route navigation to ${rawDest}`,
    };
  }

  // 2. Follow-up inquiries on previous places
  const isFollowUp =
    /\b(?:the (?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|nearest|closest|highest[- ]rated|best|last|final)|that (?:one|place|gym|restaurant|hotel|cafe)|this (?:one|place))\b/i.test(
      text,
    );
  if (isFollowUp) {
    const prevPlace = extractReferencedPlaceFromMessages(messages, text);
    if (prevPlace) {
      if (/\b(?:direction|how to get|navigate|route)\b/i.test(text)) {
        return {
          toolName: "google_maps",
          params: {
            operation: "routes",
            origin: userLocation
              ? `${userLocation.latitude},${userLocation.longitude}`
              : "current location",
            destination: prevPlace.name,
            placeId: prevPlace.placeId,
          },
          reason: `Directions to previously discussed place "${prevPlace.name}"`,
        };
      }
      return {
        toolName: "google_maps",
        params: {
          operation: "place_details",
          placeId: prevPlace.placeId,
          query: prevPlace.name,
        },
        reason: `Detailed inquiry for previously discussed place "${prevPlace.name}"`,
      };
    }
  }

  // 3. Location / Places / Nearby queries
  const placeCategories =
    "gyms?|fitness(?: centers?)?|restaurants?|cafes?|coffee(?: shops?)?|hotels?|motels?|hospitals?|clinics?|pharmacies|pharmacy|supermarkets?|grocery(?: stores?)?|bars?|pubs?|parks?|beaches|beach|malls?|stores?|shops?|airports?|stations?|bakeries|bakery|atms?|banks?|gas stations?|petrol bunks?|theaters?|cinemas?|dentists?|doctors?|salons?|spas?|museums?|temples?|churches|mosques?";

  const isPlacesQuery =
    new RegExp(
      `(?:find|search|show|locate|where (?:is|are)|nearest|nearby|good|best|top|recommend|list)\\s+(?:some\\s+|the\\s+)?(?:${placeCategories})`,
      "i",
    ).test(text) ||
    new RegExp(
      `(?:${placeCategories})\\s+(?:near me|around me|nearby|close by|around here|near here|near this location)`,
      "i",
    ).test(text) ||
    new RegExp(`(?:${placeCategories})\\s+(?:in|near|at|around)\\s+([a-zA-Z0-9\\s,]+)`, "i").test(
      text,
    ) ||
    /^(?:where is|how to find|locate)\s+([a-zA-Z0-9\s,'-]+(?:beach|airport|station|mall|hospital|temple|park|tower|museum))/i.test(
      text,
    );

  if (isPlacesQuery) {
    const hasNearMe =
      /\b(near me|around me|nearby|around here|near here|closest to me|near this location)\b/i.test(
        text,
      );
    if (hasNearMe && userLocation) {
      return {
        toolName: "google_maps",
        params: {
          operation: "nearby_search",
          query: userText,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radiusMeters: 5000,
        },
        reason: "Search places around user's GPS coordinates",
      };
    }

    return {
      toolName: "google_maps",
      params: {
        operation: "search_places",
        query: userText,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
      },
      reason: `Search places matching "${userText}"`,
    };
  }

  return null;
}

/**
 * Detects whether the user query calls for specific tools.
 */
function planToolSteps(
  userText: string,
  mode: ModeId,
  webSearchEnabled: boolean,
  hasDocChunks: boolean,
  messages: UIMessage[],
  userLocation?: { latitude: number; longitude: number },
): AgentPlanStep[] {
  const steps: AgentPlanStep[] = [];
  const text = userText.trim().toLowerCase();

  // 1. Google Maps Platform detection (Places, Near me, Directions, Distances)
  const mapsStep = detectGoogleMapsIntent(userText, messages, userLocation);
  if (mapsStep) {
    steps.push(mapsStep);
  }

  // 2. Math / Calculation detection (e.g. "calculate 25 * 40", "what is 15% of 850")
  const mathMatch = text.match(
    /(?:calculate|evaluate|what is|compute)\s+([0-9\s+\-*/().%^×÷]+[0-9])/i,
  );
  if (mathMatch && mathMatch[1] && mathMatch[1].length >= 3) {
    steps.push({
      toolName: "calculator",
      params: { expression: mathMatch[1].trim() },
      reason: "User requested mathematical calculation",
    });
  }

  // 3. Date / Time query detection
  if (
    /\b(what time is it|current time|today's date|what date is it|what day is today|what day is it)\b/i.test(
      text,
    )
  ) {
    steps.push({
      toolName: "datetime",
      params: {},
      reason: "User requested current timestamp or date",
    });
  }

  // 4. Document RAG detection
  if (
    hasDocChunks ||
    /\b(in the document|according to the file|in the pdf|from the attachment|in the uploaded)\b/i.test(
      text,
    )
  ) {
    steps.push({
      toolName: "document_rag",
      params: { query: userText },
      reason: "Query references uploaded document context",
    });
  }

  // 5. Web Search detection (if explicitly toggled or Research mode or live query, and not handled by maps)
  const isTimeSensitive =
    /\b(today|tonight|now|current|latest|news|weather|stock|price|score|yesterday|tomorrow|2026|who won)\b/i.test(
      text,
    );

  const isPersonalLocationQuery =
    /\b(where am i|where i am|where.*(?:right now|located|spot)|where.*riht|where im|my location|my current location|current location|what is my location|what's my location|show my location|locate me|pin my location|my coordinates|where am i now|where am i standing|what city am i in|what country am i in|what address am i at|show where i am)\b/i.test(
      text,
    );

  if (
    (webSearchEnabled || mode === "research" || (isTimeSensitive && mode !== "code")) &&
    !mapsStep &&
    !isPersonalLocationQuery
  ) {
    steps.push({
      toolName: "web_search",
      params: { query: userText },
      reason: "Live web intelligence requested for verified facts",
    });
  }

  return steps.slice(0, MAX_STEPS);
}

/**
 * Orchestrates the full Agent lifecycle.
 */
export async function orchestrateAgentRun({
  messages,
  mode,
  deepThink = false,
  webSearch = false,
  voiceMode = false,
  model,
  provider: requestedProvider,
  userLocation,
  userLocationDenied,
  abortSignal,
}: OrchestratorOptions): Promise<OrchestrationResult> {
  const userText = getLatestUserText(messages);

  // 1. Process attachments (PDFs, text documents, images)
  const attachments = await extractAndProcessAttachments(messages);

  let docChunks: DocumentChunk[] = [];
  if (attachments.hasDocuments) {
    for (const doc of attachments.documents) {
      if (doc.text) {
        docChunks.push(...chunkDocumentText(doc.text, doc.filename));
      }
    }
  }
  if (docChunks.length === 0) {
    docChunks = extractAttachedDocumentChunks(messages);
  }

  const plannedSteps = planToolSteps(
    userText,
    mode,
    Boolean(webSearch),
    docChunks.length > 0,
    messages,
    userLocation,
  );

  const activityStages: string[] = [];
  const sources: Array<{ title: string; url: string }> = [];
  let toolContextAppend = "";
  let mapsData: GoogleMapsResult | null = null;

  const isLocationQuery =
    /\b(near me|around me|nearby|around here|near here|closest to me|near this location|where am i|where i am|where.*(?:right now|located|spot)|where.*riht|where im|my location|my current location|current location|show my location|locate me|what is my location|what's my location|my coordinates|where am i standing)\b/i.test(
      userText,
    );
  if (isLocationQuery && !userLocation) {
    toolContextAppend += `\n\n[MOBILE LIVE GPS ACCESS NOTICE]: The user is asking where they are, but their mobile device's live GPS coordinates have not reached the app yet. Respond politely: "To detect and show your exact real-time spot, please tap the **Share Live Location** button below so your phone can read your live GPS coordinates. As soon as you allow it, Bravura will pinpoint your exact location on Google Maps!" You must include the token [ACTION:REQUEST_LOCATION] at the end of your response so the interactive button appears. Do NOT guess Singapore or any other fictional location.`;
  }

  // Grounded document context injection (for PDFs, CSV, TXT, JSON, Markdown)
  if (attachments.hasDocuments) {
    activityStages.push(
      `Grounded Document Engine (analyzing ${attachments.documents.length} file(s))`,
    );
    const docPromptBlock = await buildDocumentContextForPrompt({
      documents: attachments.documents,
      userQuery: userText,
    });
    if (docPromptBlock) {
      toolContextAppend += `\n\n${docPromptBlock}`;
    }
  }

  if (attachments.hasImages) {
    activityStages.push(
      `Vision Analysis Engine (inspecting ${attachments.images.length} image(s))`,
    );
  }

  console.info(
    `[bravura-agent] Planned ${plannedSteps.length} tool step(s) for query: "${userText.slice(0, 60)}" (attachments: ${attachments.documents.length} doc(s), ${attachments.images.length} img(s))`,
  );

  // Execute planned tools sequentially with timeout protection
  for (const step of plannedSteps) {
    if (abortSignal?.aborted) break;

    const tool = AGENT_TOOLS[step.toolName];
    if (!tool) continue;

    activityStages.push(`Executing ${tool.name} (${step.reason})`);

    try {
      const result: ToolExecutionResult = await tool.execute(step.params, {
        abortSignal,
        documentChunks: docChunks,
        userQuery: userText,
        userLocation,
      });

      if (result.success) {
        if (result.toolName === "google_maps" && result.data) {
          const mapPayload = result.data as {
            mapsResult: GoogleMapsResult;
            promptBlock?: string;
          };
          mapsData = mapPayload.mapsResult;
          if (mapPayload.promptBlock) {
            toolContextAppend += `\n\n${mapPayload.promptBlock}`;
          }
        } else if (result.toolName === "web_search" && result.data?.sources) {
          sources.push(...result.data.sources);
          if (result.data.promptBlock) {
            toolContextAppend += `\n\n${result.data.promptBlock}`;
          }
        } else if (result.toolName === "document_rag" && result.data?.promptBlock) {
          toolContextAppend += `\n\n${result.data.promptBlock}`;
        } else if (result.toolName === "calculator" && result.data) {
          toolContextAppend += `\n\n[CALCULATOR OBSERVATION]: Expression '${result.data.expression}' evaluates to: ${result.data.result}`;
        } else if (result.toolName === "datetime" && result.data) {
          toolContextAppend += `\n\n[DATETIME OBSERVATION]: Current live date & time is ${result.data.formatted} (ISO: ${result.data.iso})`;
        }
      }
    } catch (toolErr) {
      console.warn(`[bravura-agent] Tool execution failed for ${step.toolName}:`, toolErr);
    }
  }

  // Vision model auto-routing if images are attached and selected model does not support vision
  let modelToUse = model;
  let providerToUse = requestedProvider;
  let visionNote = "";

  if (attachments.hasImages) {
    const isVision = isVisionCapableModel(modelToUse);
    if (!isVision) {
      const nvidiaKey = process.env["NVIDIA_API_KEY"]?.trim();
      const openrouterKey = process.env["OPENROUTER_API_KEY"]?.trim();

      if (nvidiaKey) {
        modelToUse = "meta/llama-3.2-11b-vision-instruct";
        providerToUse = "nvidia";
        visionNote = "\n\n> 👁️ *Vision engine active: Analyzing image using **Llama 3.2 Vision**.*";
      } else if (openrouterKey) {
        modelToUse = "openrouter/free";
        providerToUse = "openrouter";
        visionNote =
          "\n\n> 👁️ *Vision engine active: Analyzing image using **OpenRouter Vision Router**.*";
      }
    }
  }

  // Build full system prompt
  let systemInstruction = buildSystemPrompt({
    mode,
    deepThink,
    webSearch: webSearch || mode === "research",
    voiceMode,
  });

  if (toolContextAppend) {
    systemInstruction += toolContextAppend;
  }
  if (visionNote) {
    systemInstruction += visionNote;
  }

  const provider = resolveProvider(modelToUse, providerToUse);

  return {
    finalPrompt: systemInstruction,
    provider,
    sources,
    activityStages,
    mapsData,
  };
}
