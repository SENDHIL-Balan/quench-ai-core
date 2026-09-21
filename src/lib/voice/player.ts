/**
 * Bravura AI — Robust Multi-Tier Audio Player
 *
 * Tier 1: Web Audio API with unlocked AudioContext (bypasses iframe autoplay blocks)
 * Tier 2: HTMLAudioElement with Blob URL
 * Tier 3: Browser-native window.speechSynthesis fallback (100% reliable offline/fallback)
 */

import type { VoiceProvider } from "./types";

let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        globalAudioCtx = new Ctx();
      }
    } catch {
      globalAudioCtx = null;
    }
  }
  return globalAudioCtx;
}

/**
 * Call on any user gesture (click, tap, keypress) to ensure the AudioContext
 * and SpeechSynthesis are fully unlocked and ready to play sound.
 */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
  } catch {
    // ignore
  }
}

export type PlayVoiceOptions = {
  text: string;
  voiceId?: string;
  provider?: VoiceProvider;
  playbackSpeed?: number;
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (err: Error) => void;
};

export type AudioPlaybackController = {
  stop: () => void;
  promise: Promise<void>;
};

function cleanSpokenText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*#_~>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Play audio using Web Speech API as fallback
 */
function playNativeSpeech(
  text: string,
  rate = 1.0,
  onStart?: () => void,
  onEnded?: () => void,
): AudioPlaybackController {
  let isStopped = false;

  const promise = new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnded?.();
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const clean = cleanSpokenText(text);
      if (!clean) {
        onEnded?.();
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = Math.max(0.7, Math.min(1.8, rate));
      utterance.pitch = 1.0;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Neural") ||
            v.name.includes("Samantha")),
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onstart = () => {
        if (!isStopped) onStart?.();
      };

      utterance.onend = () => {
        onEnded?.();
        resolve();
      };

      utterance.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.warn("[voice] SpeechSynthesis notice:", e.error);
        }
        onEnded?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[voice] Native speech fallback error:", err);
      onEnded?.();
      resolve();
    }
  });

  return {
    stop: () => {
      isStopped = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    promise,
  };
}

/**
 * High-reliability voice player:
 * 1. Fetches audio from /api/speak
 * 2. Tries Web Audio API (unlocked AudioContext)
 * 3. Tries HTMLAudioElement
 * 4. Falls back to window.speechSynthesis
 */
export function playVoiceAudio(options: PlayVoiceOptions): AudioPlaybackController {
  let isStopped = false;
  let activeAudioElement: HTMLAudioElement | null = null;
  let activeSourceNode: AudioBufferSourceNode | null = null;
  let subController: AudioPlaybackController | null = null;
  let blobUrl: string | null = null;

  const cleanup = () => {
    if (activeSourceNode) {
      try {
        activeSourceNode.stop();
        activeSourceNode.disconnect();
      } catch {
        // ignore
      }
      activeSourceNode = null;
    }
    if (activeAudioElement) {
      try {
        activeAudioElement.pause();
        activeAudioElement.src = "";
      } catch {
        // ignore
      }
      activeAudioElement = null;
    }
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore
      }
      blobUrl = null;
    }
    if (subController) {
      subController.stop();
      subController = null;
    }
  };

  const stop = () => {
    isStopped = true;
    cleanup();
  };

  const promise = (async () => {
    const textToSpeak = cleanSpokenText(options.text);
    if (!textToSpeak) {
      options.onEnded?.();
      return;
    }

    try {
      // Make sure audio context is awake
      unlockAudio();

      // Step 1: Request TTS audio from /api/speak
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voice: options.voiceId,
          provider: options.provider,
          playbackSpeed: options.playbackSpeed ?? 1.0,
        }),
      });

      if (isStopped) return;

      if (!res.ok) {
        throw new Error(`TTS server responded with ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      if (isStopped) return;

      if (!arrayBuffer || arrayBuffer.byteLength < 500) {
        throw new Error("Empty audio buffer returned from TTS");
      }

      // Step 2: Try Web Audio API playback
      const ctx = getAudioContext();
      if (ctx) {
        try {
          if (ctx.state === "suspended") {
            await ctx.resume();
          }
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          if (isStopped) return;

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          if (options.playbackSpeed && options.playbackSpeed > 0) {
            source.playbackRate.value = options.playbackSpeed;
          }
          source.connect(ctx.destination);
          activeSourceNode = source;

          await new Promise<void>((resolve) => {
            source.onended = () => {
              activeSourceNode = null;
              resolve();
            };
            source.start(0);
            options.onStart?.();
          });

          if (!isStopped) {
            options.onEnded?.();
          }
          return;
        } catch (webAudioErr) {
          console.warn("[voice] Web Audio decode/play fallback:", webAudioErr);
        }
      }

      // Step 3: Try HTMLAudioElement
      if (isStopped) return;
      const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
      blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);
      if (options.playbackSpeed && options.playbackSpeed > 0) {
        audio.playbackRate = options.playbackSpeed;
      }
      activeAudioElement = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("HTMLAudio playback failed"));
        audio
          .play()
          .then(() => options.onStart?.())
          .catch(reject);
      });

      if (!isStopped) {
        options.onEnded?.();
      }
      return;
    } catch (primaryErr) {
      console.warn("[voice] Server TTS failed or blocked, falling back to Web Speech:", primaryErr);
      if (isStopped) return;

      // Step 4: Fallback to browser SpeechSynthesis
      subController = playNativeSpeech(
        textToSpeak,
        options.playbackSpeed ?? 1.0,
        options.onStart,
        options.onEnded,
      );
      await subController.promise;
    } finally {
      cleanup();
    }
  })();

  return { stop, promise };
}
