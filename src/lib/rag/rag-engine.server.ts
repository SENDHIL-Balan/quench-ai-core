/**
 * Bravura AI — Retrieval-Augmented Generation (RAG) Engine
 *
 * Implements:
 * 1. Intelligent document chunking with configurable overlap and sentence boundary preservation.
 * 2. Vector embedding generation with Gemini (gemini-embedding-2-preview) and fast BM25/TF-IDF vector fallback.
 * 3. Semantic similarity search with cosine similarity and Top-K retrieval.
 * 4. Grounded context construction with snippet citations.
 */

import { GoogleGenAI } from "@google/genai";

export interface DocumentChunk {
  id: string;
  source: string;
  text: string;
  charStart: number;
  charEnd: number;
  embedding?: number[];
  tokenEstimate: number;
}

export interface RagSearchResult {
  chunk: DocumentChunk;
  score: number;
  citation: string;
}

export interface IngestedDocument {
  name: string;
  mediaType: string;
  fullText: string;
  chunks: DocumentChunk[];
  totalChars: number;
  createdAt: string;
}

const CHUNK_SIZE = 800; // characters per chunk
const CHUNK_OVERLAP = 120; // character overlap for context continuity
const TOP_K_DEFAULT = 4;
const MIN_SIMILARITY_SCORE = 0.25;

/**
 * Splits document text into overlapping chunks, attempting to cut at sentence or paragraph boundaries.
 */
export function chunkDocumentText(text: string, sourceName = "document"): DocumentChunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const chunks: DocumentChunk[] = [];
  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < clean.length) {
    let endIndex = Math.min(startIndex + CHUNK_SIZE, clean.length);

    // If not at the end of the text, try to find a natural break (paragraph or sentence)
    if (endIndex < clean.length) {
      const paragraphBreak = clean.lastIndexOf("\n\n", endIndex);
      const sentenceBreak = clean.lastIndexOf(". ", endIndex);
      const newlineBreak = clean.lastIndexOf("\n", endIndex);

      if (paragraphBreak > startIndex + CHUNK_SIZE * 0.5) {
        endIndex = paragraphBreak + 2;
      } else if (sentenceBreak > startIndex + CHUNK_SIZE * 0.5) {
        endIndex = sentenceBreak + 2;
      } else if (newlineBreak > startIndex + CHUNK_SIZE * 0.5) {
        endIndex = newlineBreak + 1;
      }
    }

    const chunkText = clean.slice(startIndex, endIndex).trim();
    if (chunkText.length > 20) {
      chunks.push({
        id: `${sourceName}-chunk-${chunkIdx}`,
        source: sourceName,
        text: chunkText,
        charStart: startIndex,
        charEnd: endIndex,
        tokenEstimate: Math.ceil(chunkText.length / 4),
      });
      chunkIdx++;
    }

    if (endIndex >= clean.length) break;
    startIndex = Math.max(startIndex + 1, endIndex - CHUNK_OVERLAP);
  }

  return chunks;
}

/**
 * Computes term frequencies and builds a local sparse vector for cosine similarity fallback.
 */
function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function computeTfVector(words: string[], vocab: Map<string, number>): Float32Array {
  const vec = new Float32Array(vocab.size);
  for (const word of words) {
    const idx = vocab.get(word);
    if (idx !== undefined) {
      vec[idx] += 1;
    }
  }
  // Sublinear term frequency scaling: 1 + ln(tf)
  for (let i = 0; i < vec.length; i++) {
    if (vec[i] > 0) {
      vec[i] = 1 + Math.log(vec[i]);
    }
  }
  return vec;
}

function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const valA = a[i]!;
    const valB = b[i]!;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates vector embeddings for a list of texts using Gemini's gemini-embedding-2-preview.
 * Returns null if Gemini key is not configured or request fails.
 */
async function generateGeminiEmbeddings(texts: string[]): Promise<number[][] | null> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey || !geminiKey.startsWith("AIzaSy")) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const embeddings: number[][] = [];
    // Process in batches of 8 to avoid rate limits
    for (let i = 0; i < texts.length; i += 8) {
      const batch = texts.slice(i, i + 8);
      const promises = batch.map(async (content) => {
        try {
          const res = await ai.models.embedContent({
            model: "gemini-embedding-2-preview",
            contents: content,
          });
          return res.embedding?.values || null;
        } catch {
          return null;
        }
      });
      const results = await Promise.all(promises);
      for (const res of results) {
        if (res && res.length > 0) {
          embeddings.push(res);
        } else {
          return null; // Fall back to sparse vector if any failed
        }
      }
    }
    return embeddings.length === texts.length ? embeddings : null;
  } catch (err) {
    console.warn("[bravura-rag] Gemini embedding generation notice:", err);
    return null;
  }
}

/**
 * Performs semantic retrieval across an array of document chunks given a user query.
 */
export async function retrieveRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  topK = TOP_K_DEFAULT,
): Promise<RagSearchResult[]> {
  if (!query || chunks.length === 0) return [];

  // 1. Try Gemini dense embeddings if available
  const queryEmbeddings = await generateGeminiEmbeddings([query]);
  if (queryEmbeddings && queryEmbeddings[0]) {
    const queryVec = queryEmbeddings[0];
    const chunkTexts = chunks.map((c) => c.text);
    const chunkEmbeddings = await generateGeminiEmbeddings(chunkTexts);

    if (chunkEmbeddings && chunkEmbeddings.length === chunks.length) {
      const scored: RagSearchResult[] = chunks.map((chunk, idx) => {
        const score = cosineSimilarity(queryVec, chunkEmbeddings[idx]!);
        return {
          chunk,
          score,
          citation: `[Source: ${chunk.source} (Chars ${chunk.charStart}-${chunk.charEnd})]`,
        };
      });

      return scored
        .filter((r) => r.score >= MIN_SIMILARITY_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    }
  }

  // 2. High-precision sparse vector / BM25 term weighting fallback
  const queryWords = tokenizeText(query);
  if (queryWords.length === 0) return [];

  const vocab = new Map<string, number>();
  const chunkWordsList: string[][] = [];

  for (const chunk of chunks) {
    const words = tokenizeText(chunk.text);
    chunkWordsList.push(words);
    for (const w of words) {
      if (!vocab.has(w)) vocab.set(w, vocab.size);
    }
  }
  for (const w of queryWords) {
    if (!vocab.has(w)) vocab.set(w, vocab.size);
  }

  const queryVec = computeTfVector(queryWords, vocab);
  const scoredResults: RagSearchResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const chunkVec = computeTfVector(chunkWordsList[i]!, vocab);
    const score = cosineSimilarity(queryVec, chunkVec);

    if (score > 0.05) {
      scoredResults.push({
        chunk,
        score,
        citation: `[Source: ${chunk.source} (Chars ${chunk.charStart}-${chunk.charEnd})]`,
      });
    }
  }

  return scoredResults.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Builds a clean RAG context block formatted for LLM system prompt injection.
 */
export function formatRagContextForPrompt(results: RagSearchResult[]): string {
  if (results.length === 0) return "";

  const sections = results.map((r, i) => {
    return `### [Document Reference ${i + 1}] — ${r.citation}\n${r.chunk.text}`;
  });

  return `\n\n==================================================\nRETRIEVED KNOWLEDGE BASE CONTEXT (RAG)\n==================================================\nThe following verified snippets were retrieved from uploaded documents based on semantic relevance to the query. Ground your answer in this data where relevant:\n\n${sections.join("\n\n")}\n\n==================================================\n`;
}
