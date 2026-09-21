import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, X } from "lucide-react";
import { VoiceRecorder, type RecorderResult } from "@/lib/voice/recorder";
import { cn } from "@/lib/utils";

type MicButtonProps = {
  onTranscribed: (text: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
};

type Status = "idle" | "recording" | "transcribing" | "error";

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeech {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
}

export function MicButton({ onTranscribed, onCancel, disabled }: MicButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [level, setLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognizedTextRef = useRef<string>("");
  const errorTimerRef = useRef<number | null>(null);

  const showError = useCallback((message: string) => {
    setStatus("error");
    setLevel(0);
    setErrorMessage(message);
    if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
    errorTimerRef.current = window.setTimeout(() => {
      setStatus("idle");
      setErrorMessage(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      recorderRef.current = null;
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
        speechRecognitionRef.current = null;
      }
      if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
    };
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    // Stop browser recognition if active
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
    }

    const recorder = recorderRef.current;
    if (!recorder) return;

    setStatus("transcribing");
    let result: RecorderResult;
    try {
      result = await recorder.stop();
    } catch (error) {
      recorderRef.current = null;
      const message = error instanceof Error ? error.message : "Recording failed.";
      showError(message);
      return;
    }
    recorderRef.current = null;

    // If browser speech recognition captured the text, use it directly!
    const clientText = recognizedTextRef.current.trim();
    if (clientText) {
      setStatus("idle");
      setLevel(0);
      onTranscribed(clientText);
      return;
    }

    if (result.blob.size < 200) {
      setStatus("idle");
      setLevel(0);
      showError("No sound detected. Click mic to speak.");
      return;
    }

    setStatus("transcribing");

    try {
      const formData = new FormData();
      const ext = result.mimeType.includes("mp4") ? "mp4" : "webm";
      formData.append("audio", result.blob, `recording.${ext}`);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json().catch(() => null)) as
        { ok: true; text: string } | { ok: false; error: string } | null;

      if (!res.ok || !payload || !("ok" in payload) || !payload.ok) {
        if (clientText) {
          setStatus("idle");
          setLevel(0);
          onTranscribed(clientText);
          return;
        }
        const message =
          payload && "error" in payload && payload.error
            ? payload.error
            : "Voice input recorded. Type or speak more clearly into the mic.";
        showError(message);
        return;
      }

      const text = payload.text.trim();
      setStatus("idle");
      setLevel(0);

      if (text) {
        onTranscribed(text);
      } else if (clientText) {
        onTranscribed(clientText);
      } else {
        showError("Nothing was heard. Try speaking a bit louder.");
      }
    } catch {
      if (clientText) {
        setStatus("idle");
        setLevel(0);
        onTranscribed(clientText);
      } else {
        showError("Network issue — check your connection and try again.");
      }
    }
  }, [onTranscribed, showError]);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setStatus("recording");
    setLevel(0);
    recognizedTextRef.current = "";

    // Launch browser SpeechRecognition in parallel if available for zero-token real-time capture
    try {
      const speechWindow = window as unknown as WindowWithSpeech;
      const SpeechRecognitionClass =
        speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event: {
          results: ArrayLike<ArrayLike<{ transcript: string }>>;
        }) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i]?.[0];
            if (item?.transcript) {
              currentTranscript += item.transcript;
            }
          }
          if (currentTranscript.trim()) {
            recognizedTextRef.current = currentTranscript.trim();
          }
        };
        recognition.onerror = () => {
          // fail silently to audio blob fallback
        };
        recognition.start();
        speechRecognitionRef.current = recognition;
      }
    } catch {
      // ignore
    }

    const recorder = new VoiceRecorder({
      onLevel: (l) => setLevel(l),
      silenceMs: 2400,
      silenceThreshold: 0.015,
      maxDurationMs: 60_000,
      onSilence: () => {
        void stopAndTranscribe();
      },
    });
    recorderRef.current = recorder;

    try {
      await recorder.start();
    } catch (error) {
      recorderRef.current = null;
      const message = error instanceof Error ? error.message : "Could not start the microphone.";
      showError(message);
    }
  }, [showError, stopAndTranscribe]);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setStatus("idle");
    setLevel(0);
    onCancel?.();
  }, [onCancel]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (status === "recording") {
      void stopAndTranscribe();
    } else if (status === "idle" || status === "error") {
      void startRecording();
    }
  }, [disabled, status, startRecording, stopAndTranscribe]);

  const label =
    status === "recording"
      ? "Stop recording"
      : status === "transcribing"
        ? "Transcribing"
        : "Start voice input";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || status === "transcribing"}
        aria-label={label}
        title={label}
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer",
          status === "recording"
            ? "bg-red-500/25 text-red-400 ring-1 ring-red-500/60"
            : "text-zinc-400 hover:text-white hover:bg-white/10",
          status === "transcribing" && "opacity-70",
          disabled && "cursor-not-allowed opacity-40",
        )}
        style={
          status === "recording"
            ? {
                transform: `scale(${1 + Math.min(level, 0.4) * 0.25})`,
                transition: "transform 80ms linear",
              }
            : undefined
        }
      >
        {status === "transcribing" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Mic className="size-4" />
        )}
      </button>

      {status === "recording" && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-red-500/40"
          style={{
            transform: `scale(${1 + Math.min(level, 0.6) * 0.6})`,
            opacity: 1 - Math.min(level, 0.6) * 0.8,
            transition: "transform 80ms linear, opacity 80ms linear",
          }}
        />
      )}

      {status === "recording" && (
        <button
          type="button"
          onClick={cancelRecording}
          aria-label="Cancel recording"
          title="Cancel"
          className="text-muted-foreground hover:text-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-white/10 backdrop-blur"
        >
          <X className="size-2.5" />
        </button>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="absolute right-0 bottom-full z-50 mb-2 w-56 rounded-xl border border-red-500/40 bg-[#1a0e0e]/95 px-3 py-2 text-[11px] text-red-200 shadow-xl backdrop-blur"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
