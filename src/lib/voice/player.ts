/**
 * Bravura AI — Authoritative Voice Player & Audio Manager
 *
 * Enforces:
 * 1. ONE assistant response -> ONE voice -> ONE audio playback at a time.
 * 2. Strict deduplication (prevents double speech, re-speaking, and hydration replays).
 * 3. Immediate cancellation via AbortController for in-flight TTS fetches and active sound.
 * 4. Strict gender preservation in audio playback and any fallback.
 * 5. Single managed audio instance to eliminate audio clutter and memory leaks.
 */

import type { VoiceProvider } from "./types";
import { getVoiceGender } from "./voices";

export type PlayVoiceOptions = {
  text: string;
  messageId?: string;
  voiceId?: string;
  provider?: VoiceProvider;
  playbackSpeed?: number;
  forceReplay?: boolean;
  allowBrowserFallback?: boolean;
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (err: Error) => void;
};

export type AudioPlaybackController = {
  stop: () => void;
  promise: Promise<void>;
  messageId?: string;
};

// Internal Singleton Audio State
let globalAudioCtx: AudioContext | null = null;
let singleAudioElement: HTMLAudioElement | null = null;
let activeSessionId = 0;
let activeAbortController: AbortController | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeBlobUrl: string | null = null;
let activeGlobalController: AudioPlaybackController | null = null;

// Registry of already spoken messages to guarantee no duplicate audio
const spokenMessageIds = new Set<string>();

export function isMessageSpoken(messageId: string): boolean {
  return spokenMessageIds.has(messageId);
}

export function markMessageSpoken(messageId: string): void {
  spokenMessageIds.add(messageId);
}

export function clearSpokenHistory(): void {
  spokenMessageIds.clear();
  console.log("[VOICE] Spoken message history cleared.");
}

/**
 * Get or create the shared AudioContext
 */
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
 * Get or create the shared HTMLAudioElement
 */
function getSingleAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!singleAudioElement) {
    try {
      singleAudioElement = new Audio();
      singleAudioElement.preload = "auto";
    } catch {
      singleAudioElement = null;
    }
  }
  return singleAudioElement;
}

/**
 * Unlock AudioContext & SpeechSynthesis on any user interaction
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

// Auto-attach unlock handlers to window
if (typeof window !== "undefined") {
  const handleUserGesture = () => {
    unlockAudio();
  };
  window.addEventListener("pointerdown", handleUserGesture, { capture: true, passive: true });
  window.addEventListener("keydown", handleUserGesture, { capture: true, passive: true });
  window.addEventListener("touchstart", handleUserGesture, { capture: true, passive: true });
}

/**
 * Stops ALL currently running voice playback, aborts in-flight network requests,
 * and clears any active speech synthesis immediately.
 */
export function stopAnyVoicePlayback(): void {
  // Invalidate any ongoing asynchronous operations
  activeSessionId++;
  const currentSession = activeSessionId;

  console.log(`[VOICE] Stopping all voice playback (Session ${currentSession})`);

  // 1. Abort in-flight network requests
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {
      /* ignore */
    }
    activeAbortController = null;
  }

  // 2. Stop Web Audio source node
  if (activeSourceNode) {
    try {
      activeSourceNode.onended = null;
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch {
      /* ignore */
    }
    activeSourceNode = null;
  }

  // 3. Pause & reset single HTMLAudioElement
  if (singleAudioElement) {
    try {
      singleAudioElement.onended = null;
      singleAudioElement.onerror = null;
      singleAudioElement.pause();
      singleAudioElement.src = "";
    } catch {
      /* ignore */
    }
  }

  // 4. Revoke active Blob URL
  if (activeBlobUrl) {
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch {
      /* ignore */
    }
    activeBlobUrl = null;
  }

  // 5. Cancel browser SpeechSynthesis
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }

  if (activeGlobalController) {
    activeGlobalController = null;
  }
}

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
 * Browser-native SpeechSynthesis fallback with STRICT GENDER MATCHING
 */
