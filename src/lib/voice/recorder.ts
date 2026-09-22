/**
 * Bravura AI — Studio Voice Recorder & Advanced Voice Isolation Engine
 *
 * Features:
 *   - Advanced browser hardware constraints (echoCancellation, noiseSuppression, autoGainControl).
 *   - Real-time Web Audio DSP Voice Isolation chain:
 *       1. High-Pass Filter (85Hz) removes low-end HVAC, desk rumble, and wind plosives.
 *       2. Peaking Vocal Formant Filter (2.8kHz, +3dB) boosts phonetic articulation.
 *       3. Low-Pass Filter (7.6kHz) attenuates ambient room reflections, hiss, and keystrokes.
 *       4. Dynamics Compressor levels speech and controls sudden background transients.
 *       5. MediaStreamAudioDestinationNode feeds cleaned, voice-isolated audio to MediaRecorder.
 *   - Adaptive noise-floor tracking to prevent continuous background noise from keeping the mic stuck.
 *   - Automatic silence detection with voice activity confirmation.
 */

export type RecorderOptions = {
  /** Called frequently with current audio level (0..1). For a waveform UI. */
  onLevel?: (level: number) => void;
  /** Called frequently with frequency spectrum data (0..255). For live frequency bars/waveform. */
  onFrequencyData?: (data: Uint8Array) => void;
  /** Called when auto-stop completes due to silence after speech. */
  onAutoStop?: (result: RecorderResult) => void;
  /** Auto-stop after this many ms of silence once speech was heard. 0 disables. Default 2400. */
  silenceMs?: number;
  /** Volume below which we consider it silence. 0..1. Default 0.025. */
  silenceThreshold?: number;
  /** Maximum recording length in ms. Default 60000 (60s). */
  maxDurationMs?: number;
  /** Whether to enable the real-time DSP Voice Isolation and Noise Cancellation pipeline (default: true). */
  enableVoiceIsolation?: boolean;
};

export type RecorderResult = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
};

export class VoiceRecorder {
  private rawStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private rafId: number | null = null;
  private startedAt = 0;
  private lastLoudAt = 0;
  private hasSpoken = false;
  private speechFrames = 0;
  private maxTimer: number | null = null;
  private isStopping = false;
  private lastResult: RecorderResult | null = null;
  private stopResolve: ((r: RecorderResult) => void) | null = null;
  private stopReject: ((e: Error) => void) | null = null;

  // Adaptive background noise floor tracker
  private ambientNoiseFloor = 0.015;

  private options: {
    onLevel?: (level: number) => void;
    onFrequencyData?: (data: Uint8Array) => void;
    onAutoStop?: (result: RecorderResult) => void;
    silenceMs: number;
    silenceThreshold: number;
    maxDurationMs: number;
    enableVoiceIsolation: boolean;
  };

