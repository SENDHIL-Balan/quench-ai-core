/**
 * Bravura AI — microphone recorder
 *
 * Thin wrapper around MediaRecorder + Web Audio API:
 *   - requests mic permission on first start
 *   - records audio/webm (Chrome, Edge, Firefox) or audio/mp4 (Safari)
 *   - reports live volume so the UI can show a waveform
 *   - auto-stops after a period of silence (if enabled)
 *
 * No server calls. No dependencies. Browser-native only.
 */

export type RecorderOptions = {
  /** Called frequently with current audio level (0..1). For a waveform UI. */
  onLevel?: (level: number) => void;
  /** Called frequently with frequency spectrum data (0..255). For live frequency bars/waveform. */
  onFrequencyData?: (data: Uint8Array) => void;
  /** Auto-stop after this many ms of silence. 0 disables. Default 1500. */
  silenceMs?: number;
  /** Volume below which we consider it silence. 0..1. Default 0.02. */
  silenceThreshold?: number;
  /** Maximum recording length in ms. Default 60000 (60s). */
  maxDurationMs?: number;
  /** Callback triggered when silence threshold has been exceeded */
  onSilence?: () => void;
};

export type RecorderResult = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
};

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private startedAt = 0;
  private lastLoudAt = 0;
  private silenceTimer: number | null = null;
  private maxTimer: number | null = null;
  private stopResolve: ((r: RecorderResult) => void) | null = null;
  private stopReject: ((e: Error) => void) | null = null;
  private options: {
    onLevel?: (level: number) => void;
    onFrequencyData?: (data: Uint8Array) => void;
    silenceMs: number;
    silenceThreshold: number;
    maxDurationMs: number;
  };
  constructor(options: RecorderOptions = {}) {
    const opts: {
      onLevel?: (level: number) => void;
      onFrequencyData?: (data: Uint8Array) => void;
      silenceMs: number;
      silenceThreshold: number;
      maxDurationMs: number;
    } = {
      silenceMs: options.silenceMs ?? 1500,
      silenceThreshold: options.silenceThreshold ?? 0.02,
      maxDurationMs: options.maxDurationMs ?? 60_000,
    };
    if (options.onLevel) opts.onLevel = options.onLevel;
    if (options.onFrequencyData) opts.onFrequencyData = options.onFrequencyData;
    this.options = opts;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /** Pick a mimeType the browser supports. */
  private pickMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    if (typeof MediaRecorder === "undefined") return "";
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  }

  /** Request mic + start recording. Resolves when recording has started. */
  async start(): Promise<void> {
    if (this.recorder) {
      throw new Error("Recorder is already running.");
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone is not supported in this browser.");
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        throw new Error("Microphone permission denied. Enable it in your browser settings.");
      }
      if (name === "NotFoundError") {
        throw new Error("No microphone was found on this device.");
      }
      throw new Error("Could not start the microphone.");
    }

    this.stream = stream;
    this.chunks = [];

    const mimeType = this.pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    this.recorder = recorder;
    this.startedAt = performance.now();
    this.lastLoudAt = this.startedAt;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      this.fail(new Error("Recording failed."));
    };

    // Analyser for level metering + silence detection
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      this.audioContext = ctx;
      this.analyser = analyser;

      const buffer = new Uint8Array(analyser.fftSize);
      const freqBuffer = this.options.onFrequencyData
        ? new Uint8Array(analyser.frequencyBinCount)
        : null;
      const tick = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(buffer);
        if (this.options.onFrequencyData && freqBuffer) {
          this.analyser.getByteFrequencyData(freqBuffer);
          this.options.onFrequencyData(freqBuffer);
        }
        // RMS from centered byte data (128 = silence)
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const byte = buffer[i];
          if (byte === undefined) continue;
          const v = (byte - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const level = Math.min(1, rms * 4);
        this.options.onLevel?.(level);

        const now = performance.now();
        if (level > this.options.silenceThreshold) {
          this.lastLoudAt = now;
        } else if (
          this.options.silenceMs > 0 &&
          now - this.lastLoudAt > this.options.silenceMs &&
          now - this.startedAt > 500 // don't stop within first 0.5s
        ) {
          this.options.onSilence?.();
          void this.stop();
          return;
        }

        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    } catch {
      // Level metering is optional; recording still works without it.
      this.audioContext = null;
      this.analyser = null;
    }

    recorder.start();

    // Hard cap on duration
    if (this.options.maxDurationMs > 0) {
      this.maxTimer = window.setTimeout(() => {
        void this.stop();
      }, this.options.maxDurationMs);
    }
  }

  /** Stop recording and resolve with the recorded blob. */
  async stop(): Promise<RecorderResult> {
    if (!this.recorder) {
      throw new Error("Recorder is not running.");
    }

    if (this.stopResolve) {
      // Already stopping — return the same promise.
      return new Promise<RecorderResult>((resolve, reject) => {
        const prevResolve = this.stopResolve;
        const prevReject = this.stopReject;
        this.stopResolve = (r) => {
          prevResolve?.(r);
          resolve(r);
        };
        this.stopReject = (e) => {
          prevReject?.(e);
          reject(e);
        };
      });
    }

    return new Promise<RecorderResult>((resolve, reject) => {
      this.stopResolve = resolve;
      this.stopReject = reject;

      const recorder = this.recorder;
      if (!recorder) {
        reject(new Error("Recorder is not running."));
        return;
      }

      recorder.onstop = () => {
        const durationMs = performance.now() - this.startedAt;
        const mimeType = recorder.mimeType || this.pickMimeType() || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve({ blob, mimeType, durationMs });
      };

      try {
        recorder.stop();
      } catch (error) {
        this.cleanup();
        reject(error instanceof Error ? error : new Error("Stop failed."));
      }
    });
  }

  /** Cancel without producing a result. */
  cancel(): void {
    try {
      this.recorder?.stop();
    } catch {
      /* ignore */
    }
    this.cleanup();
  }

  private fail(error: Error): void {
    this.stopReject?.(error);
    this.cleanup();
  }

  private cleanup(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.silenceTimer !== null) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxTimer !== null) {
      window.clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }
    if (this.audioContext) {
      void this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
    this.analyser = null;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.recorder = null;
    this.chunks = [];
    this.stopResolve = null;
    this.stopReject = null;
  }
}