function playNativeSpeech(
  text: string,
  gender: "male" | "female",
  rate = 1.0,
  onStart?: () => void,
  onEnded?: () => void,
  sessionId?: number,
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
      utterance.pitch = gender === "male" ? 0.95 : 1.05;

      // Select STRICT gender-matching system voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

      let matchedVoice: SpeechSynthesisVoice | undefined;

      if (gender === "male") {
        matchedVoice = englishVoices.find((v) => {
          const n = v.name.toLowerCase();
          return (
            n.includes("male") ||
            n.includes("david") ||
            n.includes("george") ||
            n.includes("guy") ||
            n.includes("james") ||
            n.includes("daniel") ||
            n.includes("alex") ||
            n.includes("mark")
          );
        });
      } else {
        matchedVoice = englishVoices.find((v) => {
          const n = v.name.toLowerCase();
          return (
            n.includes("female") ||
            n.includes("samantha") ||
            n.includes("zira") ||
            n.includes("victoria") ||
            n.includes("karen") ||
            n.includes("moira")
          );
        });
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
        console.log(`[VOICE] Native fallback voice selected: ${matchedVoice.name} (${gender})`);
      }

      utterance.onstart = () => {
        if (!isStopped && sessionId === activeSessionId) {
          onStart?.();
        }
      };

      utterance.onend = () => {
        if (sessionId === activeSessionId) {
          onEnded?.();
        }
        resolve();
      };

      utterance.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.warn("[VOICE] Native speech error:", e.error);
        }
        if (sessionId === activeSessionId) {
          onEnded?.();
        }
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[VOICE] Native speech fallback error:", err);
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
 * Authoritative Voice Playback Pipeline
 * Guaranteed: Exactly ONE audio output at a time.
 */
