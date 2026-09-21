import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  Radio,
  RotateCcw,
  Square,
  Check,
  ChevronDown,
} from "lucide-react";
import { VoiceRecorder, type RecorderResult } from "@/lib/voice/recorder";
import { slangService } from "@/lib/slang";
import type { VoiceSetting } from "./VoiceAgentModal";
import type { ModeId } from "@/lib/agent/modes";
import { cn } from "@/lib/utils";

interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<SpeechRecognitionResultItem>>;
}
interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface LiveVoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceSetting: VoiceSetting;
  onVoiceSettingChange?: (setting: VoiceSetting) => void;
  onTranscriptReady?: (userText: string, assistantReply: string) => void;
  mode?: ModeId;
  deepThink?: boolean;
}

type LiveState = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "error";

const BRAVURA_VOICES = [
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "Bravura George",
    provider: "elevenlabs" as const,
    desc: "Warm & Conversational",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bravura Sarah",
    provider: "elevenlabs" as const,
    desc: "Mature & Reassuring",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Bravura Alice",
    provider: "elevenlabs" as const,
    desc: "Crisp & Articulate",
  },
  {
    id: "aura-asteria-en",
    name: "Bravura Asteria",
    provider: "deepgram" as const,
    desc: "Fast & Natural",
  },
  {
    id: "aura-orion-en",
    name: "Bravura Orion",
    provider: "deepgram" as const,
    desc: "Deep & Professional",
  },
  {
    id: "aura-luna-en",
    name: "Bravura Luna",
    provider: "deepgram" as const,
    desc: "Gentle & Smooth",
  },
];

