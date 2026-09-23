import { useState, useEffect, useRef } from "react";
import {
  X,
  Volume2,
  VolumeX,
  Mic,
  Sparkles,
  Check,
  Play,
  Gauge,
  Sliders,
  RotateCcw,
  Zap,
  Bot,
  UserCheck,
  Headphones,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceProvider } from "@/lib/voice/types";
import {
  playVoiceAudio,
  stopAnyVoicePlayback,
  unlockAudio,
  voiceQueue,
  type AudioPlaybackController,
  type VoiceQueueState,
} from "@/lib/voice/player";

export type VoiceSetting = {
  voiceId: string;
  provider: VoiceProvider;
  autoSpeak: boolean;
  playbackSpeed?: number;
  handsFreeListen?: boolean;
};

export interface VoiceModelOption {
  id: string;
  name: string;
  provider: VoiceProvider;
  gender: "Male" | "Female";
  badge: string;
  accent: string;
  description: string;
  latencyTier: "ultra-fast" | "neural" | "sarvam-crystal";
}

export const VOICES: VoiceModelOption[] = [
  // Sarvam AI Models (Bulbul:v3)
  {
    id: "kavya",
    name: "Kavya",
    provider: "sarvam",
    gender: "Female",
    badge: "Crystal Clear",
    accent: "Natural · Expressive & Clear",
    description:
      "Sarvam AI Bulbul:v3 neural voice. Natural cadence, flawless articulation, and warm tone.",
    latencyTier: "sarvam-crystal",
  },
  {
    id: "rohan",
    name: "Rohan",
    provider: "sarvam",
    gender: "Male",
    badge: "Crystal Clear",
    accent: "Articulate · Professional",
    description:
      "Sarvam AI Bulbul:v3 voice. Dynamic pacing, sharp clarity, and confident vocal presence.",
    latencyTier: "sarvam-crystal",
  },
  {
    id: "priya",
    name: "Priya",
    provider: "sarvam",
    gender: "Female",
    badge: "Friendly",
    accent: "Warm · Conversational",
    description:
      "Sarvam AI Bulbul:v3 voice. Reassuring, welcoming cadence ideal for interactive conversation.",
    latencyTier: "sarvam-crystal",
  },
  {
    id: "rahul",
    name: "Rahul",
    provider: "sarvam",
    gender: "Male",
    badge: "Dynamic",
    accent: "Deep · Engaging Cadence",
    description: "Sarvam AI Bulbul:v3 voice. Resonant baritone articulation with steady cadence.",
    latencyTier: "sarvam-crystal",
  },
  {
    id: "shreya",
    name: "Shreya",
    provider: "sarvam",
    gender: "Female",
    badge: "Smooth",
    accent: "Polished · Melodic Flow",
    description:
      "Sarvam AI Bulbul:v3 voice. Smooth and polished delivery with clear pronunciation.",
    latencyTier: "sarvam-crystal",
  },
  {
    id: "ratan",
    name: "Ratan",
    provider: "sarvam",
    gender: "Male",
    badge: "Authoritative",
    accent: "Steady · Dignified Timbre",
    description: "Sarvam AI Bulbul:v3 voice. Authoritative and calm tone with exceptional clarity.",
    latencyTier: "sarvam-crystal",
  },
  // Deepgram Aura Models
  {
    id: "aura-asteria-en",
    name: "Nikki bella",
    provider: "deepgram",
    gender: "Female",
    badge: "Expressive",
    accent: "Warm · Instant Latency",
    description: "Sub-200ms ultra-fast response latency, warm and natural inflection.",
    latencyTier: "ultra-fast",
  },
  {
    id: "aura-orion-en",
    name: "Elon musk",
    provider: "deepgram",
    gender: "Male",
    badge: "Dynamic",
    accent: "Commanding · Clear",
    description: "Dynamic, professional male timbre with crisp articulation and low latency.",
    latencyTier: "ultra-fast",
  },
  {
    id: "aura-luna-en",
    name: "Bellie eilish",
    provider: "deepgram",
    gender: "Female",
    badge: "Gentle",
    accent: "Smooth · Calm",
    description: "Friendly, gentle and smooth conversational voice for relaxed chatting.",
    latencyTier: "ultra-fast",
  },
  {
    id: "aura-arcas-en",
    name: "Arcas",
    provider: "deepgram",
    gender: "Male",
    badge: "Authoritative",
    accent: "Resonant · Natural",
    description: "Calm, steady, and rich baritone timbre with crystal clear cadence.",
    latencyTier: "ultra-fast",
  },
  // ElevenLabs Models
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "Jeff besos",
    provider: "elevenlabs",
    gender: "Male",
    badge: "Conversational",
    accent: "Natural · Warm Storyteller",
    description:
      "Captivating, engaging and warm conversational cadence. Sounds like a real friend.",
    latencyTier: "neural",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Shakira",
    provider: "elevenlabs",
    gender: "Female",
    badge: "Confident",
    accent: "Articulate · Professional",
    description: "Mature, reassuring and clear vocal tone with nuanced human emotion.",
    latencyTier: "neural",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Melodi",
    provider: "elevenlabs",
    gender: "Female",
    badge: "Articulate",
    accent: "Refined · Engaging",
    description: "Engaging, crisp clarity with excellent pacing and warm inflection.",
    latencyTier: "neural",
  },
  {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "The Rock",
    provider: "elevenlabs",
    gender: "Male",
    badge: "Resonant",
    accent: "Relaxed · Deep Timbre",
    description: "Laid-back, natural rhythm and rich acoustic depth.",
    latencyTier: "neural",
  },
];