export function playVoiceAudio(options: PlayVoiceOptions): AudioPlaybackController {
  const { messageId, forceReplay } = options;

  // 1. Duplicate Request Protection
  if (messageId && !forceReplay && spokenMessageIds.has(messageId)) {
    console.log(`[VOICE] Duplicate request ignored: Message ${messageId} already spoken.`);
    return {
      stop: () => {},
      promise: Promise.resolve(),
      messageId,
    };
  }

  // Immediately stop any previously playing audio, abort pending requests, and cancel synthesis
  stopAnyVoicePlayback();

  // Mark message as spoken in registry
  if (messageId) {
    spokenMessageIds.add(messageId);
  }

  // Create new session
  const thisSession = ++activeSessionId;
  const abortController = new AbortController();
  activeAbortController = abortController;

  const targetGender = getVoiceGender(options.voiceId);
  const voiceId = options.voiceId || "kavya";
  const provider = options.provider || "auto";
  const speed = options.playbackSpeed ?? 1.0;

  console.log(
    `[VOICE] TTS requested | Message: ${messageId ?? "direct"} | Voice: ${voiceId} (${targetGender}) | Provider: ${provider}`,
  );

  let isStopped = false;
  let subNativeController: AudioPlaybackController | null = null;

  const stop = () => {
    isStopped = true;
    if (thisSession === activeSessionId) {
      stopAnyVoicePlayback();
    }
    if (subNativeController) {
      subNativeController.stop();
      subNativeController = null;
    }
  };

  const promise = (async () => {
    const textToSpeak = cleanSpokenText(options.text);
    if (!textToSpeak) {
      options.onEnded?.();
      return;
    }

    try {
      unlockAudio();

      console.log(`[VOICE] TTS fetch started for session ${thisSession}...`);
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          text: textToSpeak,
          voice: voiceId,
          provider,
          playbackSpeed: speed,
        }),
      });

      // Bail if session was superseded or aborted
      if (isStopped || thisSession !== activeSessionId || abortController.signal.aborted) {
        console.log(`[VOICE] TTS request aborted or superseded (Session ${thisSession})`);
        return;
      }

      if (!res.ok) {
        throw new Error(`TTS server responded with ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "audio/wav";
      const actualProvider = res.headers.get("x-voice-provider") || provider;
      const actualSpeaker = res.headers.get("x-voice-speaker") || voiceId;

      const arrayBuffer = await res.arrayBuffer();

      if (isStopped || thisSession !== activeSessionId || abortController.signal.aborted) {
        return;
      }

      if (!arrayBuffer || arrayBuffer.byteLength < 500) {
        throw new Error("Empty audio buffer returned from TTS");
      }

      console.log(
        `[VOICE] Audio received: ${arrayBuffer.byteLength} bytes (${contentType}) | Provider: ${actualProvider} | Speaker: ${actualSpeaker}`,
      );

      // Attempt Tier 1: Web Audio API
      const ctx = getAudioContext();
      if (ctx) {
        try {
          if (ctx.state === "suspended") {
            await ctx.resume();
          }

          if (ctx.state === "running") {
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
            if (isStopped || thisSession !== activeSessionId) return;

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            if (speed > 0) {
              source.playbackRate.value = speed;
            }
            source.connect(ctx.destination);
            activeSourceNode = source;

            console.log(
              `[VOICE] Audio playback started via Web Audio API (Session ${thisSession})`,
            );
            options.onStart?.();

            await new Promise<void>((resolve) => {
              source.onended = () => {
                activeSourceNode = null;
                resolve();
              };
              source.start(0);
            });

            if (!isStopped && thisSession === activeSessionId) {
              console.log(`[VOICE] Audio playback ended normally (Session ${thisSession})`);
              options.onEnded?.();
            }
            return;
          }
        } catch (webAudioErr) {
          console.warn(
            "[VOICE] Web Audio API playback bypassed, trying HTMLAudioElement:",
            webAudioErr,
          );
        }
      }

      // Tier 2: Single HTMLAudioElement
      if (isStopped || thisSession !== activeSessionId) return;

      const blob = new Blob([arrayBuffer], { type: contentType });
      activeBlobUrl = URL.createObjectURL(blob);

      const audio = getSingleAudioElement();
      if (!audio) {
        throw new Error("Audio element unavailable");
      }

      audio.src = activeBlobUrl;
      if (speed > 0) {
        audio.playbackRate = speed;
      }

      console.log(`[VOICE] Audio playback started via HTMLAudioElement (Session ${thisSession})`);

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          audio.onended = null;
          audio.onerror = null;
          resolve();
        };
        audio.onerror = () => {
          audio.onended = null;
          audio.onerror = null;
          reject(new Error("HTMLAudioElement error event fired"));
        };

        audio
          .play()
          .then(() => {
            if (!isStopped && thisSession === activeSessionId) {
              options.onStart?.();
            }
          })
          .catch((err: unknown) => {
            audio.onended = null;
            audio.onerror = null;
            reject(err);
          });
      });

      if (!isStopped && thisSession === activeSessionId) {
        console.log(`[VOICE] Audio playback ended normally (Session ${thisSession})`);
        options.onEnded?.();
      }
      return;
    } catch (err: unknown) {
      if (isStopped || thisSession !== activeSessionId || abortController.signal.aborted) {
        // Normal intentional stop or superseded request
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      console.warn(`[VOICE] Server TTS playback error (Session ${thisSession}):`, error.message);

      // Tier 3: Browser SpeechSynthesis (Strict gender matching)
      if (options.allowBrowserFallback !== false) {
        console.log(`[VOICE] Triggering gender-matched native speech fallback (${targetGender})`);
        subNativeController = playNativeSpeech(
          textToSpeak,
          targetGender,
          speed,
          options.onStart,
          options.onEnded,
          thisSession,
        );
        await subNativeController.promise;
      } else {
        options.onError?.(error);
        options.onEnded?.();
      }
    } finally {
      if (thisSession === activeSessionId) {
        if (activeBlobUrl) {
          try {
            URL.revokeObjectURL(activeBlobUrl);
          } catch {
            /* ignore */
          }
          activeBlobUrl = null;
        }
        activeAbortController = null;
      }
    }
  })();

  const controller: AudioPlaybackController = {
    stop,
    promise,
    messageId,
  };

  activeGlobalController = controller;
  return controller;
}
