import { useState, useRef, useEffect } from "react";
import { Languages, Check, ChevronDown, Sparkles } from "lucide-react";
import { VOICE_LANGUAGES, type VoiceLanguage } from "@/lib/voice/types";
import { cn } from "@/lib/utils";

interface VoiceLanguageSelectorProps {
  value: VoiceLanguage;
  onChange: (language: VoiceLanguage) => void;
  variant?: "compact" | "full" | "dropdown";
  disabled?: boolean;
  className?: string;
}

export function VoiceLanguageSelector({
  value,
  onChange,
  variant = "compact",
  disabled = false,
  className,
}: VoiceLanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = VOICE_LANGUAGES.find((l) => l.code === value) || VOICE_LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (variant === "full") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5", className)}>
        {VOICE_LANGUAGES.map((lang) => {
          const isSelected = lang.code === value;
          return (
            <button
              key={lang.code}
              type="button"
              disabled={disabled}
              onClick={() => onChange(lang.code)}
              className={cn(
                "group relative flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer",
                isSelected
                  ? "border-cyan-500/60 bg-gradient-to-br from-cyan-500/15 via-cyan-500/5 to-transparent text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
                  isSelected
                    ? "border-cyan-400/50 bg-cyan-500/25 text-cyan-200"
                    : "border-white/10 bg-white/5 text-zinc-400 group-hover:text-white",
                )}
              >
                {lang.shortLabel}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-white">{lang.name}</span>
                  <span className="text-xs text-cyan-400/90 font-sans">{lang.nativeName}</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed line-clamp-1">
                  {lang.description}
                </p>
              </div>

              {isSelected && (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-black">
                  <Check className="size-3 stroke-[2.5]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Compact dropdown (for PromptComposer action bar or LiveVoice header)
  return (
    <div ref={containerRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Voice language: ${selected.name}`}
        title={`Voice Language: ${selected.name} (${selected.nativeName}). Click to switch.`}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all cursor-pointer select-none",
          value === "auto"
            ? "border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10 hover:border-white/25 hover:text-white"
            : "border-cyan-500/60 bg-cyan-500/20 text-cyan-200 font-medium shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:bg-cyan-500/30",
          open && "ring-1 ring-cyan-500/50",
          disabled && "opacity-40 cursor-not-allowed",
        )}
      >
        <Languages className="size-3.5 text-cyan-400 shrink-0" />
        <span className="font-medium">{selected.shortLabel}</span>
        <ChevronDown
          className={cn("size-3 text-zinc-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full mb-2 z-50 w-56 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Voice Language
            </span>
            <Sparkles className="size-3 text-cyan-400" />
          </div>

          {VOICE_LANGUAGES.map((lang) => {
            const isSelected = lang.code === value;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer",
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-200 font-medium"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                      isSelected ? "bg-cyan-500 text-black" : "bg-white/10 text-zinc-300",
                    )}
                  >
                    {lang.shortLabel.slice(0, 2)}
                  </span>
                  <div className="truncate">
                    <span className="text-white">{lang.name}</span>
                    <span className="ml-1 text-[11px] text-zinc-400">({lang.nativeName})</span>
                  </div>
                </div>
                {isSelected && <Check className="size-3.5 text-cyan-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