export function LiveVoiceAgentModal({
  isOpen,
  onClose,
  voiceSetting,
  onVoiceSettingChange,
  onTranscriptReady,
  mode = "chat",
  deepThink = false,
}: LiveVoiceAgentModalProps) {
  const [liveState, setLiveState] = useState<LiveState>("idle");
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
  const [conversationTurns, setConversationTurns] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([]);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioAbortRef = useRef<AbortController | null>(null);
  const audioSessionIdRef = useRef<number>(0);
  const isTurnActiveRef = useRef<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isComponentMounted = useRef<boolean>(true);
  const activeSessionRef = useRef<boolean>(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognizedTextRef = useRef<string>("");

  // Clean audio helper
  const cleanupAudio = useCallback(() => {
    if (recorderRef.current) {
      try {
        recorderRef.current.cancel();
      } catch {
        // ignore
      }
      recorderRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (audioAbortRef.current) {
      audioAbortRef.current.abort();
      audioAbortRef.current = null;
    }
    audioSessionIdRef.current += 1;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Canvas waveform visualizer
  const renderVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const isLiveListening = liveState === "listening";
    const isAiSpeaking = liveState === "speaking";
    const isBusy = liveState === "transcribing" || liveState === "thinking";
    const freq = freqDataRef.current;

    const numBars = 36;
    const barWidth = Math.max(3, (width - (numBars - 1) * 3.5) / numBars);
    const gap = 3.5;

    for (let i = 0; i < numBars; i++) {
      let barHeight = 6;
      const t = Date.now() / 180;

      if (isLiveListening && freq && freq.length > 0) {
        const sampleIdx = Math.floor((i / numBars) * (freq.length * 0.7));
        const val = freq[sampleIdx] ?? 0;
        const normalized = val / 255;
        barHeight = Math.max(6, normalized * (height * 0.85) * (0.3 + volumeLevel * 0.8));
      } else if (isAiSpeaking) {
        const wave = Math.sin(t + i * 0.35) * 0.5 + 0.5;
        barHeight = Math.max(6, wave * (height * 0.7) + 8);
      } else if (isBusy) {
        const wave = Math.sin(t * 1.5 + i * 0.4) * 0.5 + 0.5;
        barHeight = Math.max(4, wave * 22 + 6);
      } else {
        const idleWave = Math.sin(t * 0.5 + i * 0.2) * 3 + 6;
        barHeight = Math.max(4, idleWave);
      }

      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      if (isLiveListening) {
        gradient.addColorStop(0, "#38bdf8"); // sky-400
        gradient.addColorStop(0.5, "#22d3ee"); // cyan-400
        gradient.addColorStop(1, "#34d399"); // emerald-400
      } else if (isAiSpeaking) {
        gradient.addColorStop(0, "#818cf8"); // indigo-400
        gradient.addColorStop(0.5, "#38bdf8"); // sky-400
        gradient.addColorStop(1, "#06b6d4"); // cyan-500
      } else if (isBusy) {
        gradient.addColorStop(0, "#c084fc"); // purple-400
        gradient.addColorStop(1, "#38bdf8"); // sky-400
      } else {
        gradient.addColorStop(0, "rgba(255,255,255,0.2)");
        gradient.addColorStop(1, "rgba(255,255,255,0.08)");
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }

    animFrameRef.current = requestAnimationFrame(renderVisualizer);
  }, [liveState, volumeLevel]);

  useEffect(() => {
    if (isOpen) {
      animFrameRef.current = requestAnimationFrame(renderVisualizer);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, renderVisualizer]);

  // Turn execution: generate AI reply and speak it aloud
  const processUserSpeech = useCallback(
    async (spokenText: string) => {
      if (!isComponentMounted.current || !activeSessionRef.current) return;
      if (isTurnActiveRef.current) return;
      if (!spokenText.trim()) {
        void startListening();
        return;
      }

      isTurnActiveRef.current = true;
      cleanupAudio();
      const currentSessionId = audioSessionIdRef.current;
      const abortController = new AbortController();
      audioAbortRef.current = abortController;

      setUserTranscript(spokenText);
      setLiveState("thinking");
      setErrorMessage(null);

      // Build message array with recent history for context
      const newHistory = [...conversationTurns, { role: "user" as const, text: spokenText }];
      setConversationTurns(newHistory);

      const uiMessages = newHistory.map((item, idx) => ({
        id: `turn-${idx}`,
        role: item.role,
        parts: [{ type: "text" as const, text: item.text }],
      }));

      let replyText = "";
      try {
        const slangContext = slangService.getSlangContextForPrompt(spokenText);
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: uiMessages,
            mode,
            deepThink,
            slangContext,
          }),
        });

        if (!chatRes.ok) {
          const errDetail = await chatRes.json().catch(() => null);
          throw new Error(errDetail?.error || "Bravura AI could not process your voice request.");
        }

        const reader = chatRes.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let done = false;
          let buffer = "";
          while (!done) {
            const { value, done: isDone } = await reader.read();
            done = isDone;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.type === "text-delta" && parsed.delta) {
                      replyText += parsed.delta;
                    }
                  } catch {
                    // skip non-JSON stream ping
                  }
                }
              }
            }
          }
        }

        // If reply text was not in SSE format or stream format, fallback to full text
        if (!replyText.trim()) {
          replyText = "I heard you clearly. How else can I assist you with Bravura AI?";
        }
      } catch (err) {
        console.error("Live voice chat error:", err);
        replyText =
          "I heard your question, but encountered a connection issue. Please try speaking again.";
      }

      if (
        !isComponentMounted.current ||
        !activeSessionRef.current ||
        audioSessionIdRef.current !== currentSessionId
      ) {
        isTurnActiveRef.current = false;
        return;
      }

      setAgentResponse(replyText);
      setConversationTurns((prev) => [...prev, { role: "assistant", text: replyText }]);
      onTranscriptReady?.(spokenText, replyText);

      // Speak AI response aloud
      setLiveState("speaking");
      try {
        const speakRes = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: replyText,
            voice: voiceSetting.voiceId,
            provider: voiceSetting.provider,
            playbackSpeed: voiceSetting.playbackSpeed,
          }),
          signal: abortController.signal,
        });

        if (
          !isComponentMounted.current ||
          !activeSessionRef.current ||
          audioSessionIdRef.current !== currentSessionId
        ) {
          isTurnActiveRef.current = false;
          return;
        }

        if (!speakRes.ok) {
          // Fallback to browser SpeechSynthesis if server speak fails
          await new Promise<void>((resolve, reject) => {
            if (!("speechSynthesis" in window)) {
              reject(new Error("Speech synthesis failed"));
              return;
            }
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(replyText);
            utterance.rate = voiceSetting.playbackSpeed || 1.0;
            utterance.onend = () => resolve();
            utterance.onerror = () => reject(new Error("Browser speech synthesis failed"));
            window.speechSynthesis.speak(utterance);
          });
        } else {
          const blob = await speakRes.blob();
          if (
            !isComponentMounted.current ||
            !activeSessionRef.current ||
            audioSessionIdRef.current !== currentSessionId
          ) {
            isTurnActiveRef.current = false;
            return;
          }

          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          const audio = new Audio();
          audio.src = url;
          if (voiceSetting.playbackSpeed && voiceSetting.playbackSpeed > 0) {
            audio.playbackRate = voiceSetting.playbackSpeed;
          }
          audioRef.current = audio;

          await new Promise<void>((resolve, reject) => {
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error("Audio playback failed"));
            const p = audio.play();
            if (p !== undefined) {
              p.catch((playErr) => {
                console.warn(
                  "Audio element play rejected, falling back to speech synthesis:",
                  playErr,
                );
                reject(playErr);
              });
            }
          });
        }
      } catch (err) {
        if (audioSessionIdRef.current === currentSessionId && !abortController.signal.aborted) {
          console.warn("Speech playback notice, attempting browser fallback:", err);
          try {
            await new Promise<void>((resolve, reject) => {
              if (!("speechSynthesis" in window)) {
                reject(err);
                return;
              }
              window.speechSynthesis.cancel();
              window.speechSynthesis.resume();
              const utterance = new SpeechSynthesisUtterance(replyText);
              utterance.rate = voiceSetting.playbackSpeed || 1.0;
              utterance.onend = () => resolve();
              utterance.onerror = () => reject(err);
              (window as unknown as { __liveUtt?: unknown }).__liveUtt = utterance;
              window.speechSynthesis.speak(utterance);
            });
          } catch (fallbackErr) {
            console.warn("Browser speech fallback failed:", fallbackErr);
          }
        }
      } finally {
        if (audioSessionIdRef.current === currentSessionId) {
          cleanupAudio();
        }
        isTurnActiveRef.current = false;
      }

      // Automatically cycle back to listening for continuous hands-free conversation!
      if (isComponentMounted.current && activeSessionRef.current && !isMuted) {
        void startListening();
      } else {
        setLiveState("idle");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationTurns, mode, deepThink, voiceSetting, isMuted, onTranscriptReady],
  );

  // Stop recording and transcribe user speech
  const stopAndTranscribe = useCallback(async () => {
    if (isTurnActiveRef.current || !activeSessionRef.current) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const browserSpoken = recognizedTextRef.current.trim();
    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (browserSpoken) {
      if (recorder) {
        recorder.cancel();
      }
      void processUserSpeech(browserSpoken);
      return;
    }

    if (!recorder) return;

    let result: RecorderResult;
    try {
      result = await recorder.stop();
    } catch {
      setLiveState("idle");
      return;
    }

    if (!activeSessionRef.current) return;

    if (result.blob.size < 300) {
      // Audio was too short or silence; continue listening without thrashing
      if (activeSessionRef.current && !isMuted) {
        void startListening();
      } else {
        setLiveState("idle");
      }
      return;
    }

    setLiveState("transcribing");
    try {
      const formData = new FormData();
      const ext = result.mimeType.includes("mp4") ? "mp4" : "webm";
      formData.append("audio", result.blob, `recording.${ext}`);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json().catch(() => null)) as
        { ok: true; text: string } | { ok: false; error: string } | null;

      if (!res.ok || !payload || !payload.ok || !payload.text?.trim()) {
        // Did not catch speech, resume listening smoothly
        if (activeSessionRef.current && !isMuted) {
          void startListening();
        } else {
          setLiveState("idle");
        }
        return;
      }

      void processUserSpeech(payload.text.trim());
    } catch (err) {
      console.error("Transcribe error in live voice:", err);
      if (activeSessionRef.current && !isMuted) {
        void startListening();
      } else {
        setLiveState("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, processUserSpeech]);

  // Start listening to user microphone
  const startListening = useCallback(async () => {
    if (isMuted || !activeSessionRef.current) return;
    cleanupAudio();
    setErrorMessage(null);
    setLiveState("listening");
    setVolumeLevel(0);
    recognizedTextRef.current = "";

    // Start native browser speech recognition if supported
    try {
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition })
          .webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = voiceSetting.voiceId.includes("British") ? "en-GB" : "en-US";
        rec.onresult = (event: SpeechRecognitionEvent) => {
          let str = "";
          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i]?.[0];
            if (item?.transcript) str += item.transcript;
          }
          if (str.trim()) {
            recognizedTextRef.current = str.trim();
            setUserTranscript(str.trim());
          }
        };
        rec.onerror = () => {};
        rec.start();
        recognitionRef.current = rec;
      }
    } catch {
      // Browser SpeechRecognition optional
    }

    const recorder = new VoiceRecorder({
      onLevel: (lvl) => setVolumeLevel(lvl),
      onFrequencyData: (data) => {
        freqDataRef.current = data;
      },
      silenceMs: 2200,
      silenceThreshold: 0.015,
      maxDurationMs: 60_000,
      onSilence: () => {
        if (!isTurnActiveRef.current && activeSessionRef.current) {
          void stopAndTranscribe();
        }
      },
    });
    recorderRef.current = recorder;

    try {
      await recorder.start();
    } catch (err) {
      recorderRef.current = null;
      setLiveState("error");
      setErrorMessage(err instanceof Error ? err.message : "Microphone unavailable.");
    }
  }, [cleanupAudio, isMuted, stopAndTranscribe, voiceSetting]);

  // Interrupt AI playback immediately and listen
  const handleInterrupt = useCallback(() => {
    cleanupAudio();
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    void startListening();
  }, [cleanupAudio, startListening]);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        // Muting: stop recording/playback
        recorderRef.current?.cancel();
        recorderRef.current = null;
        cleanupAudio();
        setLiveState("idle");
      } else {
        // Unmuting: start listening
        setTimeout(() => void startListening(), 50);
      }
      return next;
    });
  }, [cleanupAudio, startListening]);

  // Auto-start when modal opens
  useEffect(() => {
    isComponentMounted.current = true;
    if (isOpen) {
      activeSessionRef.current = true;
      setIsMuted(false);
      setUserTranscript("");
      setAgentResponse("");
      const timer = setTimeout(() => {
        void startListening();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      activeSessionRef.current = false;
      recorderRef.current?.cancel();
      recorderRef.current = null;
      cleanupAudio();
      setLiveState("idle");
    }
    return () => {
      isComponentMounted.current = false;
      activeSessionRef.current = false;
      recorderRef.current?.cancel();
      recorderRef.current = null;
      cleanupAudio();
    };
  }, [isOpen, startListening, cleanupAudio]);

  if (!isOpen) return null;

  const currentVoice =
    BRAVURA_VOICES.find((v) => v.id === voiceSetting.voiceId) || BRAVURA_VOICES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
      />

      {/* Main Live Voice Container */}
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl sm:rounded-[32px] border border-cyan-500/30 bg-[#090d16]/95 shadow-[0_0_80px_rgba(6,182,212,0.18)] backdrop-blur-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="relative flex size-3 shrink-0 items-center justify-center">
              <span className="absolute size-2.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
              <span className="size-2 rounded-full bg-cyan-400" />
            </div>
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-white truncate">
              Live Voice
            </span>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-300 shrink-0">
              Two-Way
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Voice Persona Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setVoiceDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1 text-xs text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
                title="Change Voice Persona"
              >
                <span className="max-w-[90px] sm:max-w-none truncate">{currentVoice.name}</span>
                <ChevronDown className="size-3 shrink-0" />
              </button>

              {voiceDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl border border-white/10 bg-[#0c1322] p-1.5 shadow-2xl">
                  <p className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Bravura Voice Persona
                  </p>
                  {BRAVURA_VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        onVoiceSettingChange?.({
                          voiceId: v.id,
                          provider: v.provider,
                          autoSpeak: voiceSetting.autoSpeak,
                          playbackSpeed: voiceSetting.playbackSpeed,
                        });
                        setVoiceDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer",
                        voiceSetting.voiceId === v.id
                          ? "bg-cyan-500/20 text-cyan-300 font-medium"
                          : "text-white/80 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <div className="min-w-0 pr-1">
                        <p className="truncate">{v.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{v.desc}</p>
                      </div>
                      {voiceSetting.voiceId === v.id && (
                        <Check className="size-3.5 text-cyan-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="End live session"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Central Visualizer Area */}
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          {/* Animated Central Glowing Orb */}
          <div className="relative mb-8 flex size-40 items-center justify-center">
            {/* Outer dynamic rings */}
            <div
              className={cn(
                "absolute inset-0 rounded-full transition-all duration-300",
                liveState === "listening" &&
                  "bg-gradient-to-tr from-cyan-500/20 via-sky-500/20 to-emerald-500/20 animate-pulse",
                liveState === "speaking" &&
                  "bg-gradient-to-tr from-indigo-500/25 via-cyan-500/25 to-sky-500/25 animate-pulse",
                liveState === "thinking" &&
                  "bg-gradient-to-tr from-purple-500/30 to-cyan-500/30 animate-spin",
                liveState === "idle" && "bg-white/5",
              )}
              style={{
                transform: `scale(${1 + Math.min(volumeLevel, 0.5) * 0.35})`,
              }}
            />

            <div
              className={cn(
                "absolute size-32 rounded-full border transition-all duration-300",
                liveState === "listening" &&
                  "border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.3)]",
                liveState === "speaking" &&
                  "border-indigo-400/50 shadow-[0_0_50px_rgba(99,102,241,0.4)]",
                liveState === "thinking" &&
                  "border-purple-400/50 shadow-[0_0_40px_rgba(168,85,247,0.3)]",
                liveState === "idle" && "border-white/10",
              )}
            />

            {/* Inner Core */}
            <div
              className={cn(
                "relative z-10 flex size-24 items-center justify-center rounded-full transition-transform duration-200 shadow-2xl",
                liveState === "listening" &&
                  "bg-gradient-to-br from-cyan-500 to-emerald-500 text-black",
                liveState === "speaking" &&
                  "bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-white",
                liveState === "thinking" &&
                  "bg-gradient-to-br from-purple-500 to-cyan-500 text-white animate-pulse",
                liveState === "transcribing" &&
                  "bg-gradient-to-br from-sky-500 to-indigo-500 text-white animate-pulse",
                liveState === "idle" && "bg-white/10 text-white/60",
                liveState === "error" && "bg-red-500/20 text-red-400 border border-red-500/40",
              )}
              style={{
                transform: `scale(${1 + Math.min(volumeLevel, 0.4) * 0.2})`,
              }}
            >
              {liveState === "thinking" || liveState === "transcribing" ? (
                <Loader2 className="size-8 animate-spin" />
              ) : liveState === "speaking" ? (
                <Volume2 className="size-9 animate-bounce" />
              ) : isMuted ? (
                <MicOff className="size-8 text-white/50" />
              ) : (
                <Mic className="size-8" />
              )}
            </div>
          </div>

          {/* Real-time Frequency Waveform Bars */}
          <div className="w-full max-w-sm px-4">
            <canvas ref={canvasRef} width={320} height={50} className="h-12 w-full" />
          </div>

          {/* Live Status Label */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs">
              {liveState === "listening" && (
                <>
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-emerald-300">
                    Listening to you… speak naturally
                  </span>
                </>
              )}
              {liveState === "transcribing" && (
                <>
                  <Loader2 className="size-3 animate-spin text-sky-400" />
                  <span className="font-medium text-sky-300">Transcribing speech…</span>
                </>
              )}
              {liveState === "thinking" && (
                <>
                  <Sparkles className="size-3 text-purple-400 animate-pulse" />
                  <span className="font-medium text-purple-300">Bravura AI is reasoning…</span>
                </>
              )}
              {liveState === "speaking" && (
                <>
                  <Volume2 className="size-3 text-cyan-300 animate-pulse" />
                  <span className="font-medium text-cyan-300">Bravura Speaking aloud…</span>
                </>
              )}
              {liveState === "idle" && (
                <span className="text-white/60">
                  {isMuted ? "Microphone muted" : "Tap Talk to start speaking"}
                </span>
              )}
              {liveState === "error" && (
                <span className="text-red-400">{errorMessage || "Voice connection issue"}</span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Hands-free two-way voice loop · Auto-resumes listening after speaking
            </p>
          </div>

          {/* Live Subtitle Transcript Display */}
          <div className="mt-6 w-full max-h-36 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left text-xs">
            {userTranscript && (
              <div className="mb-2">
                <span className="font-semibold text-cyan-400">You: </span>
                <span className="text-white/90">{userTranscript}</span>
              </div>
            )}
            {agentResponse && (
              <div>
                <span className="font-semibold text-indigo-300">Bravura AI: </span>
                <span className="text-white/80">{agentResponse}</span>
              </div>
            )}
            {!userTranscript && !agentResponse && (
              <p className="text-center italic text-muted-foreground">
                Say something to Bravura AI — for example: "What are your core capabilities?" or
                "Tell me about yourself."
              </p>
            )}
          </div>
        </div>

        {/* Bottom Interactive Controls */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-3.5 py-3 sm:px-6 sm:py-4 gap-1.5 sm:gap-2">
          {/* Mute toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 rounded-full border px-2.5 sm:px-3.5 py-2 text-xs transition-colors cursor-pointer shrink-0",
              isMuted
                ? "border-red-500/40 bg-red-500/15 text-red-300"
                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
            <span className="hidden xs:inline sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Center Action (Finish Speaking / Interrupt) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {liveState === "speaking" ? (
              <button
                type="button"
                onClick={handleInterrupt}
                className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-cyan-500/20 border border-cyan-500/50 px-3 sm:px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 transition-colors cursor-pointer animate-pulse"
              >
                <Square className="size-3 fill-current" />
                <span>Interrupt</span>
              </button>
            ) : liveState === "listening" ? (
              <button
                type="button"
                onClick={() => void stopAndTranscribe()}
                className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-3.5 sm:px-4 py-2 text-xs font-semibold text-black transition-transform hover:scale-105 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <span>Done speaking</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startListening()}
                className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-cyan-500 px-3.5 sm:px-4 py-2 text-xs font-semibold text-black transition-transform hover:scale-105 cursor-pointer"
              >
                <Mic className="size-3.5" />
                <span>Talk</span>
              </button>
            )}
          </div>

          {/* End Session Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3.5 py-2 text-xs text-muted-foreground hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="size-3.5" />
            <span className="hidden xs:inline sm:inline">End</span>
          </button>
        </div>
      </div>
    </div>
  );
}
