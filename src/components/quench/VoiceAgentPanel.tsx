import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  Square,
  Sparkles,
  Volume2,
  VolumeX,
  Send,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Radio,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { VoiceRecorder, type RecorderResult } from "@/lib/voice/recorder";
import {
  playVoiceAudio,
  stopAnyVoicePlayback,
  unlockAudio,
  type AudioPlaybackController,
} from "@/lib/voice/player";
import { cn } from "@/lib/utils";

export type VoiceAgentPanelProps = {
  /** Optional callback to inject transcript into active chat input or send immediately */
  onSendTranscript?: (text: string) => void;
  /** Optional callback when voice playback or voice agent modal requested */
  onOpenVoiceSettings?: () => void;
  /** Optional custom class name */
  className?: string;
  /** Whether the panel starts expanded or compact */
  defaultExpanded?: boolean;
};

type RecordingState = "idle" | "recording" | "transcribing" | "success" | "error";

export function VoiceAgentPanel({
  onSendTranscript,
  onOpenVoiceSettings,
  className,
  defaultExpanded = true,
}: VoiceAgentPanelProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [autoSend, setAutoSend] = useState<boolean>(false);
  const [autoSilenceStop, setAutoSilenceStop] = useState<boolean>(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [waveformMode, setWaveformMode] = useState<"bars" | "wave">("bars");

  // Refs for recording and canvas visualization
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackControllerRef = useRef<AudioPlaybackController | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (playbackControllerRef.current) {
        playbackControllerRef.current.stop();
        playbackControllerRef.current = null;
      }
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Canvas visualizer loop
  const renderWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const isLive = state === "recording";
    const freqData = freqDataRef.current;

    if (waveformMode === "bars") {
      const numBars = 32;
      const barWidth = Math.max(3, (width - (numBars - 1) * 3) / numBars);
      const gap = 3;

      for (let i = 0; i < numBars; i++) {
        let barHeight = 4;

        if (isLive && freqData && freqData.length > 0) {
          const sampleIndex = Math.floor((i / numBars) * (freqData.length * 0.7));
          const val = freqData[sampleIndex] ?? 0;
          const normalized = val / 255;
          barHeight = Math.max(4, normalized * (height * 0.85) * (0.4 + volumeLevel * 0.6));
        } else if (state === "transcribing") {
          // Animated shimmer wave while transcribing
          const t = Date.now() / 200;
          barHeight = Math.max(4, Math.sin(t + i * 0.3) * 12 + 16);
        } else {
          // Gentle idle breathing bar heights
          const t = Date.now() / 1000;
          barHeight = Math.max(3, Math.sin(t + i * 0.2) * 3 + 5);
        }

        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isLive) {
          gradient.addColorStop(0, "#22d3ee"); // cyan-400
          gradient.addColorStop(0.5, "#38bdf8"); // sky-400
          gradient.addColorStop(1, "#34d399"); // emerald-400
        } else if (state === "transcribing") {
          gradient.addColorStop(0, "#a855f7"); // purple-500
          gradient.addColorStop(1, "#06b6d4"); // cyan-500
        } else {
          gradient.addColorStop(0, "rgba(255,255,255,0.25)");
          gradient.addColorStop(1, "rgba(255,255,255,0.1)");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    } else {
      // Oscilloscope wave mode
      ctx.lineWidth = 2.5;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      if (isLive) {
        gradient.addColorStop(0, "#06b6d4");
        gradient.addColorStop(0.5, "#10b981");
        gradient.addColorStop(1, "#38bdf8");
      } else {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.4)");
      }
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const points = 64;
      const sliceWidth = width / (points - 1);
      let x = 0;

      for (let i = 0; i < points; i++) {
        let v = 0.5;
        if (isLive && freqData && freqData.length > 0) {
          const sampleIndex = Math.floor((i / points) * (freqData.length * 0.5));
          const val = freqData[sampleIndex] ?? 0;
          v = 0.5 + ((val - 128) / 255) * (0.8 + volumeLevel);
        } else {
          const t = Date.now() / 600;
          v = 0.5 + Math.sin(t + i * 0.15) * 0.08;
        }

        const y = Math.max(4, Math.min(height - 4, v * height));
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();
    }

    animFrameRef.current = requestAnimationFrame(renderWaveform);
  }, [state, volumeLevel, waveformMode]);

  // Start animation loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(renderWaveform);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderWaveform]);

  // Start recording
  const handleStart = async () => {
    setErrorMessage(null);
    setElapsedSec(0);
    setTranscript("");
    unlockAudio();

    const recorder = new VoiceRecorder({
      silenceMs: autoSilenceStop ? 2000 : 0,
      silenceThreshold: 0.02,
      onLevel: (level) => {
        setVolumeLevel(level);
      },
      onFrequencyData: (freq) => {
        freqDataRef.current = freq;
      },
      onAutoStop: (result) => {
        void handleStop(result);
      },
    });

    recorderRef.current = recorder;

    try {
      await recorder.start();
      setState("recording");

      timerIntervalRef.current = setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to access microphone.";
      setErrorMessage(msg);
      setState("error");
      recorderRef.current = null;
    }
  };

  // Stop recording and transcribe
  const handleStop = async (existingResult?: RecorderResult) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setState("transcribing");
    setVolumeLevel(0);
    freqDataRef.current = null;

    try {
      let result: RecorderResult | null = existingResult ?? null;
      if (!result && recorderRef.current) {
        result = await recorderRef.current.stop();
      }
      recorderRef.current = null;

      if (!result || result.blob.size === 0) {
        throw new Error("No audio data was recorded.");
      }

      // Send to Deepgram Nova-2 transcription API
      const formData = new FormData();
      formData.append("audio", result.blob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { ok?: boolean; text?: string; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Speech transcription failed.");
      }

      const text = data.text?.trim() || "";
      if (!text) {
        setTranscript("(No audible speech detected. Please speak clearly into your mic.)");
        setState("idle");
        return;
      }

      setTranscript(text);
      setState("success");

      if (autoSend && onSendTranscript) {
        onSendTranscript(text);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed.";
      setErrorMessage(msg);
      setState("error");
      recorderRef.current = null;
    }
  };

  // Toggle start / stop
  const handleToggle = () => {
    if (state === "recording") {
      void handleStop();
    } else {
      void handleStart();
    }
  };

  // Play transcript aloud via ElevenLabs / Deepgram Aura voice agent
  const handlePlayTTS = async () => {
    if (!transcript) return;

    if (isPlayingAudio) {
      stopAnyVoicePlayback();
      playbackControllerRef.current = null;
      setIsPlayingAudio(false);
      return;
    }

    stopAnyVoicePlayback();
    setIsPlayingAudio(true);
    try {
      const controller = playVoiceAudio({
        text: transcript,
        provider: "sarvam",
        voiceId: "kavya",
        onStart: () => {
          setIsPlayingAudio(true);
        },
        onEnded: () => {
          setIsPlayingAudio(false);
          playbackControllerRef.current = null;
        },
      });

      playbackControllerRef.current = controller;
      await controller.promise;
    } catch {
      setIsPlayingAudio(false);
      playbackControllerRef.current = null;
    }
  };

  const handleCopyTranscript = () => {
    if (!transcript) return;
    void navigator.clipboard.writeText(transcript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  return (
    <section
      aria-label="Voice Agent Live Transcription"
      className={cn(
        "glass-panel relative flex flex-col overflow-hidden rounded-3xl border border-white/10 p-5 shadow-xl transition-all",
        state === "recording" && "border-cyan-500/40 ring-1 ring-cyan-500/30",
        className,
      )}
    >
      {/* Header with Title & Service Badges */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-2xl transition-colors",
              state === "recording"
                ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30 animate-pulse"
                : "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30",
            )}
          >
            {state === "recording" ? (
              <Radio className="size-4.5 animate-pulse" />
            ) : (
              <Sparkles className="size-4.5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-white">AI Voice Agent</h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors",
                  state === "recording"
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : state === "transcribing"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
                )}
              >
                {state === "recording"
                  ? "Listening"
                  : state === "transcribing"
                    ? "Transcribing"
                    : "Voice Engine Active"}
              </span>
            </div>
            <p className="text-[11px] text-cyan-200/70">Live speech-to-text & AI voice</p>
          </div>
        </div>

        {/* Waveform mode toggle or settings button */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWaveformMode((m) => (m === "bars" ? "wave" : "bars"))}
            className="text-muted-foreground hover:text-white rounded-lg p-1.5 transition-colors cursor-pointer"
            title={`Switch to ${waveformMode === "bars" ? "oscilloscope" : "frequency bars"} view`}
            aria-label="Toggle waveform mode"
          >
            <Sliders className="size-3.5" />
          </button>
          {onOpenVoiceSettings && (
            <button
              type="button"
              onClick={onOpenVoiceSettings}
              className="text-muted-foreground hover:text-white rounded-lg p-1.5 transition-colors cursor-pointer"
              title="Configure Voice Agent personas"
              aria-label="Voice settings"
            >
              <Volume2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Waveform Indicator Box */}
      <div className="relative my-2 flex h-20 w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-3">
        <canvas ref={canvasRef} width={280} height={64} className="h-full w-full object-contain" />

        {/* Status Overlay Info */}
        <div className="absolute inset-x-3 bottom-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors",
                state === "recording"
                  ? "bg-red-400 animate-ping"
                  : state === "transcribing"
                    ? "bg-purple-400 animate-pulse"
                    : "bg-emerald-400",
              )}
            />
            <span className="font-mono text-[10px]">
              {state === "recording"
                ? `Recording ${formatTime(elapsedSec)}`
                : state === "transcribing"
                  ? "Processing Nova-2..."
                  : "Waveform standby"}
            </span>
          </div>

          {/* Live Level Meter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">Level:</span>
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-75",
                  volumeLevel > 0.6 ? "bg-amber-400" : "bg-cyan-400",
                )}
                style={{ width: `${Math.min(100, Math.round(volumeLevel * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="my-1.5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
          <AlertCircle className="size-4 shrink-0" />
          <span className="leading-tight">{errorMessage}</span>
        </div>
      )}

      {/* Controls: Start/Stop Toggle Button */}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={state === "transcribing"}
          aria-pressed={state === "recording"}
          className={cn(
            "relative flex flex-1 items-center justify-center gap-2.5 rounded-2xl py-3 px-4 text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-lg",
            state === "recording"
              ? "border border-red-500/60 bg-gradient-to-r from-red-600/80 to-rose-600/80 text-white shadow-red-500/25 hover:from-red-500 hover:to-rose-500"
              : state === "transcribing"
                ? "border border-purple-500/40 bg-purple-500/20 text-purple-200 cursor-not-allowed"
                : "border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:scale-[1.02] shadow-cyan-500/20 active:scale-[0.98]",
          )}
        >
          {state === "recording" ? (
            <>
              <Square className="size-4 fill-current animate-pulse" />
              <span>Stop & Transcribe</span>
              <span className="font-mono text-[11px] opacity-90">({formatTime(elapsedSec)})</span>
            </>
          ) : state === "transcribing" ? (
            <>
              <Loader2 className="size-4 animate-spin text-purple-300" />
              <span>Transcribing Speech...</span>
            </>
          ) : (
            <>
              <Mic className="size-4" />
              <span>Start Voice Agent</span>
            </>
          )}
        </button>

        {transcript && state !== "recording" && (
          <button
            type="button"
            onClick={() => {
              setTranscript("");
              setState("idle");
            }}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Reset transcript"
            aria-label="Reset transcript"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </div>

      {/* Transcription Output Bubble (when available) */}
      {transcript && (
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wide text-cyan-300 uppercase">
              Voice Transcription
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyTranscript}
                className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Copy transcript"
              >
                {isCopied ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <Copy className="size-3" />
                )}
                <span>{isCopied ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={() => void handlePlayTTS()}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] transition-colors cursor-pointer",
                  isPlayingAudio
                    ? "bg-cyan-500/20 text-cyan-300 font-medium"
                    : "text-muted-foreground hover:bg-white/10 hover:text-white",
                )}
                title={isPlayingAudio ? "Stop playback" : "Read aloud with AI Voice"}
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="size-3 text-cyan-400" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="size-3" />
                    <span>Speak</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-200 break-words whitespace-pre-wrap select-text">
            "{transcript}"
          </p>

          {/* Action: Send to AI Chat */}
          {onSendTranscript && (
            <button
              type="button"
              onClick={() => onSendTranscript(transcript)}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 py-2 px-3 text-xs font-medium text-cyan-200 transition-colors cursor-pointer"
            >
              <Send className="size-3.5" />
              <span>Send to Chat as Prompt</span>
            </button>
          )}
        </div>
      )}

      {/* Options Footer */}
      <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-muted-foreground">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoSilenceStop}
            onChange={(e) => setAutoSilenceStop(e.target.checked)}
            className="size-3.5 rounded border-white/20 bg-white/5 accent-cyan-500"
          />
          <span>Auto-stop on silence</span>
        </label>

        {onSendTranscript && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="size-3.5 rounded border-white/20 bg-white/5 accent-cyan-500"
            />
            <span>Auto-send to chat</span>
          </label>
        )}
      </div>
    </section>
  );
}
