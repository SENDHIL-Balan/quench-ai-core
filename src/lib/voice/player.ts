/**
 * Bravura AI — Authoritative Voice Player & State-Based Audio Queue Service
 *
 * Core Architecture:
 * 1. State-based audio queue (FIFO processing: 'idle' | 'fetching' | 'playing' | 'interrupted').
 * 2. Strict deduplication using unique message IDs (prevents duplicate playback).
 * 3. Force-termination of any currently active audio when starting a new stream or interrupting.
 * 4. Strict gender-preservation across all primary engines and fallbacks.
 * 5. Single managed audio instance to eliminate audio collisions, leaks, and overlapping speech.
 */

import type { VoiceProvider } from "./types";
import { getVoiceGender } from "./voices";

export type VoiceQueueState = "idle" | "fetching" | "playing" | "interrupted";

export type PlayVoiceOptions = {
  text: string;
  messageId?: string;
  voiceId?: string;
  provider?: VoiceProvider;
  playbackSpeed?: number;
  forceReplay?: boolean;
  allowBrowserFallback?: boolean;
  /**
   * If true (default), forces immediate termination of any currently playing
   * audio and flushes old queue items to start this new stream immediately.
   * If false, enqueues the item at the tail of the current FIFO stream.
   */
  newStream?: boolean;
  streamId?: string;
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (err: Error) => void;
};

export type AudioPlaybackController = {
  stop: () => void;
  promise: Promise<void>;
  messageId: string;
};

export interface AudioQueueItem {
  id: string;
  text: string;
  voiceId: string;
  provider: VoiceProvider;
  playbackSpeed: number;
  forceReplay: boolean;
  allowBrowserFallback: boolean;
  streamId?: string;
  sessionId: number;
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (err: Error) => void;
  resolve: () => void;
  reject: (err: Error) => void;
}

// Internal Audio Hardware Singletons
let globalAudioCtx: AudioContext | null = null;
let singleAudioElement: HTMLAudioElement | null = null;
let globalAudioAnalyser: AnalyserNode | null = null;

// Global Registry of processed message IDs (deduplication)
const processedMessageIds = new Set<string>();

export function isMessageSpoken(messageId: string): boolean {
  return processedMessageIds.has(messageId);
}

export function markMessageSpoken(messageId: string): void {
  processedMessageIds.add(messageId);
}

export function clearSpokenHistory(): void {
  processedMessageIds.clear();
  console.log("[VOICE_QUEUE] Spoken message history cleared.");
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
 * Get or create the shared AnalyserNode for real-time visualization of AI voice output
 */
export function getAudioAnalyser(): AnalyserNode | null {
  if (typeof window === "undefined") return null;
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (!globalAudioAnalyser) {
    try {
      globalAudioAnalyser = ctx.createAnalyser();
      globalAudioAnalyser.fftSize = 256;
      globalAudioAnalyser.smoothingTimeConstant = 0.8;
    } catch {
      globalAudioAnalyser = null;
    }
  }
  return globalAudioAnalyser;
}

/**
 * Convenience helper to sample real-time frequency data from the active voice playback pipeline
 */
export function getPlaybackFrequencyData(): Uint8Array | null {
  const analyser = getAudioAnalyser();
  if (!analyser) return null;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  return data;
}

/**
 * Returns whether speech audio is actively playing through the voice queue
 */
export function isAudioPlaying(): boolean {
  return voiceQueue.getState() === "playing";
}

/**
 * Get or create the shared HTMLAudioElement.
 * Pure native audio pipeline to avoid CORS restrictions or suspended context muting.
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
 * Unlock AudioContext & SpeechSynthesis on any user gesture
 */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {
        /* ignore */
      }
    }

    const audio = getSingleAudioElement();
    if (audio) {
      // Prime HTML5 Audio with 1 sample of silence to unlock browser media permission
      audio.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      const p = audio.play();
      if (p) {
        p.then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      }
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
  } catch {
    // ignore
  }
}

if (typeof window !== "undefined") {
  const handleUserGesture = () => {
    unlockAudio();
  };
  window.addEventListener("pointerdown", handleUserGesture, { capture: true, passive: true });
  window.addEventListener("keydown", handleUserGesture, { capture: true, passive: true });
  window.addEventListener("touchstart", handleUserGesture, { capture: true, passive: true });
}

