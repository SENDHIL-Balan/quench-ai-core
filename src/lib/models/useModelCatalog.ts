import { useState, useEffect } from "react";
import {
  BASE_MODEL_OPTIONS,
  type ModelOption,
  type SupportedModelId,
} from "@/components/quench/ModelSelector";

/**
 * Module-level cache to guarantee /api/models is fetched at most once across
 * the entire client session and shared by all components. This completely prevents
 * infinite fetch/render loops.
 */
let globalCatalogCache: ModelOption[] | null = null;
let globalFetchPromise: Promise<ModelOption[]> | null = null;
const listeners = new Set<(models: ModelOption[]) => void>();

function notifyListeners(models: ModelOption[]) {
  for (const listener of listeners) {
    try {
      listener(models);
    } catch (err) {
      console.error("[bravura] Error in model catalog subscriber:", err);
    }
  }
}

/**
 * Fetches dynamic OpenRouter models from /api/models once, merges them with
 * built-in BASE_MODEL_OPTIONS, and caches the result.
 */
export async function getOrFetchModelCatalog(): Promise<ModelOption[]> {
  if (globalCatalogCache) {
    return globalCatalogCache;
  }

  if (globalFetchPromise) {
    return globalFetchPromise;
  }

  globalFetchPromise = (async () => {
    try {
      const res = await fetch("/api/models");
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        provider?: string;
        models?: Array<{
          id: string;
          name: string;
          description?: string;
          isFree?: boolean;
          contextLength?: number;
        }>;
      };

      const dynamicList: ModelOption[] = [];
      if (Array.isArray(data.models)) {
        for (const m of data.models) {
          if (!m.id) continue;
          dynamicList.push({
            id: m.id,
            name: m.name.replace(/\(free\)/i, "").trim() || m.id,
            provider: "OpenRouter",
            badge: m.isFree ? "Free" : `${Math.round((m.contextLength || 128000) / 1000)}K`,
            description:
              m.description ||
              `OpenRouter model with ${m.contextLength?.toLocaleString() || "128K"} context length`,
            isFree: Boolean(m.isFree),
            contextLength: m.contextLength,
            highlight: m.id === "openrouter/free",
          });
        }
      }

      // Merge BASE_MODEL_OPTIONS and dynamic OpenRouter models without duplicates
      const map = new Map<string, ModelOption>();
      for (const opt of BASE_MODEL_OPTIONS) {
        map.set(opt.id, opt);
      }
      for (const opt of dynamicList) {
        if (!map.has(opt.id)) {
          map.set(opt.id, opt);
        }
      }

      const merged = Array.from(map.values());
      globalCatalogCache = merged;
      notifyListeners(merged);
      return merged;
    } catch (err) {
      console.warn("[bravura] Could not fetch live OpenRouter catalog, using base options:", err);
      globalCatalogCache = BASE_MODEL_OPTIONS;
      notifyListeners(BASE_MODEL_OPTIONS);
      return BASE_MODEL_OPTIONS;
    } finally {
      globalFetchPromise = null;
    }
  })();

  return globalFetchPromise;
}

/**
 * React hook that subscribes to the global model catalog.
 * Guarantees zero infinite render loops:
 * - Module-level cache prevents repeated network requests.
 * - State is only updated when the catalog transitions from initial to populated.
 */
export function useModelCatalog() {
  const [models, setModels] = useState<ModelOption[]>(
    () => globalCatalogCache || BASE_MODEL_OPTIONS,
  );
  const [isLoaded, setIsLoaded] = useState<boolean>(() => globalCatalogCache !== null);

  useEffect(() => {
    let mounted = true;

    const handleChange = (updated: ModelOption[]) => {
      if (mounted) {
        setModels(updated);
        setIsLoaded(true);
      }
    };

    listeners.add(handleChange);

    if (!globalCatalogCache) {
      void getOrFetchModelCatalog().then((result) => {
        if (mounted) {
          setModels(result);
          setIsLoaded(true);
        }
      });
    }

    return () => {
      mounted = false;
      listeners.delete(handleChange);
    };
  }, []);

  return { models, isLoaded };
}
