/**
 * Bravura AI — Frontend Slang Service Layer
 *
 * Processes uploaded slang definitions (PDF text, Markdown, TXT, JSON, CSV),
 * extracts slang terms and their meanings, stores them in a persistent local cache,
 * and supplies relevant slang context to chat & voice interactions.
 */

import { AMERICAN_SLANG, BRITISH_SLANG } from "@/lib/agent/slang-dictionary";
import { extractPdfTextFromFile } from "@/lib/attachments/pdf-client";
import type { SlangEntry, SlangExtractionStats, SlangDictionaryState, SlangOrigin } from "./types";

const SLANG_CACHE_KEY = "bravura_slang_cache_v1";
const SLANG_FILES_KEY = "bravura_slang_files_v1";

type Listener = (state: SlangDictionaryState) => void;

class SlangService {
  private entries: Map<string, SlangEntry> = new Map();
  private uploadedFiles: Array<{ name: string; termCount: number; timestamp: number }> = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    // Lazy initialize on first browser access
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const cached = window.localStorage.getItem(SLANG_CACHE_KEY);
      const cachedFiles = window.localStorage.getItem(SLANG_FILES_KEY);

      if (cachedFiles) {
        try {
          this.uploadedFiles = JSON.parse(cachedFiles);
        } catch {
          this.uploadedFiles = [];
        }
      }

      if (cached) {
        const list = JSON.parse(cached) as SlangEntry[];
        if (Array.isArray(list) && list.length > 0) {
          for (const item of list) {
            this.entries.set(item.term.toLowerCase().trim(), item);
          }
          return;
        }
      }

