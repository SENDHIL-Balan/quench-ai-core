import { useState, useRef, useEffect } from "react";
import { ChevronDown, Cpu, Sparkles, Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type SupportedModelId =
  "openai/gpt-oss-120b" | "nvidia/nemotron-3-super-120b-a12b" | "gemini-3.8-flash";

export interface ModelOption {
  id: SupportedModelId;
  name: string;
  provider: "Groq" | "NVIDIA" | "Google";
  badge: string;
  description: string;
  highlight?: boolean;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "Groq",
    badge: "117B MoE",
    description: "Ultra-fast OpenAI open-weight 120B MoE on Groq LPU with deep reasoning & tools",
    highlight: true,
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron 3 Super 120B",
    provider: "NVIDIA",
    badge: "120B Nemotron",
    description: "NVIDIA flagship 120B MoE reasoning model on official NVIDIA NIM API",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    provider: "Google",
    badge: "Multimodal",
    description: "Google DeepMind reasoning model with vision understanding & 1M context",
  },
];

export function ModelSelector({
  selectedModel,
  onSelectModel,
  className,
  compact = false,
  direction = "up",
}: {
  selectedModel: SupportedModelId;
  onSelectModel: (model: SupportedModelId) => void;
  className?: string;
  compact?: boolean;
  direction?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = MODEL_OPTIONS.find((m) => m.id === selectedModel) ?? MODEL_OPTIONS[0]!;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left z-30", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1.5 sm:gap-2 rounded-full border px-2.5 sm:px-3 py-1 text-xs transition-all cursor-pointer select-none backdrop-blur-md",
          open
            ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100 font-medium shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/30"
            : "border-white/10 bg-white/5 text-foreground hover:bg-white/10 hover:border-white/20",
        )}
        title={`Active AI reasoning model: ${activeOption.name} (${activeOption.provider}). Click to switch.`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          {activeOption.id === "openai/gpt-oss-120b" ? (
            <Zap className="size-3.5 text-cyan-400 fill-cyan-400/20 shrink-0" />
          ) : activeOption.provider === "NVIDIA" ? (
            <Cpu className="size-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="size-3.5 text-purple-400 shrink-0" />
          )}
          <span className="font-medium text-xs tracking-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-none">
            {compact ? activeOption.badge : activeOption.name}
          </span>
        </span>

        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold border hidden xs:inline-block shrink-0",
            activeOption.provider === "NVIDIA"
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
              : activeOption.provider === "Groq"
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/20"
                : "bg-purple-500/15 text-purple-300 border-purple-500/20",
          )}
        >
          {activeOption.provider}
        </span>

        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-150 shrink-0",
            open && (direction === "up" ? "rotate-0 text-cyan-300" : "rotate-180 text-cyan-300"),
            !open && direction === "up" && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 w-72 sm:w-80 rounded-2xl border border-white/15 bg-[#090d16]/95 backdrop-blur-2xl p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10",
            direction === "up"
              ? "bottom-full mb-2 origin-bottom-left"
              : "top-full mt-2 origin-top-left",
          )}
        >
          <div className="px-2 py-1.5 mb-1.5 border-b border-white/10 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90">
              Active AI Reasoning Model
            </p>
            <span className="text-[10px] text-cyan-400/80 font-medium">LLM Selector</span>
          </div>

          <div className="space-y-1.5">
            {MODEL_OPTIONS.map((option) => {
              const isSelected = option.id === selectedModel;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(option.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-all cursor-pointer backdrop-blur-md",
                    isSelected
                      ? "bg-cyan-500/20 border border-cyan-500/40 text-foreground shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "bg-white/[0.03] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground border border-white/5 hover:border-white/15",
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {option.id === "openai/gpt-oss-120b" ? (
                      <span className="flex size-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                        <Zap className="size-3.5 fill-cyan-400/20" />
                      </span>
                    ) : option.provider === "NVIDIA" ? (
                      <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                        <Cpu className="size-3.5" />
                      </span>
                    ) : (
                      <span className="flex size-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                        <Sparkles className="size-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        {option.name}
                        {option.highlight && (
                          <span className="rounded bg-cyan-400/20 px-1 py-0.2 text-[9px] font-bold text-cyan-300 border border-cyan-400/30 uppercase">
                            Fast LPU
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="size-3.5 text-cyan-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
