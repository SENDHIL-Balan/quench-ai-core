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
  abortSignal?: AbortSignal;
}

export interface OrchestrationResult {
  finalPrompt: string;
  provider: LLMProvider;
  sources: Array<{ title: string; url: string }>;
  activityStages: string[];
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
 * Detects whether the user query calls for specific tools.
 */
function planToolSteps(
  userText: string,
  mode: ModeId,
  webSearchEnabled: boolean,
  hasDocChunks: boolean,
): AgentPlanStep[] {
  const steps: AgentPlanStep[] = [];
  const text = userText.trim().toLowerCase();

  // 1. Math / Calculation detection (e.g. "calculate 25 * 40", "what is 15% of 850")
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

  // 2. Date / Time query detection
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

  // 3. Document RAG detection
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

  // 4. Web Search detection (if explicitly toggled or Research mode or live query)
  const isTimeSensitive =
    /\b(today|tonight|now|current|latest|news|weather|stock|price|score|yesterday|tomorrow|2026|who won)\b/i.test(
      text,
    );

  if (webSearchEnabled || mode === "research" || (isTimeSensitive && mode !== "code")) {
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

  const plannedSteps = planToolSteps(userText, mode, Boolean(webSearch), docChunks.length > 0);

  const activityStages: string[] = [];
  const sources: Array<{ title: string; url: string }> = [];
  let toolContextAppend = "";

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
      });

      if (result.success) {
        if (result.toolName === "web_search" && result.data?.sources) {
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
  };
}