  constructor(options: RecorderOptions = {}) {
    this.options = {
      silenceMs: options.silenceMs ?? 2400,
      silenceThreshold: options.silenceThreshold ?? 0.025,
      maxDurationMs: options.maxDurationMs ?? 60_000,
      enableVoiceIsolation: options.enableVoiceIsolation !== false,
      onLevel: options.onLevel,
      onFrequencyData: options.onFrequencyData,
      onAutoStop: options.onAutoStop,
    };
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

  /** Request mic + start recording with active voice isolation. */
  async start(): Promise<void> {
    if (this.recorder) {
      throw new Error("Recorder is already running.");
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone is not supported in this browser.");
    }

    let stream: MediaStream;
    try {
      // Enhanced studio-grade constraints for superior noise rejection
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 }, // mono for clean voice processing
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
      };

      // Apply Chromium-specific noise suppression / isolation flags if supported
      const extendedConstraints = {
        ...audioConstraints,
        googEchoCancellation: { ideal: true },
        googAutoGainControl: { ideal: true },
        googNoiseSuppression: { ideal: true },
        googHighpassFilter: { ideal: true },
        googTypingNoiseDetection: { ideal: true },
        googAudioMirroring: { ideal: false },
      } as unknown as MediaTrackConstraints;

      stream = await navigator.mediaDevices.getUserMedia({
        audio: extendedConstraints,
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

    this.rawStream = stream;
    this.chunks = [];
    this.hasSpoken = false;
    this.isStopping = false;
    this.lastResult = null;
    this.ambientNoiseFloor = 0.015;

    let recordingStream = stream;

    // Build real-time Web Audio DSP Voice Isolation chain
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      this.audioContext = ctx;

      const source = ctx.createMediaStreamSource(stream);

      if (this.options.enableVoiceIsolation) {
        // Stage 1: High-Pass Rumble Filter (85 Hz)
        // Eliminates sub-audible table thumps, AC hum, and proximity air pops
        const highpass = ctx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 85;
        highpass.Q.value = 0.707;

        // Stage 2: Vocal Formant Presence Boost (2.8 kHz, +3 dB)
        // Accentuates speech intelligibility, consonants, and vocal clarity over background murmur
        const voiceClarity = ctx.createBiquadFilter();
        voiceClarity.type = "peaking";
        voiceClarity.frequency.value = 2800;
        voiceClarity.gain.value = 3.0;
        voiceClarity.Q.value = 1.2;

        // Stage 3: Low-Pass Hiss & Echo Suppressor (7.6 kHz)
        // Filters out computer fan hiss, high-pitched electrical buzz, and room flutter
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 7600;
        lowpass.Q.value = 0.707;

        // Stage 4: Dynamics Voice Compressor
        // Maintains consistent vocal levels and squashes background noise bursts
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -28;
        compressor.knee.value = 10;
        compressor.ratio.value = 4.5;
        compressor.attack.value = 0.003; // 3 ms rapid response
        compressor.release.value = 0.22; // 220 ms smooth release

        // Stage 5: Real-time Analyser Node
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.7;
        this.analyser = analyser;

        // Connect DSP chain
        source.connect(highpass);
        highpass.connect(voiceClarity);
        voiceClarity.connect(lowpass);
        lowpass.connect(compressor);
        compressor.connect(analyser);

        // Stage 6: Processed Stream Destination for MediaRecorder
        if (typeof ctx.createMediaStreamDestination === "function") {
          const dest = ctx.createMediaStreamDestination();
          compressor.connect(dest);
          this.streamDestination = dest;
          this.processedStream = dest.stream;
          recordingStream = dest.stream;
          console.log("[VOICE_RECORDER] Studio DSP Voice Isolation & Noise Filter active.");
        }
      } else {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        this.analyser = analyser;
      }

      // Visual / VAD Audio sampling loop
      if (this.analyser) {
        const analyser = this.analyser;
        const timeBuffer = new Uint8Array(analyser.fftSize);
        const freqBuffer = this.options.onFrequencyData
          ? new Uint8Array(analyser.frequencyBinCount)
          : null;

        const tick = () => {
          if (!this.analyser || this.isStopping) return;

          analyser.getByteTimeDomainData(timeBuffer);
          if (this.options.onFrequencyData && freqBuffer) {
            analyser.getByteFrequencyData(freqBuffer);
            this.options.onFrequencyData(freqBuffer);
          }

          // Compute RMS amplitude (128 = center/silence)
          let sum = 0;
          for (let i = 0; i < timeBuffer.length; i++) {
            const byte = timeBuffer[i];
            if (byte === undefined) continue;
            const v = (byte - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / timeBuffer.length);
          const level = Math.min(1, rms * 4.2);
          this.options.onLevel?.(level);

          const now = performance.now();

          // Adaptive Noise Floor Estimation
          // Slowly track the quietest ambient level to adapt to room noise
          if (level < this.ambientNoiseFloor) {
            this.ambientNoiseFloor = this.ambientNoiseFloor * 0.9 + level * 0.1;
          } else {
            this.ambientNoiseFloor = this.ambientNoiseFloor * 0.999 + level * 0.001;
          }

          // Effective speech threshold requires exceeding the adaptive room noise floor
          const dynamicThreshold = Math.max(
            this.options.silenceThreshold,
            this.ambientNoiseFloor * 2.2,
          );

          if (level > dynamicThreshold) {
            this.speechFrames += 1;
            this.lastLoudAt = now;
            if (this.speechFrames >= 3) {
              this.hasSpoken = true;
            }
          } else {
            this.speechFrames = Math.max(0, this.speechFrames - 1);
            if (!this.hasSpoken) {
              // Haven't started speaking yet; don't trigger auto-stop prematurely
              this.lastLoudAt = now;
            }
          }

          // Auto-stop triggered by silence AFTER clear speech has occurred
          if (
            this.options.silenceMs > 0 &&
            this.hasSpoken &&
            now - this.lastLoudAt > this.options.silenceMs &&
            now - this.startedAt > 1200
          ) {
            this.isStopping = true;
            void this.stop().then((result) => {
              this.options.onAutoStop?.(result);
            });
            return;
          }

          this.rafId = requestAnimationFrame(tick);
        };

        this.rafId = requestAnimationFrame(tick);
      }
    } catch (e) {
      console.warn("[VOICE_RECORDER] Web Audio DSP chain initialization warning:", e);
    }

    const mimeType = this.pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(recordingStream, { mimeType })
      : new MediaRecorder(recordingStream);

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

    recorder.start();

    // Cap on max duration
    if (this.options.maxDurationMs > 0) {
      this.maxTimer = window.setTimeout(() => {
        if (!this.isStopping) {
          this.isStopping = true;
          void this.stop().then((result) => {
            this.options.onAutoStop?.(result);
          });
        }
      }, this.options.maxDurationMs);
    }
  }

  /** Stop recording and resolve with the recorded blob. */
  async stop(): Promise<RecorderResult> {
    if (this.lastResult) {
      return this.lastResult;
    }

    if (!this.recorder) {
      throw new Error("Recorder is not running.");
    }

    if (this.stopResolve) {
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

    this.isStopping = true;

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
        const res: RecorderResult = { blob, mimeType, durationMs };
        this.lastResult = res;
        this.cleanup();
        resolve(res);
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
    this.isStopping = true;
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
    if (this.maxTimer !== null) {
      window.clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }
    if (this.audioContext) {
      void this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
    this.analyser = null;
    this.streamDestination = null;

    if (this.processedStream) {
      this.processedStream.getTracks().forEach((track) => track.stop());
      this.processedStream = null;
    }
    if (this.rawStream) {
      this.rawStream.getTracks().forEach((track) => track.stop());
      this.rawStream = null;
    }

    this.recorder = null;
    this.chunks = [];
    this.stopResolve = null;
    this.stopReject = null;
  }
}
