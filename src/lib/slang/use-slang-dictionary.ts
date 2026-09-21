import { useState, useEffect, useCallback } from "react";
import { slangService } from "./slang-service";
import type { SlangDictionaryState, SlangEntry, SlangOrigin } from "./types";

export function useSlangDictionary() {
  const [state, setState] = useState<SlangDictionaryState>(() => slangService.getState());

  useEffect(() => {
    const unsubscribe = slangService.subscribe((nextState) => {
      setState(nextState);
    });
    return () => unsubscribe();
  }, []);

  const search = useCallback((query: string, origin?: SlangOrigin | "all"): SlangEntry[] => {
    return slangService.search(query, origin);
  }, []);

  const processFile = useCallback(async (file: File) => {
    return await slangService.processUploadedFile(file);
  }, []);

  const processContent = useCallback((content: string, sourceName?: string) => {
    return slangService.processUploadedContent(content, sourceName);
  }, []);

  const addEntry = useCallback((entry: Omit<SlangEntry, "id" | "extractedAt">) => {
    return slangService.addEntry(entry);
  }, []);

  const removeEntry = useCallback((id: string) => {
    return slangService.removeEntry(id);
  }, []);

  const resetToDefaults = useCallback(() => {
    slangService.resetToDefaults();
  }, []);

  const clearAll = useCallback(() => {
    slangService.clearAll();
  }, []);

  const getChatContext = useCallback((userPrompt: string, maxEntries?: number) => {
    return slangService.getSlangContextForPrompt(userPrompt, maxEntries);
  }, []);

  return {
    entries: state.entries,
    totalCount: state.totalCount,
    lastUpdated: state.lastUpdated,
    uploadedFiles: state.uploadedFiles,
    search,
    processFile,
    processContent,
    addEntry,
    removeEntry,
    resetToDefaults,
    clearAll,
    getChatContext,
  };
}
