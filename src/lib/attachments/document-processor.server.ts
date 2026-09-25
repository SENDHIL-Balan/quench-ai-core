/**
 * Bravura AI — Server-Side Document & Attachment Processing Engine
 *
 * Implements:
 * 1. Extraction of text and page demarcations from PDF attachments (via pdf-parse).
 * 2. Processing of plain text, markdown, CSV, and JSON documents.
 * 3. Handling of images (PNG, JPG, WEBP, GIF) for Vision AI.
 * 4. RAG and hybrid chunk retrieval for large documents.
 * 5. Scanned PDF detection with native Gemini multimodal support.
 */

import pdfParse from "pdf-parse";
import type { UIMessage } from "ai";
import {
  chunkDocumentText,
  searchSimilarChunks,
  type DocumentChunk,
} from "../rag/rag-engine.server";

export interface ProcessedDocument {
  filename: string;
  mediaType: string;
  text: string;
  pageCount: number;
  charCount: number;
  isScanned: boolean;
  rawBase64?: string;
}

export interface ProcessedImage {
  filename: string;
  mediaType: string;
  dataUrl: string;
  base64Data: string;
}

export interface ProcessedAttachmentsResult {
  documents: ProcessedDocument[];
  images: ProcessedImage[];
  hasImages: boolean;
  hasDocuments: boolean;
  totalDocumentChars: number;
}

function parseDataUrl(url: string): { mimeType: string; base64: string } | null {
  const match = url.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/is);
  if (!match || !match[1] || !match[2]) return null;
  return {
    mimeType: match[1].toLowerCase().trim(),
    base64: match[2].replace(/\s/g, ""),
  };
}

/**
 * Extracts and processes all attachments from the recent conversation messages.
 */
export async function extractAndProcessAttachments(
  messages: UIMessage[],
): Promise<ProcessedAttachmentsResult> {
  const documents: ProcessedDocument[] = [];
  const images: ProcessedImage[] = [];

  for (const m of messages) {
    if (m.role !== "user") continue;

    for (const p of m.parts) {
      if (p.type !== "file" || typeof p.url !== "string") continue;

      const parsed = parseDataUrl(p.url);
      if (!parsed) continue;

      const filename = p.filename || "attachment";
      const { mimeType, base64 } = parsed;

      // 1. Image Attachment
      if (mimeType.startsWith("image/")) {
        images.push({
          filename,
          mediaType: mimeType,
          dataUrl: p.url,
          base64Data: base64,
        });
        continue;
      }

      // 2. PDF Attachment
      if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
        try {
          const buffer = Buffer.from(base64, "base64");
          let pageCount = 1;
          let extractedText = "";

          // Custom page extraction renderer for pdf-parse to preserve page tags
          const options = {
            pagerender: function (pageData: {
              getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
              pageIndex: number;
            }) {
              return pageData.getTextContent().then(function (textContent) {
                let text = "";
                for (const item of textContent.items) {
                  if (item && "str" in item) {
                    text += item.str + " ";
                  }
                }
                const pageNumber = (pageData.pageIndex || 0) + 1;
                return `\n\n[Page ${pageNumber}]\n${text.replace(/\s+/g, " ").trim()}`;
              });
            },
          };

          const pdfResult = await pdfParse(buffer, options);
          pageCount = pdfResult.numpages || 1;
          extractedText = (pdfResult.text || "").trim();

          const isScanned = extractedText.length < 50;

          documents.push({
            filename,
            mediaType: "application/pdf",
            text: extractedText,
            pageCount,
            charCount: extractedText.length,
            isScanned,
            rawBase64: base64,
          });
        } catch (pdfErr) {
          console.warn(`[bravura-attachment] Error parsing PDF (${filename}):`, pdfErr);
          // If corrupted or encrypted, store notice
          documents.push({
            filename,
            mediaType: "application/pdf",
            text: `[Notice: Document "${filename}" could not be parsed as text. It may be encrypted, scanned, or non-standard.]`,
            pageCount: 1,
            charCount: 0,
            isScanned: true,
            rawBase64: base64,
          });
        }
        continue;
      }

      // 3. Text / Markdown / CSV / JSON / Code Documents
      if (
        mimeType.startsWith("text/") ||
        mimeType === "application/json" ||
        mimeType === "application/xml" ||
        mimeType === "application/javascript" ||
        /\.(txt|md|markdown|csv|json|py|js|ts|tsx|jsx|html|css|yaml|yml|xml|log|sql|sh)$/i.test(
          filename,
        )
      ) {
        try {
          const decoded = Buffer.from(base64, "base64").toString("utf-8");
          documents.push({
            filename,
            mediaType: mimeType || "text/plain",
            text: decoded,
            pageCount: 1,
            charCount: decoded.length,
            isScanned: false,
          });
        } catch (txtErr) {
          console.warn(`[bravura-attachment] Error decoding text document (${filename}):`, txtErr);
        }
        continue;
      }
    }
  }

  const totalDocumentChars = documents.reduce((sum, d) => sum + d.charCount, 0);

  return {
    documents,
    images,
    hasImages: images.length > 0,
    hasDocuments: documents.length > 0,
    totalDocumentChars,
  };
}

