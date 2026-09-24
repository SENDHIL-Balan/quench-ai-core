import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";
import { resolveProvider } from "@/lib/agent/provider.server";

interface PdfRequestBody {
  prompt?: unknown;
  style?: unknown;
  documentType?: unknown;
}

export interface GeneratedPdfContent {
  title: string;
  subtitle: string;
  documentType: string;
  author: string;
  date: string;
  summary: string;
  metaFields?: Array<{ label: string; value: string }>;
  sections: Array<{
    heading: string;
    content: string;
    bullets?: string[];
    table?: {
      headers: string[];
      rows: string[][];
    };
    callout?: string;
  }>;
  conclusion?: string;
  footerNotes?: string;
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parseAndSanitizePdfJson(rawText: string, fallbackPrompt: string): GeneratedPdfContent {
  if (!rawText || !rawText.trim()) {
    throw new Error("Empty AI response received.");
  }

  let text = rawText.trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  let candidate = text;
  if (firstBrace !== -1) {
    candidate =
      lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text.slice(firstBrace);
  }

  // 1. Direct JSON parse
  try {
    const obj = JSON.parse(candidate);
    if (obj && typeof obj === "object") {
      return sanitizeDoc(obj, fallbackPrompt);
    }
  } catch {
    // Continue to repair logic
  }

  // 2. Repair truncated strings or unclosed braces/brackets
  try {
    let inString = false;
    let escaped = false;
    const stack: string[] = [];
    let repaired = "";

    for (let i = 0; i < candidate.length; i++) {
      const char = candidate[i];
      if (escaped) {
        escaped = false;
        repaired += char;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        repaired += char;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        repaired += char;
        continue;
      }
      if (!inString) {
        if (char === "{" || char === "[") {
          stack.push(char === "{" ? "}" : "]");
        } else if (char === "}" || char === "]") {
          if (stack.length > 0 && stack[stack.length - 1] === char) {
            stack.pop();
          }
        }
      } else {
        if (char === "\n") {
          repaired += "\\n";
          continue;
        }
        if (char === "\r") {
          continue;
        }
        if (char === "\t") {
          repaired += "\\t";
          continue;
        }
      }
      repaired += char;
    }

    if (inString) {
      repaired += '"';
    }

    repaired = repaired.replace(/,\s*$/, "");
    while (stack.length > 0) {
      repaired += stack.pop();
    }

    const obj = JSON.parse(repaired);
    if (obj && typeof obj === "object") {
      return sanitizeDoc(obj, fallbackPrompt);
    }
  } catch (repairErr) {
    console.warn("[bravura-pdf] JSON repair attempt encountered:", repairErr);
  }

  // 3. Fallback extraction from text
  return extractDocumentFallback(rawText, fallbackPrompt);
}

function sanitizeDoc(obj: Record<string, unknown>, prompt: string): GeneratedPdfContent {
  const title =
    typeof obj["title"] === "string" && (obj["title"] as string).trim()
      ? (obj["title"] as string).trim()
      : prompt.slice(0, 60);

  const sections: GeneratedPdfContent["sections"] = [];
  if (Array.isArray(obj["sections"]) && (obj["sections"] as unknown[]).length > 0) {
    const rawSections = obj["sections"] as unknown[];
    for (let i = 0; i < rawSections.length; i++) {
      const s = rawSections[i] as Record<string, unknown> | undefined;
      const sectionItem: GeneratedPdfContent["sections"][number] = {
        heading:
          typeof s?.["heading"] === "string" && (s["heading"] as string).trim()
            ? (s["heading"] as string).trim()
            : `Section ${i + 1}`,
        content: typeof s?.["content"] === "string" ? (s["content"] as string) : "",
        bullets: Array.isArray(s?.["bullets"])
          ? ((s["bullets"] as unknown[]).filter((b) => typeof b === "string") as string[])
          : [],
      };
      if (
        s?.["table"] &&
        typeof s["table"] === "object" &&
        Array.isArray((s["table"] as { headers?: unknown[] }).headers) &&
        Array.isArray((s["table"] as { rows?: unknown[][] }).rows)
      ) {
        sectionItem.table = s["table"] as { headers: string[]; rows: string[][] };
      }
      if (typeof s?.["callout"] === "string") {
        sectionItem.callout = s["callout"] as string;
      }
      sections.push(sectionItem);
    }
  }

  if (sections.length === 0) {
    sections.push({
      heading: "Overview",
      content:
        typeof obj["summary"] === "string"
          ? (obj["summary"] as string)
          : "Document draft produced by Bravura AI.",
    });
  }

  const metaFields: Array<{ label: string; value: string }> = [];
  if (Array.isArray(obj["metaFields"])) {
    for (const m of obj["metaFields"] as unknown[]) {
      if (
        m &&
        typeof m === "object" &&
        typeof (m as Record<string, unknown>)["label"] === "string" &&
        typeof (m as Record<string, unknown>)["value"] === "string"
      ) {
        metaFields.push({
          label: (m as Record<string, string>)["label"],
          value: (m as Record<string, string>)["value"],
        });
      }
    }
  }

  const result: GeneratedPdfContent = {
    title,
    subtitle: typeof obj["subtitle"] === "string" ? (obj["subtitle"] as string) : "",
    documentType:
      typeof obj["documentType"] === "string" ? (obj["documentType"] as string) : "Report",
    author:
      typeof obj["author"] === "string" && (obj["author"] as string).trim()
        ? (obj["author"] as string)
        : "Bravura AI Document Studio",
    date:
      typeof obj["date"] === "string" && (obj["date"] as string).trim()
        ? (obj["date"] as string)
        : new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
    summary:
      typeof obj["summary"] === "string"
        ? (obj["summary"] as string)
        : "Executive document overview generated for " + title,
    metaFields,
    sections,
  };
  if (typeof obj["conclusion"] === "string") {
    result.conclusion = obj["conclusion"] as string;
  }
  if (typeof obj["footerNotes"] === "string") {
    result.footerNotes = obj["footerNotes"] as string;
  }
  return result;
}

function extractDocumentFallback(rawText: string, prompt: string): GeneratedPdfContent {
  const titleMatch = rawText.match(/"title"\s*:\s*"([^"]+)"/);
  const summaryMatch = rawText.match(/"summary"\s*:\s*"([^"]+)"/);

  return {
    title: titleMatch && titleMatch[1] ? titleMatch[1] : prompt.slice(0, 60),
    subtitle: "Automated Document Export",
    documentType: "Report",
    author: "Bravura AI Document Studio",
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    summary:
      summaryMatch && summaryMatch[1]
        ? summaryMatch[1]
        : "Structured publication document compiled from requested topic.",
    metaFields: [{ label: "Generated", value: "Bravura AI Engine" }],
    sections: [
      {
        heading: "Primary Document Findings",
        content: rawText
          .replace(/[{}[\]"']/g, " ")
          .replace(/\s+/g, " ")
          .slice(0, 600),
      },
    ],
    conclusion: "Document compilation complete.",
    footerNotes: "Generated by Bravura AI Document Engine.",
  };
}

export const Route = createFileRoute("/api/pdf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: PdfRequestBody;
        try {
          body = (await request.json()) as PdfRequestBody;
        } catch {
          return errorResponse("Invalid JSON payload in request.", 400);
        }

        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt) {
          return errorResponse("Please provide a prompt describing the PDF to generate.", 400);
        }

        const documentType = typeof body.documentType === "string" ? body.documentType : "report";
        const style = typeof body.style === "string" ? body.style : "corporate";

        const systemPrompt = `You are Bravura AI Document Engine. You generate comprehensive, highly detailed, beautifully structured documents ready for conversion into professional PDF documents.
Respond ONLY with a valid, clean JSON object (no markdown surrounding code fences if possible, or standard \`\`\`json format).

The JSON object MUST adhere to this exact TypeScript interface:
{
  "title": string,
  "subtitle": string,
  "documentType": string, // "report" | "invoice" | "study-guide" | "proposal" | "notes" | "specification"
  "author": string,
  "date": string,
  "summary": string, // 2-4 sentences executive summary or overview
  "metaFields": [
    { "label": string, "value": string }
  ],
  "sections": [
    {
      "heading": string,
      "content": string, // in-depth paragraph
      "bullets": [string], // optional key takeaways or bullet points
      "table": { // optional data table where applicable
        "headers": [string],
        "rows": [[string]]
      },
      "callout": string // optional important highlight or warning
    }
  ],
  "conclusion": string, // thorough conclusion or next steps
  "footerNotes": string // confidentiality, terms, or contact reference
}

Ensure the output is informative, rigorous, realistic, and complete. Include 3-4 rich sections with realistic metrics, data tables, or structured points according to the user's specific prompt.`;

        const userPrompt = `Generate a complete, professional ${documentType} styled for a ${style} presentation on this topic:
"${prompt}"

Include relevant sections, metrics, realistic data tables, and key takeaways.`;

        let rawText = "";

        // 1. Try Gemini first via @google/genai if standard AIzaSy key is configured
        const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
        const groqKey = process.env["GROQ_API_KEY"]?.trim();
        const nvidiaKey = process.env["NVIDIA_API_KEY"]?.trim();
        const isStandardGeminiKey = Boolean(geminiKey && geminiKey.startsWith("AIzaSy"));

        if (isStandardGeminiKey) {
          try {
            const ai = new GoogleGenAI({
              apiKey: geminiKey!,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });
            const response = await ai.models.generateContent({
              model: "gemini-3.8-flash",
              contents: `${systemPrompt}\n\nUser Request: ${userPrompt}`,
              config: {
                responseMimeType: "application/json",
              },
            });

            rawText = response.text?.trim() || "";
          } catch (geminiError) {
            const isAuthError =
              geminiError instanceof Error &&
              /UNAUTHENTICATED|invalid authentication|401/i.test(geminiError.message);
            if (!isAuthError) {
              console.warn("[bravura-pdf] Gemini call failed, attempting fallback:", geminiError);
            }
          }
        }

        // 2. Try Groq (high-speed structured output)
        if (!rawText && groqKey) {
          try {
            const groqProvider = resolveProvider("openai/gpt-oss-120b");
            rawText = await groqProvider.generateText({
              systemPrompt,
              messages: [
                { id: "pdf-req", role: "user", parts: [{ type: "text", text: userPrompt }] },
              ],
              deepThink: false,
              maxOutputTokens: 2_500,
            });
          } catch (groqError) {
            console.warn("[bravura-pdf] Groq attempt failed, attempting fallback:", groqError);
          }
        }

        // 3. Try NVIDIA Nemotron 3 Super 120B
        if (!rawText && nvidiaKey) {
          try {
            const nvidiaProvider = resolveProvider("nvidia/nemotron-3-super-120b-a12b");
            rawText = await nvidiaProvider.generateText({
              systemPrompt,
              messages: [
                { id: "pdf-req", role: "user", parts: [{ type: "text", text: userPrompt }] },
              ],
              deepThink: false,
              maxOutputTokens: 2_500,
            });
          } catch (nvidiaError) {
            console.warn("[bravura-pdf] NVIDIA attempt failed, attempting fallback:", nvidiaError);
          }
        }

        // 4. Final attempt with default resolved provider
        if (!rawText) {
          try {
            const provider = resolveProvider();
            rawText = await provider.generateText({
              systemPrompt,
              messages: [
                { id: "pdf-req", role: "user", parts: [{ type: "text", text: userPrompt }] },
              ],
              deepThink: false,
              maxOutputTokens: 2_500,
            });
          } catch (fallbackError) {
            console.error("[bravura-pdf] All providers failed:", fallbackError);
            return errorResponse(
              "Bravura AI could not connect to an AI model to generate this PDF. Please check your API keys.",
              503,
            );
          }
        }

        try {
          const documentData = parseAndSanitizePdfJson(rawText, prompt);

          return new Response(
            JSON.stringify({
              ok: true,
              data: documentData,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        } catch (parseError) {
          console.error("[bravura-pdf] Failed to parse JSON response:", parseError, rawText);
          return errorResponse(
            "The AI generated a document with invalid formatting. Please try again.",
            500,
          );
        }
      },
    },
  },
});
