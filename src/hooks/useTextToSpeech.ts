import { useCallback, useRef, useState } from "react";
import type { VoiceProvider, VoiceState } from "@/lib/voice/types";
import { playVoiceAudio, type AudioPlaybackController } from "@/lib/voice/player";

export interface SpeakOptions {
  id?: string;
  voice?: string;
  provider?: VoiceProvider;
  playbackSpeed?: number;
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
 * Sends text to /api/speak (ElevenLabs or Deepgram) with Web Audio API,
 * HTMLAudio, and Web Speech API fallback.
 */
export function useTextToSpeech(): UseTextToSpeechResult {
  const [state, setState] = useState<UseTextToSpeechResult["state"]>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const controllerRef = useRef<AudioPlaybackController | null>(null);

  const stop = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.stop();
      controllerRef.current = null;
    }
    setState("idle");
    setPlayingId(null);
  }, []);

  const speak = useCallback(async (text: string, options: SpeakOptions = {}) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Stop any existing playback
    if (controllerRef.current) {
      controllerRef.current.stop();
      controllerRef.current = null;
    }

    setErrorMessage(null);
    setState("speaking");
    setPlayingId(options.id ?? null);

    try {
      const controller = playVoiceAudio({
        text: trimmed,
        voiceId: options.voice,
        provider: options.provider,
        playbackSpeed: options.playbackSpeed,
        onStart: () => {
          setState("speaking");
        },
        onEnded: () => {
          setState("idle");
          setPlayingId(null);
          controllerRef.current = null;
        },
      });

      controllerRef.current = controller;
      await controller.promise;
    } catch (err) {
      console.warn("[voice] Playback notice:", err);
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