function cleanSpokenText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/data:[^;\s]+;base64,[A-Za-z0-9+/=]+/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*#_~>]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Browser-native SpeechSynthesis fallback with strict gender preservation
 */
function playNativeSpeech(
  text: string,
  gender: "male" | "female",
  rate = 1.0,
  onStart?: () => void,
  onEnded?: () => void,
  sessionId?: number,
  isCancelled?: () => boolean,
): Promise<void> {
  return new Promise<void>((resolve) => {
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
        console.log(`[VOICE_QUEUE] Native fallback voice: ${matchedVoice.name} (${gender})`);
      }

      utterance.onstart = () => {
        if (!isCancelled?.()) {
          onStart?.();
        }
      };

      utterance.onend = () => {
        if (!isCancelled?.()) {
          onEnded?.();
        }
        resolve();
      };

      utterance.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.warn("[VOICE_QUEUE] Native speech error:", e.error);
        }
        if (!isCancelled?.()) {
          onEnded?.();
        }
        resolve();
      };

      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[VOICE_QUEUE] Native speech fallback error:", err);
      onEnded?.();
      resolve();
    }
  });
}

/**
 * Authoritative State-Based Audio Queue Manager
 */
class VoiceQueueManager {
  private queue: AudioQueueItem[] = [];
  private state: VoiceQueueState = "idle";
  private currentItem: AudioQueueItem | null = null;
  private currentSessionId = 0;
  private activeAbortController: AbortController | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;
  private activeBlobUrl: string | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private listeners = new Set<
    (state: VoiceQueueState, currentItem: AudioQueueItem | null) => void
  >();

  public getState(): VoiceQueueState {
    return this.state;
  }

