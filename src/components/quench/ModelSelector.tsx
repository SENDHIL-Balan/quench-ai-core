import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Cpu,
  Sparkles,
  Check,
  Zap,
  Orbit,
  Code2,
  Globe,
  Gift,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModelCatalog } from "@/lib/models/useModelCatalog";

export type SupportedModelId =
  | "openai/gpt-oss-120b"
  | "nvidia/nemotron-3-super-120b-a12b"
  | "gemini-3.8-flash"
  | "kimi-k2.6"
  | "kimi-k2.7-code"
  | "openrouter/free"
  | string;

export const DEFAULT_MODEL_ID: SupportedModelId = "nvidia/nemotron-3-super-120b-a12b";

export type ProviderName = "OpenRouter" | "NVIDIA" | "Groq" | "Kimi" | "Google";

export interface ModelOption {
  id: string;
  name: string;
  provider: ProviderName;
  badge: string;
  description: string;
  highlight?: boolean;
  isFree?: boolean;
  contextLength?: number;
}

export const BASE_MODEL_OPTIONS: ModelOption[] = [
  // OpenRouter Free Models
  {
    id: "openrouter/free",
    name: "Free Models Router",
    provider: "OpenRouter",
    badge: "Auto Free",
    description:
      "OpenRouter official smart router that automatically directs to the best available free model",
    isFree: true,
    highlight: true,
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "Nemotron 3.5 Lightning",
    provider: "OpenRouter",
    badge: "1M Free",
    description: "NVIDIA 1M context high-speed reasoning model via OpenRouter Free Tier",
    isFree: true,
  },
  {
    id: "inclusionai/ling-3.0-flash-sante:free",
    name: "Ling 3.0 Flash Sante",
    provider: "OpenRouter",
    badge: "262K Free",
    description: "262K token context health, logic & chain-of-thought model on OpenRouter Free",
    isFree: true,
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "Liquid LFM 2.5",
    provider: "OpenRouter",
    badge: "Liquid AI",
    description: "Liquid neural network architecture with low latency and concise responses",
    isFree: true,
  },
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen 3.8 27B",
    provider: "OpenRouter",
    badge: "262K Free",
    description: "Alibaba 262K context multilingual foundation model on OpenRouter Free",
    isFree: true,
  },
  {
    id: "inclusionai/ling-3.0-flash-fin:free",
    name: "Ling 3.0 Flash Fin",
    provider: "OpenRouter",
    badge: "Finance",
    description: "Financial, market intelligence & analytical reasoning model on OpenRouter Free",
    isFree: true,
  },
  {
    id: "stealth/space-bunny-alpha",
    name: "Space Bunny Alpha",
    provider: "OpenRouter",
    badge: "1M Free",
    description: "Anonymous frontier model with 1M context window and fast inference",
    isFree: true,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B",
    provider: "OpenRouter",
    badge: "262K Free",
    description: "Google open-weights reasoning model running on OpenRouter Free Tier",
    isFree: true,
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini Code",
    provider: "OpenRouter",
    badge: "Code Agent",
    description: "Cohere software engineering & code generation model on OpenRouter Free",
    isFree: true,
  },

  // Existing Core Providers & Models
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron 3 Super 120B",
    provider: "NVIDIA",
    badge: "120B Nemotron",
    description: "NVIDIA flagship 120B MoE reasoning model on official NVIDIA NIM API",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "Groq",
    badge: "117B MoE",
    description: "Ultra-fast OpenAI open-weight 120B MoE on Groq LPU with deep reasoning & tools",
  },
  {
    id: "kimi-k2.6",
    name: "Kimi K2.6",
    provider: "Kimi",
    badge: "262K Context",
    description: "Moonshot AI Kimi K2.6 with 262K token context & deep multimodal reasoning",
  },
  {
    id: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    provider: "Kimi",
    badge: "Code Agent",
    description: "Moonshot AI specialized coding & algorithmic engineering model with 262K context",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    provider: "Google",
    badge: "Multimodal",
    description: "Google DeepMind reasoning model with vision understanding & 1M context",
  },
];

