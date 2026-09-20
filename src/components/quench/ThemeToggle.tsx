import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "bravura-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* localStorage unavailable */
  }
  return "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* localStorage unavailable */
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      id="theme-toggle-button"
      onClick={toggleTheme}
      className={
        className ??
        "glass-panel text-muted-foreground hover:text-foreground hover:border-primary/40 flex size-10 sm:size-11 items-center justify-center rounded-full cursor-pointer shrink-0 transition-all duration-200"
      }
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-5 transition-transform duration-200 hover:rotate-45 text-amber-300" />
        ) : (
          <Moon className="size-5 transition-transform duration-200 hover:-rotate-12 text-cyan-600" />
        )
      ) : (
        <Sun className="size-5 text-muted-foreground opacity-70" />
      )}
    </button>
  );
}