  public getCurrentItem(): AudioQueueItem | null {
    return this.currentItem;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public subscribe(
    listener: (state: VoiceQueueState, currentItem: AudioQueueItem | null) => void,
  ): () => void {
    this.listeners.add(listener);
    listener(this.state, this.currentItem);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(nextState: VoiceQueueState) {
    if (this.state === nextState) return;
    this.state = nextState;
    console.log(
      `[VOICE_QUEUE] State -> ${nextState.toUpperCase()} (Active: ${this.currentItem?.id ?? "none"}, Queued: ${this.queue.length})`,
    );
    this.listeners.forEach((listener) => {
      try {
        listener(this.state, this.currentItem);
      } catch (err) {
        console.error("[VOICE_QUEUE] Listener error:", err);
      }
    });
  }

  /**
   * Forcefully terminates any currently playing audio, aborts active requests,
   * cancels speech synthesis, and flushes any pending queue items.
   */
  public forceTerminateCurrentAndClear(reason = "user_interrupt"): void {
    this.currentSessionId++;
    const termSession = this.currentSessionId;

    console.log(
      `[VOICE_QUEUE] Force-terminating audio & flushing queue. Reason: ${reason} (Session ${termSession})`,
    );

    // 1. Abort active HTTP fetch
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {
        /* ignore */
      }
      this.activeAbortController = null;
    }

    // 2. Stop Web Audio source node
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.onended = null;
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch {
        /* ignore */
      }
      this.activeSourceNode = null;
    }

    // 3. Stop Active HTMLAudioElement
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.onended = null;
        this.currentAudioElement.onerror = null;
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        /* ignore */
      }
      this.currentAudioElement = null;
    }

    if (singleAudioElement) {
      try {
        singleAudioElement.onended = null;
        singleAudioElement.onerror = null;
        singleAudioElement.pause();
        singleAudioElement.currentTime = 0;
      } catch {
        /* ignore */
      }
    }

    // 4. Revoke Blob URL
    if (this.activeBlobUrl) {
      try {
        URL.revokeObjectURL(this.activeBlobUrl);
      } catch {
        /* ignore */
      }
      this.activeBlobUrl = null;
    }

    // 5. Cancel SpeechSynthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }

    // 6. Flush pending queue items and resolve them cleanly
    const pendingItems = [...this.queue];
    this.queue = [];

    if (this.currentItem) {
      try {
        this.currentItem.resolve();
      } catch {
        /* ignore */
      }
      this.currentItem = null;
    }

    for (const item of pendingItems) {
      try {
        item.resolve();
      } catch {
        /* ignore */
      }
    }

    this.setState("interrupted");
    this.setState("idle");
  }

  /**
   * Enqueue or start a new stream in the state-based FIFO audio queue.
   */
  public playOrEnqueue(options: PlayVoiceOptions): AudioPlaybackController {
    const isNewStream = options.newStream !== false;
    const messageId =
      options.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 1. Duplicate Request Protection
    if (!options.forceReplay) {
      if (processedMessageIds.has(messageId)) {
        console.log(
          `[VOICE_QUEUE] Deduplication: Message ${messageId} already processed. Ignoring.`,
        );
        return {
          stop: () => {},
          promise: Promise.resolve(),
          messageId,
        };
      }

      const alreadyQueued = this.queue.some((item) => item.id === messageId);
      if (alreadyQueued || this.currentItem?.id === messageId) {
        console.log(
          `[VOICE_QUEUE] Deduplication: Message ${messageId} already in queue. Ignoring.`,
        );
        return {
          stop: () => {},
          promise: Promise.resolve(),
          messageId,
        };
      }
    }

    // 2. Force termination if starting a new stream
    if (isNewStream) {
      console.log(
        `[VOICE_QUEUE] New stream started for message ${messageId}. Forcing termination of active audio.`,
      );
      this.forceTerminateCurrentAndClear("new_stream_initiated");
    }

    let resolvePromise!: () => void;
    let rejectPromise!: (err: Error) => void;
    const promise = new Promise<void>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const thisSession = this.currentSessionId;
    const queueItem: AudioQueueItem = {
      id: messageId,
      text: options.text,
      voiceId: options.voiceId || "kavya",
      provider: options.provider || "auto",
      playbackSpeed: options.playbackSpeed ?? 1.0,
      forceReplay: Boolean(options.forceReplay),
      allowBrowserFallback: options.allowBrowserFallback !== false,
      streamId: options.streamId,
      sessionId: thisSession,
      onStart: options.onStart,
      onEnded: options.onEnded,
      onError: options.onError,
      resolve: resolvePromise,
      reject: rejectPromise,
    };

    // Push into FIFO queue
    this.queue.push(queueItem);
    console.log(`[VOICE_QUEUE] Enqueued message ${messageId} (Queue size: ${this.queue.length})`);

    // Stop handler specific to this item
    const stop = () => {
      if (this.currentItem?.id === messageId) {
        this.forceTerminateCurrentAndClear("item_controller_stopped");
      } else {
        const idx = this.queue.findIndex((q) => q.id === messageId);
        if (idx !== -1) {
          const [removed] = this.queue.splice(idx, 1);
          removed.resolve();
          console.log(`[VOICE_QUEUE] Removed message ${messageId} from queue.`);
        }
      }
    };

    // Trigger FIFO processing worker if currently idle
    if (this.state === "idle" || this.state === "interrupted") {
      void this.processNextInQueue();
    }

    return {
      stop,
      promise,
      messageId,
    };
  }

  /**
   * FIFO Queue Processing Worker
   */
  private async processNextInQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.currentItem = null;
      this.setState("idle");
      return;
    }

    // Pull oldest item FIFO
    const item = this.queue.shift()!;
    this.currentItem = item;

    // Mark as processed in deduplication registry
    processedMessageIds.add(item.id);

    const sessionId = this.currentSessionId;
    const isSessionCancelled = () => sessionId !== this.currentSessionId;

    const targetGender = getVoiceGender(item.voiceId);
    const textToSpeak = cleanSpokenText(item.text);

    if (!textToSpeak) {
      item.onEnded?.();
      item.resolve();
      void this.processNextInQueue();
      return;
    }

    this.setState("fetching");
    const abortController = new AbortController();
    this.activeAbortController = abortController;

    console.log(
      `[VOICE_QUEUE] Processing FIFO item ${item.id} | Voice: ${item.voiceId} (${targetGender}) | Provider: ${item.provider}`,
    );

    try {
      unlockAudio();

      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          text: textToSpeak,
          voice: item.voiceId,
          provider: item.provider,
          playbackSpeed: item.playbackSpeed,
        }),
      });

      if (isSessionCancelled() || abortController.signal.aborted) {
        console.log(`[VOICE_QUEUE] Request cancelled for item ${item.id}`);
        item.resolve();
        return;
      }

      if (!res.ok) {
        throw new Error(`TTS server responded with ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "audio/wav";
      const actualProvider = res.headers.get("x-voice-provider") || item.provider;
      const actualSpeaker = res.headers.get("x-voice-speaker") || item.voiceId;
      const arrayBuffer = await res.arrayBuffer();

      if (isSessionCancelled() || abortController.signal.aborted) {
        item.resolve();
        return;
      }

      if (!arrayBuffer || arrayBuffer.byteLength < 500) {
        throw new Error("Empty audio buffer returned from TTS");
      }

      console.log(
        `[VOICE_QUEUE] Audio fetched (${arrayBuffer.byteLength} bytes, ${contentType}) | Provider: ${actualProvider} | Speaker: ${actualSpeaker}`,
      );

      this.setState("playing");
      item.onStart?.();

      // Primary Playback Engine: HTMLAudioElement with hardware audio decoding
      const blob = new Blob([arrayBuffer], { type: contentType || "audio/wav" });
      const blobUrl = URL.createObjectURL(blob);
      this.activeBlobUrl = blobUrl;

      let playedSuccessfully = false;
      const audio = new Audio(blobUrl);
      this.currentAudioElement = audio;

      if (item.playbackSpeed > 0) {
        audio.playbackRate = item.playbackSpeed;
      }

      // Optionally route to Web Audio Analyser if context is running for visualizer
      const ctx = getAudioContext();
      if (ctx && ctx.state === "running") {
        try {
          const analyser = getAudioAnalyser();
          if (analyser) {
            const mediaSource = ctx.createMediaElementSource(audio);
            mediaSource.connect(ctx.destination);
            mediaSource.connect(analyser);
          }
        } catch {
          // If already connected or restricted, audio plays directly to default output
        }
      }

      try {
        console.log(`[VOICE_QUEUE] Playing via HTMLAudioElement (Item: ${item.id})`);
        await new Promise<void>((resolve, reject) => {
          let finished = false;
          let safetyTimer: ReturnType<typeof setTimeout> | null = null;

          const finish = (err?: Error) => {
            if (finished) return;
            finished = true;
            if (safetyTimer) clearTimeout(safetyTimer);
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
            audio.removeEventListener("loadedmetadata", onMetadata);
            if (err) reject(err);
            else resolve();
          };

          const onEnded = () => finish();
          const onError = () => {
            const code = audio.error?.code;
            const msg = audio.error?.message || "Audio playback error";
            finish(new Error(`HTMLAudioElement error (code ${code}): ${msg}`));
          };
          const onMetadata = () => {
            const dur = audio.duration;
            if (Number.isFinite(dur) && dur > 0) {
              const maxWaitMs = (dur / Math.max(0.5, item.playbackSpeed)) * 1000 + 2500;
              if (safetyTimer) clearTimeout(safetyTimer);
              safetyTimer = setTimeout(() => {
                console.warn(`[VOICE_QUEUE] Safety timeout hit for item ${item.id}`);
                finish();
              }, maxWaitMs);
            }
          };

          // Default fallback safety timeout: 60s
          safetyTimer = setTimeout(() => {
            console.warn(`[VOICE_QUEUE] Default safety timeout reached for item ${item.id}`);
            finish();
          }, 60000);

          audio.addEventListener("ended", onEnded, { once: true });
          audio.addEventListener("error", onError, { once: true });
          audio.addEventListener("loadedmetadata", onMetadata, { once: true });

          const playPromise = audio.play();
          if (playPromise) {
            playPromise.catch((playErr) => {
              finish(playErr instanceof Error ? playErr : new Error(String(playErr)));
            });
          }
        });

        playedSuccessfully = true;
      } catch (audioErr) {
        console.warn(
          "[VOICE_QUEUE] HTMLAudioElement playback attempt failed, trying Web Audio API:",
          audioErr,
        );
      }

      // Tier 2 Fallback: Web Audio API
      if (!playedSuccessfully && ctx && !isSessionCancelled()) {
        try {
          if (ctx.state === "suspended") {
            try {
              await ctx.resume();
            } catch {
              /* ignore */
            }
          }

          if (ctx.state === "running") {
            let audioBuffer: AudioBuffer | null = null;
            try {
              audioBuffer = await new Promise<AudioBuffer>((res, rej) => {
                const promise = ctx.decodeAudioData(arrayBuffer.slice(0), res, rej);
                if (promise && typeof (promise as Promise<AudioBuffer>).then === "function") {
                  (promise as Promise<AudioBuffer>).then(res).catch(rej);
                }
              });
            } catch (decErr) {
              console.warn("[VOICE_QUEUE] Web Audio decode error:", decErr);
              audioBuffer = null;
            }

            if (audioBuffer && !isSessionCancelled()) {
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              if (item.playbackSpeed > 0) {
                source.playbackRate.value = item.playbackSpeed;
              }
              source.connect(ctx.destination);

              const analyser = getAudioAnalyser();
              if (analyser) {
                try {
                  source.connect(analyser);
                } catch {
                  /* ignore */
                }
              }
              this.activeSourceNode = source;

              console.log(`[VOICE_QUEUE] Playing via Web Audio API fallback (Item: ${item.id})`);
              const durationMs =
                (audioBuffer.duration / Math.max(0.5, item.playbackSpeed)) * 1000 + 1500;

              await new Promise<void>((resolve) => {
                let ended = false;
                const done = () => {
                  if (ended) return;
                  ended = true;
                  clearTimeout(timer);
                  this.activeSourceNode = null;
                  resolve();
                };
                const timer = setTimeout(done, durationMs);
                source.onended = done;
                source.start(0);
              });

              playedSuccessfully = true;
            }
          }
        } catch (webAudioErr) {
          console.warn("[VOICE_QUEUE] Web Audio playback failed:", webAudioErr);
        }
      }

      if (!isSessionCancelled()) {
        console.log(`[VOICE_QUEUE] Finished playback for item ${item.id}`);
        item.onEnded?.();
        item.resolve();
      }
    } catch (err: unknown) {
      if (isSessionCancelled() || abortController.signal.aborted) {
        item.resolve();
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      console.warn(`[VOICE_QUEUE] Server TTS synthesis failed for item ${item.id}:`, error.message);

      // Tier 3: SpeechSynthesis fallback with strict gender preservation
      if (item.allowBrowserFallback) {
        console.log(
          `[VOICE_QUEUE] Triggering gender-matched native speech fallback (${targetGender}) for item ${item.id}`,
        );
        this.setState("playing");
        await playNativeSpeech(
          textToSpeak,
          targetGender,
          item.playbackSpeed,
          item.onStart,
          item.onEnded,
          sessionId,
          isSessionCancelled,
        );
        item.resolve();
      } else {
        item.onError?.(error);
        item.onEnded?.();
        item.reject(error);
      }
    } finally {
      if (this.activeBlobUrl) {
        try {
          URL.revokeObjectURL(this.activeBlobUrl);
        } catch {
          /* ignore */
        }
        this.activeBlobUrl = null;
      }
      this.activeAbortController = null;
      this.currentItem = null;

      // Automatically advance to the next item in the FIFO queue
      if (!isSessionCancelled()) {
        void this.processNextInQueue();
      }
    }
  }
}

// Global Singleton Instance of VoiceQueueManager
export const voiceQueue = new VoiceQueueManager();

/**
 * Public API: Play or enqueue voice audio in the state-based FIFO audio queue.
 */
export function playVoiceAudio(options: PlayVoiceOptions): AudioPlaybackController {
  return voiceQueue.playOrEnqueue(options);
}

/**
 * Public API: Immediately terminates all active audio, aborts network requests,
 * and clears any queued items.
 */
export function stopAnyVoicePlayback(reason = "stop_requested"): void {
  voiceQueue.forceTerminateCurrentAndClear(reason);
}
