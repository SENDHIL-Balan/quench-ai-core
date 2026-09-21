/**
 * Bravura AI — Slang Service Types
 * Defines the schema for extracted slang entries, dictionary state, and statistics.
 */

export type SlangOrigin = "American" | "British" | "Australian" | "Universal" | "General";

export interface SlangEntry {
  id: string;
  term: string;
  meaning: string;
  origin: SlangOrigin;
  category?: string;
  example?: string;
  confidence?: number;
  source?: string;
  extractedAt: number;
}

export interface SlangExtractionStats {
  extractedCount: number;
  totalCached: number;
  americanCount: number;
  britishCount: number;
  sourceName?: string;
}

export interface SlangDictionaryState {
  entries: SlangEntry[];
  totalCount: number;
  lastUpdated: string;
  uploadedFiles: Array<{
    name: string;
    termCount: number;
    timestamp: number;
  }>;
}
