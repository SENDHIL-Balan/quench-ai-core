import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Copy,
  Volume2,
  VolumeX,
  FileText,
  Image as ImageIcon,
  X,
  MapPin,
  Crosshair,
  Loader2,
  Sparkles,
  Download,
} from "lucide-react";
import { QuenchOrb } from "./QuenchOrb";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { GoogleMapsCards } from "./GoogleMapsCards";
import type { AgentState } from "./AgentStatus";
import { BravuraTypingIndicator } from "./BravuraTypingIndicator";
import { RealtimeAudioVisualizer } from "./RealtimeAudioVisualizer";
import { unlockAudio } from "@/lib/voice/player";
import { downloadImageFile } from "@/lib/download-image";
import { cn } from "@/lib/utils";

export { BravuraTypingIndicator };

export function messageText(message: UIMessage): string {
  if (!message) return "";
  const anyMsg = message as unknown as {
    content?: string;
    text?: string;
    parts?: Array<{ type: string; text?: string; filename?: string }>;
  };

  if (typeof anyMsg.text === "string" && anyMsg.text) return anyMsg.text;
  if (typeof anyMsg.content === "string" && anyMsg.content) return anyMsg.content;

  if (Array.isArray(anyMsg.parts)) {
    const textPart = anyMsg.parts
      .filter((p) => p && p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("\n\n");
    if (textPart.trim()) return textPart.trim();
  }

  return "";
}

export function ChatView({
  messages,
  state,
  playingId,
  isSpeaking,
  onSpeak,
  onStopSpeak,
  onAllowLocation,
}: {
  messages: UIMessage[];
  state: AgentState;
  playingId?: string | null;
  isSpeaking?: boolean;
  onSpeak?: (id: string, text: string) => void;
  onStopSpeak?: () => void;
  onAllowLocation?: () => Promise<void> | void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  const hasPendingEmptyAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    !messageText(messages[messages.length - 1]);

  const displayMessages = hasPendingEmptyAssistant ? messages.slice(0, -1) : messages;
  const isWaiting = state === "thinking" || hasPendingEmptyAssistant;
  const isStreaming = state === "generating";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-2 py-4 sm:px-4 min-w-0">
      <AnimatePresence initial={false} mode="popLayout">
        {displayMessages.map((message, idx) => {
          const isLatest = idx === displayMessages.length - 1;
          return message.role === "user" ? (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex justify-end"
            >
              <UserMessage message={message} />
            </motion.div>
          ) : (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <AssistantMessage
                message={message}
                isStreaming={isStreaming && isLatest}
                isPlaying={playingId === message.id && Boolean(isSpeaking)}
                onSpeak={onSpeak}
                onStopSpeak={onStopSpeak}
                onAllowLocation={onAllowLocation}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {isWaiting && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="py-2"
        >
          <BravuraTypingIndicator />
        </motion.div>
      )}
      <div ref={endRef} className="h-2" />
    </div>
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copyTimeout.current), []);

  const fileParts = useMemo(() => {
    if (!Array.isArray(message.parts)) return [];
    return message.parts.filter(
      (p): p is Extract<(typeof message.parts)[number], { type: "file" }> => p.type === "file",
    );
  }, [message]);

  const pureText = useMemo(() => {
    if (Array.isArray(message.parts) && message.parts.length > 0) {
      const textParts = message.parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text);
      const joined = textParts.join("\n\n").trim();
      if (joined) return joined;
    }
    return messageText(message);
  }, [message]);

  const handleCopyUserText = () => {
    if (!pureText) return;
    void navigator.clipboard.writeText(pureText);
    setCopied(true);
    clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="group relative flex flex-col items-end my-1 gap-2 w-full max-w-[88%] sm:max-w-[78%]">
      {/* Attached Files display in Conversation History */}
      {fileParts.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 max-w-full">
          {fileParts.map((f, idx) => {
            const isImg =
              f.mediaType?.startsWith("image/") ||
              (typeof f.url === "string" && f.url.startsWith("data:image/"));
            const isPdf =
              f.mediaType === "application/pdf" || f.filename?.toLowerCase().endsWith(".pdf");
            const filename = f.filename || (isImg ? "Attached Image" : "Document");

            if (isImg) {
              return (
                <div
                  key={`${filename}-${idx}`}
                  onClick={() => setActivePreviewImage(f.url)}
                  className="group/img relative cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-black/60 shadow-lg transition-all hover:scale-[1.015] hover:border-cyan-400/60"
                  title="Click to view full image"
                >
                  <img
                    src={f.url}
                    alt={filename}
                    referrerPolicy="no-referrer"
                    className="max-h-52 max-w-xs object-cover rounded-2xl"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 text-left opacity-90 transition-opacity group-hover/img:opacity-100">
                    <p className="truncate text-xs font-medium text-white">{filename}</p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${filename}-${idx}`}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#171b26]/90 px-3.5 py-2.5 shadow-md text-left backdrop-blur-md max-w-full"
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs border shadow-inner",
                    isPdf
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
                  )}
                >
                  {isPdf ? "PDF" : "DOC"}
                </div>
                <div className="min-w-0 pr-1">
                  <p
                    className="truncate text-xs sm:text-[13px] font-medium text-white max-w-[200px]"
                    title={filename}
                  >
                    {filename}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {isPdf ? "PDF Document" : "Attached File"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Prompt Text Bubble with refined realistic glassmorphism */}
      {pureText && (
        <div className="realistic-user-bubble relative rounded-[22px] px-4.5 py-3 text-[15px] sm:text-[15.5px] leading-relaxed text-[#f4f6fb] whitespace-pre-wrap selection:bg-cyan-500/30 selection:text-white transition-all hover:border-white/25">
          {pureText}
          <button
            type="button"
            onClick={handleCopyUserText}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 text-xs cursor-pointer shadow-lg active:scale-95"
            title="Copy text"
          >
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
          </button>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {activePreviewImage && (
        <div
          onClick={() => setActivePreviewImage(null)}
          className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-in fade-in duration-200"
        >
          {/* Top Cancel/Action Bar */}
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0c101a]/95 backdrop-blur-md shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="font-semibold text-white">Attached Image Preview</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void downloadImageFile(activePreviewImage, `attached-image-${Date.now()}.png`)
                }
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-3 py-1.5 text-xs transition-colors cursor-pointer shadow-md"
              >
                <Download className="size-3.5" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewImage(null)}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="size-4" />
                <span>Close</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <img
              src={activePreviewImage}
              alt="Enlarged preview"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-[92vw] rounded-2xl border border-white/20 object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const AssistantMessage = memo(function AssistantMessage({
  message,
  isStreaming,
  isPlaying,
  onSpeak,
  onStopSpeak,
  onAllowLocation,
}: {
  message: UIMessage;
  isStreaming?: boolean;
  isPlaying?: boolean;
  onSpeak?: (id: string, text: string) => void;
  onStopSpeak?: () => void;
  onAllowLocation?: () => Promise<void> | void;
}) {
  const text = useMemo(() => messageText(message), [message]);
  const [copied, setCopied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copyTimeout.current), []);

  const isLocationRequest = useMemo(() => {
    return (
      text.includes("[ACTION:REQUEST_LOCATION]") ||
      (text.toLowerCase().includes("share live location") && text.toLowerCase().includes("gps"))
    );
  }, [text]);

  const mapsData = useMemo(() => {
    const match = text.match(/```(?:json:)?google_maps\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && (Array.isArray(parsed.places) || parsed.route)) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [text]);

  const cleanText = useMemo(() => {
    return text
      .replace(/```(?:json:)?google_maps[\s\S]*?```/gi, "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/\[ACTION:REQUEST_LOCATION\]/g, "")
      .trim();
  }, [text]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(cleanText);
    setCopied(true);
    clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1600);
  };

  const handleAllowLocationClick = async () => {
    if (!onAllowLocation || isLocating) return;
    setIsLocating(true);
    try {
      await onAllowLocation();
    } finally {
      setIsLocating(false);
    }
  };

  const handleToggleSpeak = () => {
    unlockAudio();
    if (isPlaying) {
      onStopSpeak?.();
    } else if (onSpeak) {
      onSpeak(message.id, cleanText);
    }
  };

  return (
    <div
      className={cn(
        "group relative w-full my-3 text-left transition-all duration-300 rounded-2xl",
        isStreaming && "border-l-2 border-cyan-400/80 pl-3.5 sm:pl-4 bg-cyan-500/[0.02]",
      )}
    >
      {/* Subtle identity kicker with realistic orb */}
      <div className="flex items-center gap-2 mb-2.5 select-none">
        <QuenchOrb className="size-6" glow={Boolean(isStreaming)} />
        <span className="text-[12.5px] font-semibold tracking-wide text-cyan-300/90">
          Bravura AI
        </span>
      </div>

      {cleanText ? (
        <div className="max-w-none text-[15px] sm:text-[15.5px] leading-[1.74] text-[#f0f3fa] selection:bg-cyan-500/25">
          <MarkdownRenderer content={cleanText} isStreaming={isStreaming} />
        </div>
      ) : mapsData ? null : (
        <div className="flex items-center gap-2 text-zinc-400 text-sm py-1">
          <Sparkles className="size-4 text-cyan-400 animate-spin" />
          <span>Generating response…</span>
          <span className="bravura-stream-caret" aria-label="Generating" />
        </div>
      )}

      {/* Render Google Maps UI widget without any code block */}
      {mapsData && (
        <div className="my-3.5">
          <GoogleMapsCards data={mapsData} />
        </div>
      )}

      {/* Interactive Mobile Location Permission Card */}
      {isLocationRequest && onAllowLocation && (
        <div className="my-3.5 overflow-hidden rounded-2xl border border-cyan-500/35 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-purple-950/20 p-4 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                <MapPin className="size-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Enable Mobile GPS Location</h4>
                <p className="text-xs text-zinc-300">
                  Tap below to allow your mobile browser to share your exact live GPS spot with
                  Bravura.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAllowLocationClick}
              disabled={isLocating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-4 py-2.5 text-xs font-bold text-black shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-70 disabled:scale-100"
            >
              {isLocating ? (
                <>
                  <Loader2 className="size-4 animate-spin text-black" />
                  <span>Reading Mobile GPS…</span>
                </>
              ) : (
                <>
                  <Crosshair className="size-4 text-black" />
                  <span>Share Live Location</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isPlaying && (
        <div className="mt-3.5 mb-1 max-w-sm animate-in fade-in zoom-in-95 duration-200">
          <RealtimeAudioVisualizer
            variant="bars"
            height={36}
            barCount={24}
            label="Live Voice Frequency"
            showLevel={true}
          />
        </div>
      )}

      {/* Bottom Action Controls with silky micro-interactions */}
      {text && (
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.07] transition-all duration-150 cursor-pointer active:scale-95"
            title="Copy response"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className={cn(copied && "text-emerald-400 font-medium")}>
              {copied ? "Copied" : "Copy"}
            </span>
          </button>

          {onSpeak && (
            <button
              type="button"
              onClick={handleToggleSpeak}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95",
                isPlaying
                  ? "bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 shadow-sm shadow-cyan-950/50"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.07]",
              )}
              title={isPlaying ? "Stop audio" : "Listen to response"}
              aria-label={isPlaying ? "Stop audio playback" : "Listen to response"}
            >
              {isPlaying ? (
                <>
                  <VolumeX className="size-3.5 text-cyan-300" />
                  <span>Stop</span>
                  <span className="flex items-center gap-0.5 ml-1" aria-hidden="true">
                    <span className="h-2 w-0.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="h-3.5 w-0.5 rounded-full bg-cyan-400 animate-pulse delay-75" />
                    <span className="h-2 w-0.5 rounded-full bg-cyan-400 animate-pulse delay-150" />
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="size-3.5 text-zinc-400" />
                  <span>Listen</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export const Thinking = BravuraTypingIndicator;
