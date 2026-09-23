import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Mic,
  MicOff,
  Square,
  Sparkles,
  Volume2,
  Sliders,
  PhoneOff,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModeId } from "@/lib/agent/modes";
import { VoiceRecorder, type RecorderResult } from "@/lib/voice/recorder";
import {
  playVoiceAudio,
  stopAnyVoicePlayback,
  unlockAudio,
  type AudioPlaybackController,
} from "@/lib/voice/player";
import { VoiceAgentModal, VOICES, type VoiceSetting } from "./VoiceAgentModal";
import { FluidVoiceOrb } from "./FluidVoiceOrb";
import { RealtimeAudioVisualizer } from "./RealtimeAudioVisualizer";

type LiveState = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "error";

type TranscribeResult = { ok: true; text: string } | { ok: false; error: string } | null;

interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface LiveVoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceSetting: VoiceSetting;
  onVoiceSettingChange?: (setting: VoiceSetting) => void;
  mode?: ModeId;
  deepThink?: boolean;
  onTranscriptReady?: (userText: string, assistantReply: string) => void;
}

export function LiveVoiceAgentModal({
  isOpen,
  onClose,
  voiceSetting,
  onVoiceSettingChange,
  mode = "chat",
  deepThink = false,
  onTranscriptReady,
}: LiveVoiceAgentModalProps) {
  const [liveState, setLiveState] = useState<LiveState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [freqData, setFreqData] = useState<Uint8Array | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active streaming buffers
  const [currentAgentStream, setCurrentAgentStream] = useState<string>("");

  // ChatGPT-style back-and-forth transcript history
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);

  // Sub-modal for Voice Configuration Overlay
  const [configOverlayOpen, setConfigOverlayOpen] = useState(false);

  // Copied turn feedback
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);

  // Thumbs feedback state
  const [feedbackState, setFeedbackState] = useState<Record<string, "up" | "down">>({});

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const playbackControllerRef = useRef<AudioPlaybackController | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const isProcessingTurnRef = useRef(false);
  const lastAssistantReplyRef = useRef<string>("");
  const isComponentMounted = useRef(true);
  const activeSessionRef = useRef(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to latest speech turn
  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationTurns, currentAgentStream, liveState]);

  // Clean up any ongoing audio and network calls
  const cleanupAudio = useCallback(() => {
    stopAnyVoicePlayback();
    if (playbackControllerRef.current) {
      playbackControllerRef.current.stop();
      playbackControllerRef.current = null;
    }
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
  }, []);

  // Process user speech turn with human-like conversation prompt
  const processUserSpeech = useCallback(
    async (spokenText: string) => {
      if (!isComponentMounted.current || !activeSessionRef.current) return;

      // Halt any previous audio and ongoing chat fetch before starting fresh turn
      cleanupAudio();
      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;
      isProcessingTurnRef.current = true;

      // Stop recorder while AI is thinking & speaking
      if (recorderRef.current) {
        recorderRef.current.cancel();
        recorderRef.current = null;
      }

      const userTurnId = `user-${Date.now()}`;
      setConversationTurns((prev) => [...prev, { id: userTurnId, role: "user", text: spokenText }]);
      setLiveState("thinking");
      setCurrentAgentStream("");
      setErrorMessage(null);

      // Construct messages payload for base-agent
      const uiMessages = [
        ...conversationTurns.map((t) => ({
          id: t.id,
          role: t.role,
          parts: [{ type: "text" as const, text: t.text }],
        })),
        {
          id: userTurnId,
          role: "user" as const,
          parts: [{ type: "text" as const, text: spokenText }],
        },
      ];

      let replyText = "";
      try {
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: uiMessages,
            mode,
            deepThink,
            model: "openai/gpt-oss-120b",
            voiceMode: true, // triggers natural 1-2 sentence human voice mode
          }),
        });

        if (abortController.signal.aborted) return;

        if (!chatRes.ok) {
          const errDetail = await chatRes.json().catch(() => null);
          throw new Error(
            errDetail?.error || "The AI voice agent could not process your voice request.",
          );
        }

        const reader = chatRes.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let done = false;
          let buffer = "";

          while (!done) {
            if (abortController.signal.aborted) break;
            const { value, done: isDone } = await reader.read();
            done = isDone;
            if (value) {
              buffer += decoder.decode(value, { stream: !isDone });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const payload = line.slice(6).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(payload);
                    if (parsed.type === "text-delta" && parsed.delta) {
                      replyText += parsed.delta;
                      setCurrentAgentStream((prev) => prev + parsed.delta);
                    }
                  } catch {
                    // skip non-JSON
                  }
                }
              }
            }
          }
        }

        if (abortController.signal.aborted) return;

        if (!replyText.trim()) {
          replyText = "I'm right here with you. What would you like to explore next?";
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error("Live voice chat error:", err);
        replyText = "I heard you, but hit a slight bump. Could you say that one more time?";
      }

      if (
        !isComponentMounted.current ||
        !activeSessionRef.current ||
        abortController.signal.aborted
      ) {
        isProcessingTurnRef.current = false;
        return;
      }

      const assistantTurnId = `asst-${Date.now()}`;
      lastAssistantReplyRef.current = replyText;
      setConversationTurns((prev) => [
        ...prev,
        { id: assistantTurnId, role: "assistant", text: replyText },
      ]);
      setCurrentAgentStream("");
      onTranscriptReady?.(spokenText, replyText);

      // Vocalize AI answer with high fidelity audio engine (guaranteed single playback)
      setLiveState("speaking");
      try {
        const controller = playVoiceAudio({
          text: replyText,
          messageId: assistantTurnId,
          voiceId: voiceSetting.voiceId,
          provider: voiceSetting.provider,
          playbackSpeed: voiceSetting.playbackSpeed ?? 1.0,
          onStart: () => {
            if (isComponentMounted.current && activeSessionRef.current) {
              setLiveState("speaking");
            }
          },
          onEnded: () => {
            // Handled when promise finishes
          },
        });

        playbackControllerRef.current = controller;
        await controller.promise;
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.warn("Speech playback notice:", err);
        }
      } finally {
        cleanupAudio();
        isProcessingTurnRef.current = false;
      }

      // Add 400ms acoustic settling buffer so mic never picks up lingering speaker reverb
      const handsFree = voiceSetting.handsFreeListen ?? true;
      if (isComponentMounted.current && activeSessionRef.current && !isMuted && handsFree) {
        setTimeout(() => {
          if (
            isComponentMounted.current &&
            activeSessionRef.current &&
            !isMuted &&
            !isProcessingTurnRef.current
          ) {
            void startListening();
          }
        }, 400);
      } else {
        setLiveState("idle");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationTurns, mode, deepThink, voiceSetting, isMuted, onTranscriptReady, cleanupAudio],
  );

  // Handle recorded audio
  const handleAudioRecorded = useCallback(
    async (result: RecorderResult) => {
      if (!isComponentMounted.current || !activeSessionRef.current) return;
      if (isProcessingTurnRef.current) {
        console.warn("[voice] Ignored audio chunk because a turn is already processing");
        return;
      }

      // Ignore micro-bursts or tiny clicks under 600ms or 1KB
      if (result.durationMs < 600 || result.blob.size < 1000) {
        if (activeSessionRef.current && !isMuted && !isProcessingTurnRef.current) {
          void startListening();
        } else {
          setLiveState("idle");
        }
        return;
      }

      isProcessingTurnRef.current = true;
      setLiveState("transcribing");
      try {
        const formData = new FormData();
        const ext = result.mimeType.includes("mp4") ? "mp4" : "webm";
        formData.append("audio", result.blob, `recording.${ext}`);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const payload = (await res.json().catch(() => null)) as TranscribeResult;

        if (!res.ok || !payload || !payload.ok || !payload.text?.trim()) {
          isProcessingTurnRef.current = false;
          if (activeSessionRef.current && !isMuted) {
            void startListening();
          } else {
            setLiveState("idle");
          }
          return;
        }

        const cleanUserText = payload.text.trim();

        // Echo Cancellation Guard: Check if the mic transcribed the assistant's own recent words
        const recentAssistant = lastAssistantReplyRef.current.toLowerCase();
        const userTextLower = cleanUserText.toLowerCase();
        if (
          recentAssistant &&
          (userTextLower === recentAssistant ||
            (userTextLower.length > 8 && recentAssistant.includes(userTextLower)))
        ) {
          console.info("[voice] Discarded acoustic echo of assistant speech");
          isProcessingTurnRef.current = false;
          if (activeSessionRef.current && !isMuted) {
            void startListening();
          } else {
            setLiveState("idle");
          }
          return;
        }

        void processUserSpeech(cleanUserText);
      } catch (err) {
        console.error("Transcribe error in live voice:", err);
        isProcessingTurnRef.current = false;
        if (activeSessionRef.current && !isMuted) {
          void startListening();
        } else {
          setLiveState("idle");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMuted, processUserSpeech],
  );

  // Start microphone listening
  const startListening = useCallback(async () => {
    if (isMuted || isProcessingTurnRef.current) return;
    cleanupAudio();
    unlockAudio();
    setErrorMessage(null);
    setLiveState("listening");
    setVolumeLevel(0);
    setFreqData(null);

    const recorder = new VoiceRecorder({
      onLevel: (lvl) => setVolumeLevel(lvl),
      onFrequencyData: (data) => setFreqData(data),
      onAutoStop: (result) => {
        recorderRef.current = null;
        if (activeSessionRef.current && !isMuted && !isProcessingTurnRef.current) {
          void handleAudioRecorded(result);
        }
      },
      silenceMs: 2400, // relaxed 2.4s natural breathing and thought pause
      silenceThreshold: 0.02,
      maxDurationMs: 45_000,
    });
    recorderRef.current = recorder;

    try {
      await recorder.start();
    } catch (err) {
      recorderRef.current = null;
      setLiveState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Microphone access denied or unavailable.",
      );
    }
  }, [cleanupAudio, isMuted, handleAudioRecorded]);

  // Interrupt AI playback and resume listening immediately
  const handleInterrupt = useCallback(() => {
    cleanupAudio();
    isProcessingTurnRef.current = false;
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setTimeout(() => {
      if (activeSessionRef.current && !isMuted) {
        void startListening();
      }
    }, 80);
  }, [cleanupAudio, isMuted, startListening]);

  // Replay a specific assistant message
  const handleReplayTurn = useCallback(
    async (text: string) => {
      cleanupAudio();
      unlockAudio();
      setLiveState("speaking");

      try {
        const controller = playVoiceAudio({
          text,
          voiceId: voiceSetting.voiceId,
          provider: voiceSetting.provider,
          playbackSpeed: voiceSetting.playbackSpeed ?? 1.0,
          forceReplay: true,
          onEnded: () => {
            if (activeSessionRef.current && !isMuted) {
              void startListening();
            } else {
              setLiveState("idle");
            }
          },
        });
        playbackControllerRef.current = controller;
        await controller.promise;
      } catch {
        // ignore
      } finally {
        cleanupAudio();
      }
    },
    [cleanupAudio, voiceSetting, isMuted, startListening],
  );

  // Copy turn text to clipboard
  const handleCopyTurn = (turnId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTurnId(turnId);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        recorderRef.current?.cancel();
        recorderRef.current = null;
        cleanupAudio();
        setLiveState("idle");
      } else {
        setTimeout(() => void startListening(), 50);
      }
      return next;
    });
  }, [cleanupAudio, startListening]);

  // Keyboard shortcuts: Space to mute/interrupt, Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (configOverlayOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        if (liveState === "speaking") {
          handleInterrupt();
        } else {
          handleToggleMute();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, configOverlayOpen, liveState, handleInterrupt, handleToggleMute, onClose]);

  // Lifecycle on modal open/close
  useEffect(() => {
    if (isOpen) {
      isComponentMounted.current = true;
      activeSessionRef.current = true;
      unlockAudio();
      const timer = setTimeout(() => {
        void startListening();
      }, 200);
      return () => clearTimeout(timer);
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

  const currentVoiceObj = VOICES.find((v) => v.id === voiceSetting.voiceId) || VOICES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Voice Agent"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden"
    >
      {/* Subtle atmospheric radial lighting behind the fluid orb */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-950/30 via-black to-black opacity-80" />

      {/* Top Floating Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 sm:px-8 sm:py-4 border-b border-white/[0.06] bg-black/40 backdrop-blur-md">
        {/* Left: Status Pill */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
            <span
              className={cn(
                "size-2 rounded-full",
                liveState === "listening" && "bg-cyan-400 animate-pulse",
                liveState === "speaking" && "bg-blue-400 animate-bounce",
                liveState === "thinking" && "bg-purple-400 animate-spin",
                liveState === "transcribing" && "bg-amber-400 animate-pulse",
                liveState === "idle" && "bg-white/40",
                liveState === "error" && "bg-red-400",
              )}
            />
            <span className="font-medium text-white/90">
              {liveState === "listening" && "Listening..."}
              {liveState === "speaking" && `${currentVoiceObj.name} speaking`}
              {liveState === "thinking" && "Thinking..."}
              {liveState === "transcribing" && "Processing speech..."}
              {liveState === "idle" && (isMuted ? "Microphone muted" : "Paused")}
              {liveState === "error" && "Mic error"}
            </span>
          </div>

          <span className="hidden sm:inline-block text-[11px] text-white/40 font-mono">
            {voiceSetting.playbackSpeed ?? 1.0}x
          </span>
        </div>

        {/* Center: Current Voice Persona Pill (click to configure) */}
        <button
          type="button"
          onClick={() => setConfigOverlayOpen(true)}
          className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all cursor-pointer shadow-sm shadow-cyan-500/10"
          title="Open Voice Configuration"
        >
          <Sparkles className="size-3 text-cyan-400" />
          <span className="font-medium truncate max-w-[120px] sm:max-w-none">
            {currentVoiceObj.name}
          </span>
          <Sliders className="size-3 text-cyan-400/80" />
        </button>

        {/* Right: Close & End Call */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            aria-label="End live voice session"
            title="End Session (Esc)"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* Center: ChatGPT-style Conversational Message Stream */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-8 md:px-20 lg:px-44 space-y-6">
        {conversationTurns.length === 0 && !currentAgentStream && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center px-4">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-white/5 border border-white/10 text-cyan-400">
              <Mic className="size-6 animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-medium text-white/90 mb-2">
              Voice Agent is listening
            </h3>
            <p className="text-sm text-white/50 max-w-sm leading-relaxed">
              Speak naturally just like talking to a real human. Try saying:
              <br />
              <span className="text-cyan-300/80 italic mt-2 inline-block">
                "Yo what's good bro? Tell me something dope today."
              </span>
            </p>
          </div>
        )}

        {/* Conversation Turns List */}
        {conversationTurns.map((turn) => {
          const isUser = turn.role === "user";
          const isCopied = copiedTurnId === turn.id;
          const userFeedback = feedbackState[turn.id];

          return (
            <div
              key={turn.id}
              className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", {
                "justify-end": isUser,
                "justify-start": !isUser,
              })}
            >
              {isUser ? (
                /* User bubble: sleek blue capsule matching image.png */
                <div className="max-w-[85%] sm:max-w-[70%] rounded-[22px] bg-blue-600 px-5 py-3 text-sm sm:text-base text-white shadow-lg shadow-blue-600/20 leading-relaxed font-normal">
                  {turn.text}
                </div>
              ) : (
                /* Assistant message: clean typography with action feedback */
                <div className="group max-w-[88%] sm:max-w-[75%] space-y-2">
                  <p className="text-base sm:text-lg text-white/95 leading-relaxed font-normal">
                    {turn.text}
                  </p>

                  {/* Message Action Bar (Copy, Replay, Thumbs) */}
                  <div className="flex items-center gap-1.5 pt-1 text-white/40 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleCopyTurn(turn.id, turn.text)}
                      className="flex size-7 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {isCopied ? (
                        <Check className="size-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleReplayTurn(turn.text)}
                      className="flex size-7 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      title="Replay speech"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFeedbackState((prev) => ({
                          ...prev,
                          [turn.id]: prev[turn.id] === "up" ? undefined! : "up",
                        }))
                      }
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer",
                        userFeedback === "up" ? "text-cyan-400" : "hover:text-white",
                      )}
                      title="Good response"
                    >
                      <ThumbsUp className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFeedbackState((prev) => ({
                          ...prev,
                          [turn.id]: prev[turn.id] === "down" ? undefined! : "down",
                        }))
                      }
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer",
                        userFeedback === "down" ? "text-red-400" : "hover:text-white",
                      )}
                      title="Bad response"
                    >
                      <ThumbsDown className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Live streaming assistant text before turn finishes */}
        {currentAgentStream && (
          <div className="flex w-full justify-start animate-in fade-in duration-200">
            <div className="max-w-[88%] sm:max-w-[75%] space-y-2">
              <p className="text-base sm:text-lg text-white/90 leading-relaxed font-normal">
                {currentAgentStream}
                <span className="inline-block size-2 ml-1 rounded-full bg-cyan-400 animate-pulse" />
              </p>
            </div>
          </div>
        )}

        {/* Error message toast */}
        {errorMessage && (
          <div className="mx-auto my-2 max-w-md rounded-2xl border border-red-500/40 bg-red-950/40 p-3 text-center text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        <div ref={scrollEndRef} className="h-6" />
      </main>

      {/* Bottom Area: Realtime Frequency Visualizer, Fluid Plasma Orb & Controls */}
      <footer className="relative z-20 flex flex-col items-center justify-center pb-6 pt-2">
        {/* Real-time Frequency Spectrum Visualizer */}
        <div className="w-full max-w-sm px-4 mb-2.5">
          <RealtimeAudioVisualizer
            variant="bars"
            height={36}
            barCount={28}
            label={
              liveState === "speaking"
                ? `${currentVoiceObj.name} Speaking`
                : "Real-time Frequency Spectrum"
            }
            showLevel={true}
          />
        </div>

        {/* The Fluid Glowing Orb (matches image.png) */}
        <div className="relative flex items-center justify-center">
          <FluidVoiceOrb
            state={liveState}
            volumeLevel={volumeLevel}
            frequencyData={freqData}
            size={170}
            onClick={() => {
              if (liveState === "speaking") {
                handleInterrupt();
              } else if (liveState === "listening") {
                // Keep listening or manually stop
              } else {
                void startListening();
              }
            }}
          />
        </div>

        {/* Orb status hint */}
        <p className="mt-2 text-xs text-white/50 tracking-wide font-normal">
          {liveState === "speaking" && "Tap orb to interrupt"}
          {liveState === "listening" && "Listening to you... speak naturally"}
          {liveState === "thinking" && "AI is reasoning..."}
          {liveState === "transcribing" && "Understanding..."}
          {liveState === "idle" && (isMuted ? "Unmute to speak" : "Tap orb to speak")}
          {liveState === "error" && "Microphone issue"}
        </p>

        {/* Floating Controls Bar */}
        <div className="mt-4 flex items-center gap-2.5 sm:gap-3 rounded-full border border-white/10 bg-white/[0.05] p-2 backdrop-blur-xl shadow-2xl">
          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={cn(
              "flex size-11 items-center justify-center rounded-full transition-all cursor-pointer shrink-0",
              isMuted
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40"
                : "bg-white/10 text-white hover:bg-white/20",
            )}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            aria-label={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          {/* Manual Done Speaking button during listening */}
          {liveState === "listening" && (
            <button
              type="button"
              onClick={() => {
                if (recorderRef.current && !isProcessingTurnRef.current) {
                  void recorderRef.current.stop().then((result) => {
                    void handleAudioRecorded(result);
                  });
                }
              }}
              className="flex h-11 items-center gap-2 px-4 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all cursor-pointer font-medium text-xs shadow-sm shadow-cyan-500/10 shrink-0"
              title="I'm done speaking — send now"
            >
              <Check className="size-4 text-cyan-300" />
              <span>Done speaking</span>
            </button>
          )}

          {/* Interrupt AI playback button (visible when speaking or thinking) */}
          {(liveState === "speaking" || liveState === "thinking") && (
            <button
              type="button"
              onClick={handleInterrupt}
              className="flex h-11 items-center gap-2 px-4 rounded-full bg-white/15 text-white hover:bg-white/25 border border-white/20 transition-all cursor-pointer font-medium text-xs shadow-sm shrink-0 animate-in zoom-in-75 duration-200"
              title="Interrupt AI"
              aria-label="Interrupt AI"
            >
              <Square className="size-3.5 fill-current" />
              <span>Interrupt</span>
            </button>
          )}

          {/* Voice Configuration Overlay Button */}
          <button
            type="button"
            onClick={() => setConfigOverlayOpen(true)}
            className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer shrink-0"
            title="Voice & Speed Settings"
            aria-label="Voice & Speed Settings"
          >
            <Sliders className="size-5" />
          </button>

          {/* End Call / Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full bg-red-600/80 text-white hover:bg-red-600 transition-all cursor-pointer shadow-lg shadow-red-600/30 shrink-0"
            title="End Call"
            aria-label="End Call"
          >
            <PhoneOff className="size-5" />
          </button>
        </div>

        {/* Studio Voice Cancellation Active Badge */}
        <div className="mt-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-400 font-medium">
          <ShieldCheck className="size-3 text-emerald-400" />
          <span>Studio Noise Cancellation & Voice Isolation Active</span>
        </div>
      </footer>

      {/* Seamless Voice Configuration Overlay on top of live session */}
      {configOverlayOpen && (
        <VoiceAgentModal
          onClose={() => setConfigOverlayOpen(false)}
          voiceSetting={voiceSetting}
          onSaveSetting={(newSetting) => {
            onVoiceSettingChange?.(newSetting);
          }}
        />
      )}
    </div>
  );
}