/**
 * Builds a grounded prompt block from attached documents.
 * - For small/medium documents (< 80,000 chars): Injects 100% of the document content with page anchors.
 * - For large documents (> 80,000 chars): Uses semantic RAG search to pull the most relevant page excerpts + document overview.
 */
export async function buildDocumentContextForPrompt({
  documents,
  userQuery,
  maxDirectChars = 80_000,
}: {
  documents: ProcessedDocument[];
  userQuery: string;
  maxDirectChars?: number;
}): Promise<string> {
  if (documents.length === 0) return "";

  const sections: string[] = [];

  for (const doc of documents) {
    if (doc.isScanned && !doc.text) {
      sections.push(
        `📄 [ATTACHED DOCUMENT: "${doc.filename}" (${doc.pageCount} page(s))]\nStatus: Scanned / Image-based PDF. Visual OCR / multimodal inspection applied.\n`,
      );
      continue;
    }

    // Direct injection for high fidelity if document is under threshold
    if (doc.charCount <= maxDirectChars) {
      sections.push(
        `\n\n═══════════════════════════════════════════════════════════════════\n` +
          `📄 [ATTACHED DOCUMENT: "${doc.filename}"]\n` +
          `Format: ${doc.mediaType} | Length: ${doc.pageCount} page(s), ${doc.charCount.toLocaleString()} characters\n` +
          `Instructions: The user has attached this document. Answer questions accurately based on this text. ` +
          `Reference specific pages (e.g. "[Page X]") when citing facts or summarizing sections.\n` +
          `═══════════════════════════════════════════════════════════════════\n` +
          doc.text +
          `\n═══════════════════════════════════════════════════════════════════\n`,
      );
      continue;
    }

    // Large document (> 80,000 chars): Chunk and retrieve relevant sections + overview
    console.info(
      `[bravura-doc] Document "${doc.filename}" is large (${doc.charCount.toLocaleString()} chars). Running RAG retrieval...`,
    );

    const chunks = chunkDocumentText(doc.text, doc.filename);
    const searchResults = await searchSimilarChunks(
      userQuery || "summary overview main points",
      chunks,
      10,
    );

    const relevantExcerpts = searchResults.map(
      (r, idx) =>
        `[Excerpt ${idx + 1} from "${doc.filename}"] (Relevance: ${Math.round(r.score * 100)}%):\n${r.chunk.text}`,
    );

    // Also include the first 2 pages / intro chunk as scope overview
    const introChunk = chunks[0] ? `[Document Scope & Beginning]:\n${chunks[0].text}\n` : "";

    sections.push(
      `\n\n═══════════════════════════════════════════════════════════════════\n` +
        `📄 [ATTACHED DOCUMENT (Large): "${doc.filename}"]\n` +
        `Format: ${doc.mediaType} | Total Pages: ${doc.pageCount} | Total Length: ${doc.charCount.toLocaleString()} characters\n` +
        `Note: Due to size, the most relevant excerpts matching the user query have been retrieved below along with the document introduction.\n` +
        `═══════════════════════════════════════════════════════════════════\n` +
        introChunk +
        `\n` +
        relevantExcerpts.join("\n\n---\n\n") +
        `\n═══════════════════════════════════════════════════════════════════\n`,
    );
  }

  return sections.join("\n");
}
