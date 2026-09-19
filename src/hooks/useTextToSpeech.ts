import { useCallback, useRef, useState } from "react";
import type { SpeakRequestBody, VoiceState } from "@/lib/voice/types";

interface UseTextToSpeechResult {
  state: Extract<VoiceState, "idle" | "speaking" | "error">;
  errorMessage: string | null;
  speak: (text: string, voice?: SpeakRequestBody["voice"]) => Promise<void>;
  stop: () => void;
}

/** Sends text to /api/speak, plays the returned audio, and reports state. */
export function useTextToSpeech(): UseTextToSpeechResult {
  const [state, setState] = useState<UseTextToSpeechResult["state"]>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  const speak = useCallback(
    async (text: string, voice?: SpeakRequestBody["voice"]) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      cleanup();
      setErrorMessage(null);
      setState("speaking");

      try {
        // Build the request body. We only include `voice` when it has a value
        // so the payload is valid under `exactOptionalPropertyTypes`.
        const requestBody: SpeakRequestBody = { text: trimmed };
        if (voice) {
          requestBody.voice = voice;
        }

        const response = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(detail?.error || "Speech request failed");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("Audio playback failed"));
          void audio.play().catch(reject);
        });

        setState("idle");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Couldn't play that reply.");
        setState("error");
      } finally {
        cleanup();
      }
    },
    [cleanup],
  );

  return { state, errorMessage, speak, stop };
}