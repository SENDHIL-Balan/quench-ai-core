import { useState } from "react";
import { Sparkles, Orbit } from "lucide-react";
import { useCosmicTheme } from "@/lib/theme/CosmicThemeContext";
import { CosmicThemeGalleryModal } from "./CosmicThemeGalleryModal";
import { cn } from "@/lib/utils";

interface CosmicThemeButtonProps {
  className?: string;
  compact?: boolean;
}

export function CosmicThemeButton({ className, compact = false }: CosmicThemeButtonProps) {
  const [open, setOpen] = useState(false);
  const { currentThemeMeta } = useCosmicTheme();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "glass-panel text-muted-foreground hover:text-foreground relative flex items-center gap-2 rounded-2xl transition-all duration-200 cursor-pointer hover:border-primary/50 group shrink-0",
          compact ? "size-10 sm:size-11 justify-center" : "h-10 sm:h-11 px-3 sm:px-3.5",
          className,
        )}
        title={`Cosmic Environment: ${currentThemeMeta.name}. Click to change theme.`}
        aria-label="Cosmic Theme Selector"
      >
        <span
          className="size-2 rounded-full shrink-0 shadow-sm transition-all duration-300 group-hover:scale-125"
          style={{
            background: currentThemeMeta.accents[0],
            boxShadow: `0 0 8px ${currentThemeMeta.accents[0]}`,
          }}
        />

        <Orbit className="size-4 text-primary group-hover:rotate-45 transition-transform duration-300 shrink-0" />

        {!compact && (
          <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
              Cosmos
            </span>
            <span className="text-xs font-medium text-foreground truncate max-w-[90px]">
              {currentThemeMeta.name}
            </span>
          </div>
        )}
      </button>

      <CosmicThemeGalleryModal open={open} onOpenChange={setOpen} />
    </>
  );
}
