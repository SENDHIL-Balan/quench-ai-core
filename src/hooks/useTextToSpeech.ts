import { useCallback, useRef, useState } from "react";
import type { SpeakRequestBody, VoiceProvider, VoiceState } from "@/lib/voice/types";

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

/** Sends text to /api/speak with ElevenLabs or Deepgram, plays audio, and tracks state. */
export function useTextToSpeech(): UseTextToSpeechResult {
  const [state, setState] = useState<UseTextToSpeechResult["state"]>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setState("idle");
    setPlayingId(null);
  }, [cleanup]);

  const speak = useCallback(
    async (text: string, options: SpeakOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      cleanup();
      setErrorMessage(null);
      setState("speaking");
      setPlayingId(options.id ?? null);

      try {
        const requestBody: SpeakRequestBody = { text: trimmed };
        if (options.voice) {
          requestBody.voice = options.voice;
        }
        if (options.provider) {
          requestBody.provider = options.provider;
        }

        const response = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(detail?.error || "Voice agent could not generate speech.");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        if (options.playbackSpeed && options.playbackSpeed > 0) {
          audio.playbackRate = options.playbackSpeed;
        }
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("Audio playback failed."));
          void audio.play().catch(reject);
        });

        setState("idle");
        setPlayingId(null);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Couldn't play audio.");
        setState("error");
        setPlayingId(null);
      } finally {
        cleanup();
      }
    },
    [cleanup],
  );

  return {
    state,
    errorMessage,
    playingId,
    isSpeaking: state === "speaking",
    speak,
    stop,
  };
}
