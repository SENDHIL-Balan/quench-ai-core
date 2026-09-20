import { useState, useEffect } from "react";
import { X, Volume2, VolumeX, Mic, Sparkles, Check, Radio, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceProvider } from "@/lib/voice/types";

export type VoiceSetting = {
  voiceId: string;
  provider: VoiceProvider;
  autoSpeak: boolean;
};

const VOICES = [
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "Bravura George",
    provider: "elevenlabs" as const,
    gender: "Male",
    badge: "Conversational",
    accent: "Natural · Warm Storyteller",
    description: "Captivating, engaging and warm conversational cadence.",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bravura Sarah",
    provider: "elevenlabs" as const,
    gender: "Female",
    badge: "Confident",
    accent: "Articulate · Professional",
    description: "Mature, reassuring and clear vocal tone.",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Bravura Alice",
    provider: "elevenlabs" as const,
    gender: "Female",
    badge: "Articulate",
    accent: "Refined · Engaging",
    description: "Engaging, crisp clarity with excellent pacing.",
  },
  {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Bravura Roger",
    provider: "elevenlabs" as const,
    gender: "Male",
    badge: "Resonant",
    accent: "Relaxed · Deep Tone",
    description: "Laid-back, natural rhythm and rich acoustic depth.",
  },
  {
    id: "aura-asteria-en",
    name: "Bravura Asteria",
    provider: "deepgram" as const,
    gender: "Female",
    badge: "Expressive",
    accent: "Warm · Ultra-Fast",
    description: "Ultra-fast response latency, warm and natural inflection.",
  },
  {
    id: "aura-orion-en",
    name: "Bravura Orion",
    provider: "deepgram" as const,
    gender: "Male",
    badge: "Dynamic",
    accent: "Commanding · Clear",
    description: "Dynamic, professional male timbre with crisp articulation.",
  },
  {
    id: "aura-luna-en",
    name: "Bravura Luna",
    provider: "deepgram" as const,
    gender: "Female",
    badge: "Gentle",
    accent: "Smooth · Calm",
    description: "Friendly, gentle and smooth conversational voice.",
  },
];

export function VoiceAgentModal({
  onClose,
  voiceSetting,
  onSaveSetting,
}: {
  onClose: () => void;
  voiceSetting: VoiceSetting;
  onSaveSetting: (setting: VoiceSetting) => void;
}) {
  const [selectedVoice, setSelectedVoice] = useState(voiceSetting.voiceId);
  const [selectedProvider, setSelectedProvider] = useState<VoiceProvider>(voiceSetting.provider);
  const [autoSpeak, setAutoSpeak] = useState(voiceSetting.autoSpeak);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previewAudio) {
        previewAudio.pause();
      }
    };
  }, [onClose, previewAudio]);

  const handlePreview = async (voiceId: string, provider: VoiceProvider, name: string) => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }

    if (previewingId === voiceId) {
      setPreviewingId(null);
      return;
    }

    setPreviewingId(voiceId);

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Hello! I am ${name}, your voice agent powered by Bravura AI.`,
          voice: voiceId,
          provider,
        }),
      });

      if (!response.ok) {
        throw new Error("Preview failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setPreviewAudio(audio);

      audio.onended = () => {
        setPreviewingId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPreviewingId(null);
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch {
      setPreviewingId(null);
    }
  };

  const handleSelect = (voiceId: string, provider: "elevenlabs" | "deepgram") => {
    setSelectedVoice(voiceId);
    setSelectedProvider(provider);
    onSaveSetting({
      voiceId,
      provider,
      autoSpeak,
    });
  };

  const handleToggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    onSaveSetting({
      voiceId: selectedVoice,
      provider: selectedProvider,
      autoSpeak: next,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Agent Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      <div className="glass-panel relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c121e]/95 shadow-2xl">
        {/* Header */}
        <header className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 text-cyan-300 ring-1 ring-cyan-500/30">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Bravura Voice Agent</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Real-time live voice intelligence with ultra-low latency audio
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Status Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Speech Recognition: Active</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
              <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Bravura Neural Voice Synthesis: Ready</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Auto Read Aloud Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="space-y-0.5">
              <label
                htmlFor="auto-speak-toggle"
                className="text-sm font-semibold text-white cursor-pointer"
              >
                Auto-read agent responses
              </label>
              <p className="text-muted-foreground text-xs">
                Bravura AI will immediately speak out replies aloud as soon as generation completes.
              </p>
            </div>
            <button
              id="auto-speak-toggle"
              type="button"
              role="switch"
              aria-checked={autoSpeak}
              onClick={handleToggleAutoSpeak}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer",
                autoSpeak ? "border-cyan-500/60 bg-cyan-500/40" : "border-white/10 bg-white/5",
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 size-[18px] -translate-y-1/2 rounded-full shadow transition-all duration-200",
                  autoSpeak ? "bg-cyan-400 left-[22px]" : "left-[3px] bg-white/70",
                )}
              />
            </button>
          </div>

          {/* Voice Models List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-cyan-200/80 uppercase">
                Select Voice Model & Persona
              </h3>
              <span className="text-muted-foreground text-[11px]">
                Click card to select · Click play to preview
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {VOICES.map((v) => {
                const isSelected = selectedVoice === v.id;
                const isPlaying = previewingId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v.id, v.provider)}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-500/[0.08] ring-1 ring-cyan-500/30"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex size-7 items-center justify-center rounded-lg text-xs font-semibold",
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-300"
                              : "bg-white/5 text-muted-foreground",
                          )}
                        >
                          {isSelected ? (
                            <Check className="size-3.5" />
                          ) : (
                            <Radio className="size-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white">{v.name}</span>
                            <span className="rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {v.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-cyan-200/60">{v.accent}</p>
                        </div>
                      </div>

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handlePreview(v.id, v.provider, v.name);
                        }}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer",
                          isPlaying
                            ? "bg-cyan-500/30 text-cyan-200 animate-pulse"
                            : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10",
                        )}
                        title="Preview sample"
                        aria-label={`Preview ${v.name}`}
                      >
                        {isPlaying ? (
                          <VolumeX className="size-3.5" />
                        ) : (
                          <Play className="size-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    <p className="text-muted-foreground mt-2.5 text-xs leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mic className="size-3.5 text-emerald-400" />
            <span>Bravura High-Fidelity Voice Engine Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2 text-xs font-semibold text-black transition-transform hover:scale-105 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