export function getProviderForModel(modelId: string): ProviderName {
  if (
    modelId.startsWith("openrouter/") ||
    modelId.includes(":free") ||
    modelId === "stealth/space-bunny-alpha"
  ) {
    return "OpenRouter";
  }
  if (modelId === "openai/gpt-oss-120b" || modelId.startsWith("openai/gpt-oss")) {
    return "Groq";
  }
  if (modelId.startsWith("nvidia/") || modelId.includes("nemotron")) {
    return "NVIDIA";
  }
  if (modelId.startsWith("kimi") || modelId.startsWith("moonshot")) {
    return "Kimi";
  }
  if (modelId.startsWith("gemini")) {
    return "Google";
  }
  return "OpenRouter";
}

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
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global shared model catalog with zero loop risk and singleton fetch
  const { models: allModels } = useModelCatalog();

  const activeOption = useMemo(() => {
    const found = allModels.find((m) => m.id === selectedModel);
    if (found) return found;

    const provider = getProviderForModel(selectedModel);
    const isFree = selectedModel.includes(":free") || selectedModel === "openrouter/free";
    return {
      id: selectedModel,
      name:
        selectedModel
          .split("/")
          .pop()
          ?.replace(/:free$/, " (free)") || selectedModel,
      provider,
      badge: isFree ? "Free" : provider,
      description: `Active model: ${selectedModel}`,
      isFree,
    } as ModelOption;
  }, [allModels, selectedModel]);

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

  // Filtered models for dropdown
  const filteredModels = useMemo(() => {
    let list = allModels;

    if (providerFilter !== "all") {
      list = list.filter((m) => m.provider.toLowerCase() === providerFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q),
      );
    }

    return list;
  }, [allModels, providerFilter, searchQuery]);

  // Split into Free Models and Standard Models
  const freeModels = useMemo(
    () => filteredModels.filter((m) => m.isFree || m.provider === "OpenRouter"),
    [filteredModels],
  );
  const otherModels = useMemo(
    () => filteredModels.filter((m) => !m.isFree && m.provider !== "OpenRouter"),
    [filteredModels],
  );

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
          {activeOption.provider === "OpenRouter" ? (
            <Globe className="size-3.5 text-violet-400 shrink-0" />
          ) : activeOption.id === "openai/gpt-oss-120b" ? (
            <Zap className="size-3.5 text-cyan-400 fill-cyan-400/20 shrink-0" />
          ) : activeOption.provider === "NVIDIA" ? (
            <Cpu className="size-3.5 text-emerald-400 shrink-0" />
          ) : activeOption.provider === "Kimi" ? (
            activeOption.id === "kimi-k2.7-code" ? (
              <Code2 className="size-3.5 text-sky-400 shrink-0" />
            ) : (
              <Orbit className="size-3.5 text-sky-400 shrink-0" />
            )
          ) : (
            <Sparkles className="size-3.5 text-purple-400 shrink-0" />
          )}

          <span className="font-medium text-xs tracking-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-none">
            {compact ? activeOption.badge : activeOption.name}
          </span>
        </span>

        {activeOption.isFree && (
          <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
            <Gift className="size-2.5 inline" />
            Free
          </span>
        )}

        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold border hidden xs:inline-block shrink-0",
            activeOption.provider === "OpenRouter"
              ? "bg-violet-500/15 text-violet-300 border-violet-500/25"
              : activeOption.provider === "NVIDIA"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                : activeOption.provider === "Groq"
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/20"
                  : activeOption.provider === "Kimi"
                    ? "bg-sky-500/15 text-sky-300 border-sky-500/20"
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
            "absolute left-0 w-80 sm:w-96 rounded-2xl border border-white/15 bg-[#090d16]/98 backdrop-blur-2xl p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10 max-h-[85vh] flex flex-col",
            direction === "up"
              ? "bottom-full mb-2 origin-bottom-left"
              : "top-full mt-2 origin-top-left",
          )}
        >
          {/* Header */}
          <div className="px-2 py-1.5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                AI Provider & Model Orchestrator
              </p>
            </div>
            <span className="text-[10px] text-cyan-400 font-medium">Bravura Hub</span>
          </div>

          {/* Provider Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-2 border-b border-white/5 scrollbar-none shrink-0">
            {(
              [
                { id: "all", label: "All" },
                { id: "openrouter", label: "OpenRouter ✨" },
                { id: "nvidia", label: "NVIDIA" },
                { id: "groq", label: "Groq" },
                { id: "kimi", label: "Kimi" },
                { id: "google", label: "Google" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProviderFilter(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
                  providerFilter === tab.id
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="pt-2 pb-1.5 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models (e.g. Free, Nemotron, Llama)..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Scrollable Model List */}
          <div className="overflow-y-auto min-h-0 flex-1 space-y-3 pr-1 overscroll-contain py-1">
            {/* Free / OpenRouter Models Section */}
            {freeModels.length > 0 && (
              <div>
                <div className="px-2 py-1 mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                  <span className="flex items-center gap-1.5">
                    {providerFilter === "openrouter" ? (
                      <>
                        <Globe className="size-3 text-violet-400" />
                        <span className="text-violet-300">
                          OpenRouter AI Models ({freeModels.length} Available)
                        </span>
                      </>
                    ) : (
                      <>
                        <Gift className="size-3 text-emerald-400" />
                        OpenRouter Free Models (0 Token Cost)
                      </>
                    )}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {providerFilter === "openrouter" ? "Multi-Provider Catalog" : "Always Ready"}
                  </span>
                </div>

                <div className="space-y-1">
                  {freeModels.map((option) => {
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
                          "flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-all cursor-pointer backdrop-blur-md",
                          isSelected
                            ? "bg-cyan-500/20 border border-cyan-500/40 text-foreground shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                            : "bg-white/[0.03] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground border border-white/5 hover:border-white/15",
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          <span className="flex size-6 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
                            {option.id === "openrouter/free" ? (
                              <Sparkles className="size-3.5 text-cyan-300" />
                            ) : (
                              <Globe className="size-3.5" />
                            )}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                              {option.name}
                              <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.1 text-[8px] font-bold uppercase tracking-wider shrink-0">
                                Free
                              </span>
                              {option.highlight && (
                                <span className="rounded bg-cyan-400/20 px-1 py-0.1 text-[8px] font-bold text-cyan-300 border border-cyan-400/30 uppercase shrink-0">
                                  Router
                                </span>
                              )}
                            </span>
                            {isSelected && <Check className="size-3.5 text-cyan-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-1 leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Core / Other Providers Models Section */}
            {otherModels.length > 0 && (
              <div>
                <div className="px-2 py-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90 flex items-center justify-between">
                  <span>Standard AI Providers</span>
                  <span className="text-[9px] text-muted-foreground">High Capacity</span>
                </div>

                <div className="space-y-1">
                  {otherModels.map((option) => {
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
                          "flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-all cursor-pointer backdrop-blur-md",
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
                          ) : option.provider === "Kimi" ? (
                            <span className="flex size-6 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
                              {option.id === "kimi-k2.7-code" ? (
                                <Code2 className="size-3.5" />
                              ) : (
                                <Orbit className="size-3.5" />
                              )}
                            </span>
                          ) : (
                            <span className="flex size-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                              <Sparkles className="size-3.5" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                              {option.name}
                              <span
                                className={cn(
                                  "rounded px-1 py-0.1 text-[8px] font-semibold border shrink-0",
                                  option.provider === "NVIDIA"
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                                    : option.provider === "Groq"
                                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/20"
                                      : option.provider === "Kimi"
                                        ? "bg-sky-500/15 text-sky-300 border-sky-500/20"
                                        : "bg-purple-500/15 text-purple-300 border-purple-500/20",
                                )}
                              >
                                {option.provider}
                              </span>
                            </span>
                            {isSelected && <Check className="size-3.5 text-cyan-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredModels.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No models matched &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
