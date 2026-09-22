import { useCallback, useRef, useState, useEffect } from "react";
import type { VoiceProvider, VoiceState } from "@/lib/voice/types";
import {
  playVoiceAudio,
  stopAnyVoicePlayback,
  unlockAudio,
  voiceQueue,
  type AudioPlaybackController,
  type VoiceQueueState,
} from "@/lib/voice/player";

export interface SpeakOptions {
  id?: string;
  voice?: string;
  provider?: VoiceProvider;
  playbackSpeed?: number;
  forceReplay?: boolean;
  newStream?: boolean;
}

interface UseTextToSpeechResult {
  state: Extract<VoiceState, "idle" | "speaking" | "error">;
  queueState: VoiceQueueState;
  errorMessage: string | null;
  playingId: string | null;
  isSpeaking: boolean;
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop: () => void;
}

/**
 * Authoritative single-channel text-to-speech hook connected to state-based audio queue
 */
export function useTextToSpeech(): UseTextToSpeechResult {
  const [state, setState] = useState<UseTextToSpeechResult["state"]>("idle");
  const [queueState, setQueueState] = useState<VoiceQueueState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const controllerRef = useRef<AudioPlaybackController | null>(null);

  // Synchronize with voice queue state
  useEffect(() => {
    return voiceQueue.subscribe((qState, currentItem) => {
      setQueueState(qState);
      if (qState === "idle") {
        setState("idle");
        setPlayingId(null);
      } else if (qState === "playing" || qState === "fetching") {
        setState("speaking");
        if (currentItem) {
          setPlayingId(currentItem.id);
        }
      } else if (qState === "interrupted") {
        setState("idle");
        setPlayingId(null);
      }
    });
  }, []);

  const stop = useCallback(() => {
    stopAnyVoicePlayback("user_requested_stop");
    if (controllerRef.current) {
      controllerRef.current = null;
    }
    setState("idle");
    setPlayingId(null);
  }, []);

  const speak = useCallback(async (text: string, options: SpeakOptions = {}) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Immediately unlock audio context on gesture invocation
    unlockAudio();

    setErrorMessage(null);
    setState("speaking");
    setPlayingId(options.id ?? null);

    try {
      const controller = playVoiceAudio({
        text: trimmed,
        messageId: options.id,
        voiceId: options.voice,
        provider: options.provider,
        playbackSpeed: options.playbackSpeed,
        forceReplay: options.forceReplay,
        newStream: options.newStream !== false,
        onStart: () => {
          setState("speaking");
          setPlayingId(options.id ?? null);
        },
        onEnded: () => {
          setState("idle");
          setPlayingId(null);
          controllerRef.current = null;
        },
        onError: (err) => {
          console.warn("[VOICE_QUEUE] TTS playback notice:", err.message);
          setErrorMessage(err.message);
          setState("error");
          setPlayingId(null);
          controllerRef.current = null;
        },
      });

      controllerRef.current = controller;
      await controller.promise;
    } catch (err) {
      console.warn("[VOICE_QUEUE] Playback error in hook:", err);
      setErrorMessage(err instanceof Error ? err.message : "Couldn't play audio.");
      setState("error");
      setPlayingId(null);
      controllerRef.current = null;
    }
  }, []);

  return {
    state,
    queueState,
    errorMessage,
    playingId,
    isSpeaking: state === "speaking" || queueState === "playing" || queueState === "fetching",
    speak,
    stop,
  };
}
