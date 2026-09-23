import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import {
  type CosmicThemeId,
  COSMIC_THEMES,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  applyCosmicThemeToDOM,
  getStoredCosmicTheme,
} from "./cosmic-theme";

interface CosmicThemeContextValue {
  theme: CosmicThemeId;
  setTheme: (id: CosmicThemeId) => void;
  themes: typeof COSMIC_THEMES;
  currentThemeMeta: (typeof COSMIC_THEMES)[number];
}

const CosmicThemeContext = createContext<CosmicThemeContextValue | null>(null);

export function CosmicThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<CosmicThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    // Initial mount sync from localStorage
    const saved = getStoredCosmicTheme();
    setThemeState(saved);
    applyCosmicThemeToDOM(saved);

    // Sync across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const next = e.newValue as CosmicThemeId;
        if (COSMIC_THEMES.some((t) => t.id === next)) {
          setThemeState(next);
          applyCosmicThemeToDOM(next);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = useCallback((id: CosmicThemeId) => {
    setThemeState(id);
    applyCosmicThemeToDOM(id);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const currentThemeMeta = COSMIC_THEMES.find((t) => t.id === theme) || COSMIC_THEMES[0];

  return (
    <CosmicThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: COSMIC_THEMES,
        currentThemeMeta,
      }}
    >
      {children}
    </CosmicThemeContext.Provider>
  );
}

export function useCosmicTheme() {
  const context = useContext(CosmicThemeContext);
  if (!context) {
    // Graceful fallback if used outside provider
    const fallbackMeta = COSMIC_THEMES.find((t) => t.id === DEFAULT_THEME_ID) || COSMIC_THEMES[0];
    return {
      theme: DEFAULT_THEME_ID,
      setTheme: (id: CosmicThemeId) => {
        applyCosmicThemeToDOM(id);
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, id);
        } catch {
          /* ignore */
        }
      },
      themes: COSMIC_THEMES,
      currentThemeMeta: fallbackMeta,
    };
  }
  return context;
}