type VoiceFilter = "all" | "sarvam" | "neural" | "ultra-fast" | "male" | "female";

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
  const [handsFreeListen, setHandsFreeListen] = useState(voiceSetting.handsFreeListen ?? true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(voiceSetting.playbackSpeed ?? 1.0);
  const [activeFilter, setActiveFilter] = useState<VoiceFilter>("all");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [queueState, setQueueState] = useState<VoiceQueueState>("idle");

  const playbackControllerRef = useRef<AudioPlaybackController | null>(null);

  useEffect(() => {
    return voiceQueue.subscribe((state) => {
      setQueueState(state);
      if (state === "idle" || state === "interrupted") {
        setPreviewingId(null);
      }
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      stopAnyVoicePlayback();
      if (playbackControllerRef.current) {
        playbackControllerRef.current.stop();
        playbackControllerRef.current = null;
      }
    };
  }, [onClose]);

  const handlePreview = async (voiceId: string, provider: VoiceProvider, name: string) => {
    // Stop any existing controller
    if (playbackControllerRef.current) {
      playbackControllerRef.current.stop();
      playbackControllerRef.current = null;
    }

    if (previewingId === voiceId) {
      stopAnyVoicePlayback("preview_toggle_off");
      setPreviewingId(null);
      return;
    }

    // Unlock browser audio synchronously on this direct click event
    unlockAudio();
    setPreviewingId(voiceId);

    const greeting = `Hey there! I'm ${name}. I'm tuned and ready to chat. What's on your mind today?`;

    try {
      const controller = playVoiceAudio({
        text: greeting,
        voiceId,
        provider,
        playbackSpeed,
        forceReplay: true,
        allowBrowserFallback: true,
        onStart: () => {
          setPreviewingId(voiceId);
        },
        onEnded: () => {
          setPreviewingId((curr) => (curr === voiceId ? null : curr));
          playbackControllerRef.current = null;
        },
        onError: (err) => {
          console.warn("[VOICE_MODAL] Preview error:", err.message);
          setPreviewingId((curr) => (curr === voiceId ? null : curr));
          playbackControllerRef.current = null;
        },
      });

      playbackControllerRef.current = controller;
      await controller.promise;
    } catch {
      setPreviewingId((curr) => (curr === voiceId ? null : curr));
      playbackControllerRef.current = null;
    }
  };

  const handleSelectVoice = (voiceId: string, provider: VoiceProvider) => {
    // Only stop playback if another voice was playing
    if (previewingId && previewingId !== voiceId) {
      stopAnyVoicePlayback("voice_switched");
      setPreviewingId(null);
    }
    setSelectedVoice(voiceId);
    setSelectedProvider(provider);
    console.log(`[VOICE] Voice changed to ${voiceId} (${provider})`);
    onSaveSetting({
      voiceId,
      provider,
      autoSpeak,
      playbackSpeed,
      handsFreeListen,
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
      handsFreeListen,
    });
  };

  const handleToggleHandsFree = () => {
    const next = !handsFreeListen;
    setHandsFreeListen(next);
    onSaveSetting({
      voiceId: selectedVoice,
      provider: selectedProvider,
      autoSpeak,
      playbackSpeed,
      handsFreeListen: next,
    });
  };

  const handleSpeedChange = (speed: number) => {
    const clamped = Math.round(Math.max(0.5, Math.min(2.0, speed)) * 20) / 20;
    setPlaybackSpeed(clamped);
    onSaveSetting({
      voiceId: selectedVoice,
      provider: selectedProvider,
      autoSpeak,
      playbackSpeed: clamped,
      handsFreeListen,
    });
  };

  const filteredVoices = VOICES.filter((v) => {
    if (activeFilter === "sarvam") return v.provider === "sarvam";
    if (activeFilter === "neural") return v.provider === "elevenlabs";
    if (activeFilter === "ultra-fast") return v.provider === "deepgram";
    if (activeFilter === "male") return v.gender === "Male";
    if (activeFilter === "female") return v.gender === "Female";
    return true;
  });

  const getSpeedDescriptor = (speed: number) => {
    if (speed <= 0.8) return "Relaxed & Calm";
    if (speed === 1.0) return "Natural Spoken Pacing";
    if (speed <= 1.25) return "Dynamic & Crisp";
    if (speed <= 1.5) return "Brisk";
    return "Ultra Fast";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Configuration Overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
    >
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Main modal container */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#080d18]/95 shadow-[0_0_80px_rgba(6,182,212,0.15)] backdrop-blur-2xl">
        {/* Header */}
        <header className="border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-indigo-500/20 text-cyan-300 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10">
                <Sliders className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate flex items-center gap-2">
                  <span>Voice Configuration</span>
                  <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    Live Engine
                  </span>
                </h2>
                <p className="text-muted-foreground text-xs truncate">
                  Customize AI voice personas, speech cadence & hands-free behavior
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-white flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 cursor-pointer"
              aria-label="Close voice settings"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-6">
          {/* Section 1: Speech Rate / Cadence */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30">
                  <Gauge className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Speech Rate & Cadence</h3>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      {getSpeedDescriptor(playbackSpeed)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Fine-tune the vocal speed for AI voice output
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 shadow-sm">
                  {playbackSpeed.toFixed(2).replace(/\.?0+$/, "")}x
                </span>
                {playbackSpeed !== 1.0 && (
                  <button
                    type="button"
                    onClick={() => handleSpeedChange(1.0)}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Reset to 1.0x (Natural)"
                    aria-label="Reset speed"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Range Slider */}
            <div className="space-y-1.5 pt-1">
              <input
                id="voice-speed-slider"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                aria-label="Adjust voice speech rate"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-1">
                <span>0.5x (Slow)</span>
                <span className="text-cyan-400/90 font-medium">1.0x Natural</span>
                <span>2.0x (Swift)</span>
              </div>
            </div>

            {/* Quick Speed Presets */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
              {[0.8, 1.0, 1.15, 1.25, 1.5, 1.75].map((preset) => {
                const isActive = Math.abs(playbackSpeed - preset) < 0.02;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSpeedChange(preset)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-mono transition-all cursor-pointer",
                      isActive
                        ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                        : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/5",
                    )}
                  >
                    {preset.toFixed(2).replace(/\.?0+$/, "")}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Auto-play & Hands-free settings */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Auto Read Aloud */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auto-speak-switch"
                    className="text-xs sm:text-sm font-semibold text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <Headphones className="size-3.5 text-cyan-400" />
                    <span>Auto-play responses</span>
                  </label>
                  <button
                    id="auto-speak-switch"
                    type="button"
                    role="switch"
                    aria-checked={autoSpeak}
                    onClick={handleToggleAutoSpeak}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer",
                      autoSpeak
                        ? "border-cyan-500/60 bg-cyan-500/40"
                        : "border-white/10 bg-white/5",
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
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Automatically vocalizes answers aloud as soon as AI response finishes.
                </p>
              </div>
            </div>

            {/* Hands-free Auto-Listen */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="hands-free-switch"
                    className="text-xs sm:text-sm font-semibold text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <Mic className="size-3.5 text-emerald-400" />
                    <span>Hands-free auto listen</span>
                  </label>
                  <button
                    id="hands-free-switch"
                    type="button"
                    role="switch"
                    aria-checked={handsFreeListen}
                    onClick={handleToggleHandsFree}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer",
                      handsFreeListen
                        ? "border-emerald-500/60 bg-emerald-500/40"
                        : "border-white/10 bg-white/5",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1/2 size-[18px] -translate-y-1/2 rounded-full shadow transition-all duration-200",
                        handsFreeListen ? "bg-emerald-400 left-[22px]" : "left-[3px] bg-white/70",
                      )}
                    />
                  </button>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Automatically turns the microphone back on after AI speaks for fluid conversation.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: AI Voice Model Selection */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-cyan-200 uppercase flex items-center gap-1.5">
                  <Bot className="size-3.5 text-cyan-400" />
                  <span>Select Voice Persona</span>
                </h3>
                <p className="text-muted-foreground text-[11px]">
                  Choose from neural storytelling and low-latency voice models
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-[11px] overflow-x-auto">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "sarvam", label: "Sarvam (Clear)" },
                    { id: "ultra-fast", label: "Dynamic" },
                    { id: "neural", label: "Expressive" },
                    { id: "male", label: "Male" },
                    { id: "female", label: "Female" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap",
                      activeFilter === f.id
                        ? "bg-cyan-500/25 text-cyan-300 font-semibold"
                        : "text-muted-foreground hover:text-white",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Cards Grid */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {filteredVoices.map((v) => {
                const isSelected = selectedVoice === v.id;
                const isPlaying = previewingId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVoice(v.id, v.provider)}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-cyan-500/70 bg-gradient-to-br from-cyan-500/[0.12] to-blue-500/[0.05] ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex size-8 items-center justify-center rounded-xl text-xs font-semibold transition-colors",
                              isSelected
                                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                                : "bg-white/10 text-muted-foreground group-hover:text-white",
                            )}
                          >
                            {isSelected ? (
                              <Check className="size-4 stroke-[3]" />
                            ) : (
                              <UserCheck className="size-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-white">{v.name}</span>
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                                  v.latencyTier === "sarvam-crystal"
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    : v.latencyTier === "ultra-fast"
                                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                      : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
                                )}
                              >
                                {v.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-cyan-200/70 font-medium">{v.accent}</p>
                          </div>
                        </div>

                        {/* Audio Preview Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handlePreview(v.id, v.provider, v.name);
                          }}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer shrink-0",
                            isPlaying
                              ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30 scale-105"
                              : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/15",
                          )}
                          title={isPlaying ? `Stop previewing ${v.name}` : `Preview ${v.name}`}
                          aria-label={isPlaying ? `Stop previewing ${v.name}` : `Preview ${v.name}`}
                        >
                          {isPlaying ? (
                            queueState === "fetching" ? (
                              <Loader2 className="size-4 animate-spin text-black" />
                            ) : (
                              <VolumeX className="size-4 animate-pulse" />
                            )
                          ) : (
                            <Play className="size-4 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>

                      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                        {v.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="text-cyan-300/70 font-medium">Voice Model</span>
                      <span>{v.gender}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Voice engine active & ready</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 text-xs font-semibold text-black transition-transform hover:scale-105 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            Apply & Done
          </button>
        </footer>
      </div>
    </div>
  );
}
