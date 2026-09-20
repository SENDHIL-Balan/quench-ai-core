import { useState, useEffect } from "react";
import {
  X,
  Volume2,
  VolumeX,
  Mic,
  Sparkles,
  Check,
  Radio,
  Play,
  Loader2,
  Gauge,
  Sliders,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceProvider } from "@/lib/voice/types";

export type VoiceSetting = {
  voiceId: string;
  provider: VoiceProvider;
  autoSpeak: boolean;
  playbackSpeed?: number;
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
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(voiceSetting.playbackSpeed ?? 1.0);
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
          playbackSpeed,
        }),
      });

      if (!response.ok) {
        throw new Error("Preview failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      if (playbackSpeed && playbackSpeed > 0) {
        audio.playbackRate = playbackSpeed;
      }
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
      playbackSpeed,
    });
  };

  const handleToggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    onSaveSetting({
      voiceId: selectedVoice,
      provider: selectedProvider,
      autoSpeak: next,
      playbackSpeed,
    });
  };

  const handleSpeedChange = (speed: number) => {
    const clamped = Math.round(Math.max(0.5, Math.min(2.0, speed)) * 20) / 20; // 0.05 increments
    setPlaybackSpeed(clamped);
    if (previewAudio) {
      previewAudio.playbackRate = clamped;
    }
    onSaveSetting({
      voiceId: selectedVoice,
      provider: selectedProvider,
      autoSpeak,
      playbackSpeed: clamped,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Agent Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      <div className="glass-panel relative z-10 flex max-h-[94vh] sm:max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c121e]/95 shadow-2xl">
        {/* Header */}
        <header className="border-b border-white/10 px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 text-cyan-300 ring-1 ring-cyan-500/30">
                <Sparkles className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                  Voice Agent Settings
                </h2>
                <p className="text-muted-foreground text-[11px] sm:text-xs truncate">
                  Real-time live voice intelligence & playback settings
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Status Pills */}
          <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Voice Recognition: Active</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs text-cyan-300">
              <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Neural Synthesis: Ready</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-6">
          {/* Auto Read Aloud Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4">
            <div className="space-y-0.5 pr-2">
              <label
                htmlFor="auto-speak-toggle"
                className="text-xs sm:text-sm font-semibold text-white cursor-pointer"
              >
                Auto-read agent responses
              </label>
              <p className="text-muted-foreground text-[11px] sm:text-xs">
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

          {/* Playback Speed Control */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30">
                  <Gauge className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white">Playback Speed</h3>
                  <p className="text-muted-foreground text-[11px]">
                    Adjust speech rate for live intelligence & voice replies
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300">
                  {playbackSpeed.toFixed(2).replace(/\.?0+$/, "")}x
                </span>
                {playbackSpeed !== 1.0 && (
                  <button
                    type="button"
                    onClick={() => handleSpeedChange(1.0)}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Reset to normal speed (1.0x)"
                    aria-label="Reset speed"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Slider with range */}
            <div className="space-y-1.5 pt-1">
              <div className="relative flex items-center">
                <input
                  id="voice-playback-speed-slider"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={playbackSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  aria-label="Voice playback speed slider"
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                <span>0.5x (Slower)</span>
                <span className="text-cyan-400/80">1.0x Normal</span>
                <span>2.0x (Faster)</span>
              </div>
            </div>

            {/* Speed Presets Chips */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="text-[11px] text-muted-foreground shrink-0 mr-1 hidden sm:inline">
                Presets:
              </span>
              {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((preset) => {
                const isActive = Math.abs(playbackSpeed - preset) < 0.01;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSpeedChange(preset)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer shrink-0 font-mono",
                      isActive
                        ? "bg-cyan-500 text-black font-semibold shadow-sm shadow-cyan-500/30"
                        : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5",
                    )}
                  >
                    {preset.toFixed(2).replace(/\.?0+$/, "")}x
                  </button>
                );
              })}
            </div>
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
        <footer className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground min-w-0 pr-2">
            <Mic className="size-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Bravura Voice Engine Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 sm:px-5 sm:py-2 text-xs font-semibold text-black transition-transform hover:scale-105 cursor-pointer shadow-lg shadow-cyan-500/20 shrink-0"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
