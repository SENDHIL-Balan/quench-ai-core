import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Sparkles, Orbit, RotateCcw } from "lucide-react";
import { useCosmicTheme } from "@/lib/theme/CosmicThemeContext";
import { type CosmicThemeId, COSMIC_THEMES, DEFAULT_THEME_ID } from "@/lib/theme/cosmic-theme";
import { cn } from "@/lib/utils";

interface CosmicThemeGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CosmicThemeGalleryModal({ open, onOpenChange }: CosmicThemeGalleryModalProps) {
  const { theme, setTheme } = useCosmicTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-border/80 bg-background/95 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                <Orbit className="size-5 animate-[spin_24s_linear_infinite]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                  Cosmic Environments
                  <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                    10 Realms
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Select your universe atmosphere. Adjusts ambient lighting, glass refraction,
                  accent spectra, and particle physics.
                </DialogDescription>
              </div>
            </div>

            {theme !== DEFAULT_THEME_ID && (
              <button
                type="button"
                onClick={() => setTheme(DEFAULT_THEME_ID)}
                className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl border border-border/60 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Reset to Default
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {COSMIC_THEMES.map((item) => {
              const isSelected = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={cn(
                    "group relative flex flex-col text-left rounded-2xl p-4 transition-all duration-300 border cursor-pointer overflow-hidden",
                    isSelected
                      ? "border-primary/80 bg-primary/10 shadow-[0_0_24px_rgba(0,0,0,0.5)] ring-1 ring-primary/40"
                      : "border-border/60 hover:border-border hover:bg-white/[0.03] bg-card/40",
                  )}
                >
                  {/* Subtle theme gradient backdrop banner */}
                  <div
                    className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none"
                    style={{ background: item.previewGradient }}
                  />

                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-3 rounded-full shrink-0 shadow-sm"
                        style={{
                          background: item.accents[0],
                          boxShadow: `0 0 10px ${item.accents[0]}`,
                        }}
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                          {item.name}
                          {item.badge && (
                            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground border border-white/10">
                              {item.badge}
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.tagline}</p>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/20 border border-primary/40 px-2 py-0.5 rounded-full shrink-0">
                        <Check className="size-3" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        Select
                      </span>
                    )}
                  </div>

                  {/* Atmosphere description */}
                  <p className="relative z-10 text-xs text-muted-foreground/90 mt-2.5 line-clamp-2 leading-relaxed">
                    {item.atmosphere}
                  </p>

                  {/* Palette and feeling footer */}
                  <div className="relative z-10 mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5 items-center">
                        <span
                          className="size-3.5 rounded-full border border-black/40"
                          style={{ background: item.accents[0] }}
                          title={item.accentLabels}
                        />
                        <span
                          className="size-3.5 rounded-full border border-black/40"
                          style={{ background: item.accents[1] }}
                          title={item.accentLabels}
                        />
                      </div>
                      <span className="text-muted-foreground text-[10px]">{item.accentLabels}</span>
                    </div>

                    <span className="text-[10px] text-muted-foreground italic truncate max-w-[140px]">
                      {item.feeling.split("·")[0].trim()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-border/40 bg-card/60 flex items-center justify-between shrink-0 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            <span>Theme choice persists automatically across sessions</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
