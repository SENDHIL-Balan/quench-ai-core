import { useCallback, useRef, useState } from "react";
import type { VoiceProvider, VoiceState } from "@/lib/voice/types";
import {
  playVoiceAudio,
  stopAnyVoicePlayback,
  type AudioPlaybackController,
} from "@/lib/voice/player";

export interface SpeakOptions {
  id?: string;
  voice?: string;
  provider?: VoiceProvider;
  playbackSpeed?: number;
  forceReplay?: boolean;
}

interface UseTextToSpeechResult {
  state: Extract<VoiceState, "idle" | "speaking" | "error">;
  errorMessage: string | null;
  playingId: string | null;
  isSpeaking: boolean;
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop: () => void;
}

/**
 * Authoritative single-channel text-to-speech hook
 */
export function useTextToSpeech(): UseTextToSpeechResult {
  const [state, setState] = useState<UseTextToSpeechResult["state"]>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const controllerRef = useRef<AudioPlaybackController | null>(null);

  const stop = useCallback(() => {
    stopAnyVoicePlayback();
    if (controllerRef.current) {
      controllerRef.current = null;
    }
    setState("idle");
    setPlayingId(null);
  }, []);

  const speak = useCallback(async (text: string, options: SpeakOptions = {}) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Immediately stop any existing playback or in-flight requests
    stopAnyVoicePlayback();

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
        onStart: () => {
          setState("speaking");
        },
        onEnded: () => {
          setState("idle");
          setPlayingId(null);
          controllerRef.current = null;
        },
        onError: (err) => {
          console.warn("[VOICE] TTS playback notice:", err.message);
          setErrorMessage(err.message);
          setState("error");
          setPlayingId(null);
          controllerRef.current = null;
        },
      });

      controllerRef.current = controller;
      await controller.promise;
    } catch (err) {
      console.warn("[VOICE] Playback error caught in hook:", err);
      setErrorMessage(err instanceof Error ? err.message : "Couldn't play audio.");
      setState("error");
      setPlayingId(null);
      controllerRef.current = null;
    }
  }, []);

  return {
    state,
    errorMessage,
    playingId,
    isSpeaking: state === "speaking",
    speak,
    stop,
  };
}
