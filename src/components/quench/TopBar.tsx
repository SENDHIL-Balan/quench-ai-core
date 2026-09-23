import { useState, useRef, useEffect } from "react";
import { Menu, Search, X } from "lucide-react";
import { CosmicThemeButton } from "./CosmicThemeButton";

export function TopBar({
  onToggleSidebar,
  onToggleContext,
  onSearch,
}: {
  onToggleSidebar: () => void;
  onToggleContext?: () => void;
  onSearch?: (query: string) => void;
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      inputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    onSearch?.(val);
  };

  const clearSearch = () => {
    setQuery("");
    onSearch?.("");
  };

  return (
    <header className="relative w-full shrink-0 z-20">
      {/* Mobile Expanded Search Bar Mode */}
      {mobileSearchOpen ? (
        <div className="flex sm:hidden items-center gap-2 w-full animate-in fade-in duration-200">
          <div className="glass-panel flex h-11 flex-1 items-center gap-2.5 rounded-full px-3.5 border-cyan-500/40 bg-card/90">
            <Search className="text-cyan-400 size-4 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none text-foreground"
              placeholder="Search conversations, tasks, notes..."
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(false);
              clearSearch();
            }}
            className="glass-panel text-muted-foreground hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl cursor-pointer hover:border-cyan-400/40"
            aria-label="Close search"
          >
            <X className="size-5" />
          </button>
        </div>
      ) : (
        /* Normal Header Mode (Desktop + Mobile) */
        <div className="flex items-center gap-2 sm:gap-3 w-full justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Sidebar toggle */}
            <button
              onClick={onToggleSidebar}
              className="glass-panel text-muted-foreground hover:text-foreground flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl lg:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            {/* Desktop / Tablet Search Input */}
            <label className="glass-panel hidden sm:flex h-11 flex-1 max-w-xl items-center gap-3 rounded-full px-4 border-border/80">
              <Search className="text-muted-foreground size-4 shrink-0" />
              <input
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none text-foreground"
                placeholder="Search conversations, tasks, or anything..."
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>

            {/* Mobile Search Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="glass-panel text-muted-foreground hover:text-foreground flex sm:hidden size-10 items-center justify-center rounded-2xl cursor-pointer shrink-0 hover:border-cyan-400/40"
              aria-label="Toggle search"
              title="Search"
            >
              <Search className="size-5" />
            </button>
          </div>

          {/* Right Top Actions: Cosmic Theme Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <CosmicThemeButton />
          </div>
        </div>
      )}
    </header>
  );
}