      // If no local cache exists, seed from the built-in American & British dictionaries
      this.seedDefaultDictionaries();
    } catch (e) {
      console.warn("[SlangService] Could not read localStorage, using defaults:", e);
      this.seedDefaultDictionaries();
    }
  }

  private seedDefaultDictionaries() {
    const now = Date.now();
    for (const item of AMERICAN_SLANG) {
      const key = item.term.toLowerCase().trim();
      this.entries.set(key, {
        id: `us-${key.replace(/\s+/g, "-")}`,
        term: item.term,
        meaning: item.meaning,
        origin: "American",
        category: item.category || "General",
        source: "Default American Dictionary",
        extractedAt: now,
      });
    }

    for (const item of BRITISH_SLANG) {
      const key = item.term.toLowerCase().trim();
      if (!this.entries.has(key)) {
        this.entries.set(key, {
          id: `uk-${key.replace(/\s+/g, "-")}`,
          term: item.term,
          meaning: item.meaning,
          origin: "British",
          category: item.category || "General",
          source: "Default British Dictionary",
          extractedAt: now,
        });
      }
    }

    this.persist();
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      const arr = Array.from(this.entries.values());
      window.localStorage.setItem(SLANG_CACHE_KEY, JSON.stringify(arr));
      window.localStorage.setItem(SLANG_FILES_KEY, JSON.stringify(this.uploadedFiles));
      this.notify();
    } catch (e) {
      console.warn("[SlangService] Could not persist to localStorage:", e);
    }
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error("[SlangService] Listener error:", err);
      }
    });
  }

  public subscribe(listener: Listener): () => void {
    this.init();
    this.listeners.add(listener);
    // Call immediately with current state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): SlangDictionaryState {
    this.init();
    const entries = Array.from(this.entries.values());
    return {
      entries,
      totalCount: entries.length,
      lastUpdated: new Date().toISOString(),
      uploadedFiles: [...this.uploadedFiles],
    };
  }

  /**
   * Extract slang definitions from raw text content.
   * Handles markdown bullet lists, bold definitions, colon separators, tables, and paragraphs.
   */
  public extractSlangFromText(text: string, sourceName = "Uploaded File"): SlangEntry[] {
    if (!text || typeof text !== "string") return [];

    const extracted: SlangEntry[] = [];
    const seenTerms = new Set<string>();
    const lines = text.split(/\r?\n/);
    const now = Date.now();

    let currentOrigin: SlangOrigin = "Universal";
    let currentCategory = "General";

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]?.trim() || "";
      if (!rawLine) continue;

      // Check for section headers indicating origin or category
      if (/^(#+|\b)(.*american.*|.*usa.*|.*u\.s\..*)/i.test(rawLine)) {
        currentOrigin = "American";
        currentCategory = "American Colloquial";
        continue;
      }
      if (/^(#+|\b)(.*british.*|.*uk.*|.*cockney.*|.*england.*)/i.test(rawLine)) {
        currentOrigin = "British";
        currentCategory = "British Colloquial";
        continue;
      }
      if (/^(#+|\b)(.*australian.*|.*aussie.*)/i.test(rawLine)) {
        currentOrigin = "Australian";
        currentCategory = "Aussie Slang";
        continue;
      }

      // Check category headers (e.g. "### Money & Hustle", "Reactions & Emotions")
      if (
        rawLine.startsWith("#") ||
        rawLine.startsWith("==") ||
        (rawLine.endsWith(":") && rawLine.length < 40)
      ) {
        const catClean = rawLine.replace(/^[#=:*\-\s]+|[#=:*\-\s]+$/g, "").trim();
        if (catClean && catClean.length < 35 && !catClean.includes(".")) {
          currentCategory = catClean;
          continue;
        }
      }

      // Clean line markers
      let line = rawLine;
      // Strip markdown bullets or numbered prefixes: "* ", "- ", "1. ", "• "
      line = line.replace(/^([*\-•+]|\d+\.)\s+/, "").trim();

      let term = "";
      let meaning = "";
      let example: string | undefined;

      // Pattern 1: Bold term followed by colon/dash: **term**[: -—=] meaning
      const boldMatch = line.match(/^\*\*([^*]+)\*\*[:\s\-—=]+(.+)$/);
      if (boldMatch && boldMatch[1] && boldMatch[2]) {
        term = boldMatch[1].trim();
        meaning = boldMatch[2].trim();
      }

      // Pattern 2: Markdown table format: | Term | Meaning | Category/Origin? |
      if (!term && line.startsWith("|") && line.endsWith("|")) {
        const cols = line
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);
        if (
          cols.length >= 2 &&
          !cols[0]?.includes("---") &&
          !/^term|slang|word/i.test(cols[0] || "")
        ) {
          term = cols[0]?.replace(/\*\*/g, "") || "";
          meaning = cols[1] || "";
          if (cols[2]) {
            if (/brit|uk/i.test(cols[2])) currentOrigin = "British";
            else if (/amer|us/i.test(cols[2])) currentOrigin = "American";
          }
        }
      }

      // Pattern 3: Standard term: meaning or term - meaning
      if (!term) {
        const sepMatch = line.match(/^([^:—\-=–]{2,40})[:—\-–=]\s*(.+)$/);
        if (sepMatch && sepMatch[1] && sepMatch[2]) {
          const candTerm = sepMatch[1].replace(/[*_"`]/g, "").trim();
          const candMeaning = sepMatch[2].trim();
          // Filter out false positives (e.g. sentences with colons like "Note: this is...")
          if (
            candTerm.length > 1 &&
            candTerm.split(/\s+/).length <= 6 &&
            !/^(note|warning|chapter|page|http|https|source|date|author|step)$/i.test(candTerm)
          ) {
            term = candTerm;
            meaning = candMeaning;
          }
        }
      }

      // Pattern 4: Quotation marks: "term" (means / =) meaning
      if (!term) {
        const quoteMatch = line.match(/^["“]([^"”]{2,40})["”]\s*([=:-]|means)?\s*(.+)$/i);
        if (quoteMatch && quoteMatch[1] && quoteMatch[3]) {
          term = quoteMatch[1].trim();
          meaning = quoteMatch[3].trim();
        }
      }

      // Pattern 5: "Term (Meaning)" format
      if (!term) {
        const parenMatch = line.match(/^([A-Za-z0-9\s'/–-]{2,35})\s*\(([^)]{3,120})\)$/);
        if (parenMatch && parenMatch[1] && parenMatch[2]) {
          const candTerm = parenMatch[1].trim();
          if (candTerm.split(/\s+/).length <= 4) {
            term = candTerm;
            meaning = parenMatch[2].trim();
          }
        }
      }

      if (term && meaning && meaning.length > 2) {
        // Look for example usage within the meaning (e.g. e.g. "...", Ex: "...")
        const egMatch = meaning.match(/(?:e\.g\.|example:|ex:)\s*["“]?([^"”]+)["”]?/i);
        if (egMatch && egMatch[1]) {
          example = egMatch[1].trim();
        }

        const normTerm = term.toLowerCase().trim();
        if (!seenTerms.has(normTerm)) {
          seenTerms.add(normTerm);

          // Detect origin keywords in meaning if still universal
          let origin = currentOrigin;
          if (origin === "Universal") {
            if (/\b(uk|british|london|england|quid|blighty)\b/i.test(meaning + " " + term)) {
              origin = "British";
            } else if (/\b(us|american|states|dollars|bucks|y'all)\b/i.test(meaning + " " + term)) {
              origin = "American";
            }
          }

          extracted.push({
            id: `slang-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            term: term.trim(),
            meaning: meaning.trim(),
            origin,
            category: currentCategory,
            ...(example ? { example } : {}),
            confidence: 0.95,
            source: sourceName,
            extractedAt: now,
          });
        }
      }
    }

    return extracted;
  }

  /**
   * Processes uploaded text or file content, extracts terms, and adds them to local cache.
   */
  public processUploadedContent(
    content: string,
    sourceName = "Uploaded Document",
  ): SlangExtractionStats {
    this.init();
    const extracted = this.extractSlangFromText(content, sourceName);

    if (extracted.length > 0) {
      let americanCount = 0;
      let britishCount = 0;

      for (const item of extracted) {
        const key = item.term.toLowerCase().trim();
        this.entries.set(key, item);
        if (item.origin === "American") americanCount++;
        else if (item.origin === "British") britishCount++;
      }

      this.uploadedFiles.unshift({
        name: sourceName,
        termCount: extracted.length,
        timestamp: Date.now(),
      });
      if (this.uploadedFiles.length > 10) {
        this.uploadedFiles = this.uploadedFiles.slice(0, 10);
      }

      this.persist();

      return {
        extractedCount: extracted.length,
        totalCached: this.entries.size,
        americanCount,
        britishCount,
        sourceName,
      };
    }

    return {
      extractedCount: 0,
      totalCached: this.entries.size,
      americanCount: 0,
      britishCount: 0,
      sourceName,
    };
  }

  /**
   * Processes an uploaded File (PDF, TXT, MD, CSV, or JSON).
   */
  public async processUploadedFile(file: File): Promise<SlangExtractionStats> {
    this.init();
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    let rawText = "";
    if (ext === "pdf" || file.type === "application/pdf") {
      rawText = await extractPdfTextFromFile(file);
    } else {
      rawText = await file.text();
    }

    // If it's a JSON file containing slang items
    if (ext === "json" || file.type === "application/json") {
      try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          const entries: SlangEntry[] = [];
          for (const item of parsed) {
            const t = item.term || item.word || item.slang;
            const m = item.meaning || item.definition || item.desc;
            if (t && m) {
              entries.push({
                id: `json-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                term: String(t).trim(),
                meaning: String(m).trim(),
                origin:
                  item.origin ||
                  (item.british ? "British" : item.american ? "American" : "Universal"),
                category: item.category || "Uploaded JSON",
                example: item.example,
                source: file.name,
                extractedAt: Date.now(),
              });
            }
          }
          if (entries.length > 0) {
            for (const e of entries) {
              this.entries.set(e.term.toLowerCase().trim(), e);
            }
            this.uploadedFiles.unshift({
              name: file.name,
              termCount: entries.length,
              timestamp: Date.now(),
            });
            this.persist();
            return {
              extractedCount: entries.length,
              totalCached: this.entries.size,
              americanCount: entries.filter((e) => e.origin === "American").length,
              britishCount: entries.filter((e) => e.origin === "British").length,
              sourceName: file.name,
            };
          }
        }
      } catch {
        // Fallback to text parser
      }
    }

    return this.processUploadedContent(rawText, file.name);
  }

  /**
   * Adds or updates a single manual slang entry.
   */
  public addEntry(entry: Omit<SlangEntry, "id" | "extractedAt">): SlangEntry {
    this.init();
    const key = entry.term.toLowerCase().trim();
    const newEntry: SlangEntry = {
      ...entry,
      id: `manual-${Date.now()}`,
      extractedAt: Date.now(),
    };
    this.entries.set(key, newEntry);
    this.persist();
    return newEntry;
  }

  /**
   * Removes a specific slang entry by ID.
   */
  public removeEntry(id: string): boolean {
    this.init();
    for (const [key, val] of this.entries.entries()) {
      if (val.id === id) {
        this.entries.delete(key);
        this.persist();
        return true;
      }
    }
    return false;
  }

  /**
   * Clears the cached definitions and restores defaults.
   */
  public resetToDefaults(): void {
    this.entries.clear();
    this.uploadedFiles = [];
    this.seedDefaultDictionaries();
  }

  /**
   * Clears all cached slang entries.
   */
  public clearAll(): void {
    this.entries.clear();
    this.uploadedFiles = [];
    this.persist();
  }

  /**
   * Search cached slang entries.
   */
  public search(query: string, origin?: SlangOrigin | "all"): SlangEntry[] {
    this.init();
    const q = query.toLowerCase().trim();
    const all = Array.from(this.entries.values());

    return all.filter((entry) => {
      if (origin && origin !== "all" && entry.origin !== origin) {
        return false;
      }
      if (!q) return true;
      return (
        entry.term.toLowerCase().includes(q) ||
        entry.meaning.toLowerCase().includes(q) ||
        (entry.category && entry.category.toLowerCase().includes(q))
      );
    });
  }

  /**
   * Generates a focused slang context string for LLM chat interactions.
   * Matches terms that appear in userPrompt, along with key essential slang expressions.
   */
  public getSlangContextForPrompt(userPrompt: string, maxEntries = 25): string {
    this.init();
    if (this.entries.size === 0) return "";

    const all = Array.from(this.entries.values());
    const promptLower = (userPrompt || "").toLowerCase();

    // 1. Direct matches in user prompt
    const matched: SlangEntry[] = [];
    const others: SlangEntry[] = [];

    for (const item of all) {
      const termLower = item.term.toLowerCase();
      // Test word boundary match or subterm match
      const regex = new RegExp(`\\b${termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(promptLower) || (termLower.length > 3 && promptLower.includes(termLower))) {
        matched.push(item);
      } else {
        others.push(item);
      }
    }

    // 2. Select terms (priority to matches, then high-value expressions)
    const selected = [...matched];
    if (selected.length < maxEntries) {
      const remainingSlots = maxEntries - selected.length;
      selected.push(...others.slice(0, remainingSlots));
    }

    if (selected.length === 0) return "";

    const lines = selected.map((item) => {
      const originTag = item.origin ? `[${item.origin}]` : "";
      return `- ${item.term}: ${item.meaning} ${originTag}`.trim();
    });

    return [
      "=======================================================",
      "LOCAL SLANG KNOWLEDGE CONTEXT (FROM CACHED DEFINITIONS):",
      "=======================================================",
      ...lines,
      "=======================================================",
      "Instruction: Fluidly and naturally incorporate these slang meanings and expressions into your response where relevant, matching human conversational cadence.",
      "=======================================================",
    ].join("\n");
  }
}

export const slangService = new SlangService();
