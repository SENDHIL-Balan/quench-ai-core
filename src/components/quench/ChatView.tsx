import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy, Volume2, VolumeX, FileText, Image as ImageIcon, X } from "lucide-react";
import { QuenchOrb } from "./QuenchOrb";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { AgentState } from "./AgentStatus";
import { BravuraTypingIndicator } from "./BravuraTypingIndicator";
import { RealtimeAudioVisualizer } from "./RealtimeAudioVisualizer";
import { unlockAudio } from "@/lib/voice/player";
import { cn } from "@/lib/utils";

export { BravuraTypingIndicator };

export function messageText(message: UIMessage): string {
  if (!message) return "";
  const anyMsg = message as unknown as {
    content?: string;
    text?: string;
    parts?: Array<{ type: string; text?: string; filename?: string }>;
  };

  if (Array.isArray(anyMsg.parts) && anyMsg.parts.length > 0) {
    const extracted = anyMsg.parts
      .map((part) => {
        if (part.type === "text" && typeof part.text === "string") return part.text;
        if (part.type === "file") return `Attached file: ${part.filename ?? "document"}`;
        return "";
      })
      .filter(Boolean)
      .join("\n\n")
      .trim();
    if (extracted) return extracted;
  }

  if (typeof anyMsg.content === "string" && anyMsg.content.trim()) {
    return anyMsg.content.trim();
  }

  if (typeof anyMsg.text === "string" && anyMsg.text.trim()) {
    return anyMsg.text.trim();
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
}: {
  messages: UIMessage[];
  state: AgentState;
  playingId?: string | null;
  isSpeaking?: boolean;
  onSpeak?: (id: string, text: string) => void;
  onStopSpeak?: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  const hasPendingEmptyAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    !messageText(messages[messages.length - 1]);

  const displayMessages = hasPendingEmptyAssistant ? messages.slice(0, -1) : messages;
  const isWaiting = state === "thinking" || hasPendingEmptyAssistant;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-2 py-4 sm:px-4">
      {displayMessages.map((message) =>
        message.role === "user" ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <AssistantMessage
            key={message.id}
            message={message}
            isPlaying={playingId === message.id && Boolean(isSpeaking)}
            onSpeak={onSpeak}
            onStopSpeak={onStopSpeak}
          />
        ),
      )}
      {isWaiting && (
        <div className="py-2">
          <BravuraTypingIndicator />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  const fileParts = useMemo(() => {
    if (!Array.isArray(message.parts)) return [];
    return message.parts.filter(
      (p): p is Extract<(typeof message.parts)[number], { type: "file" }> => p.type === "file",
    );
  }, [message]);

  const pureText = useMemo(() => {
    if (!Array.isArray(message.parts) || message.parts.length === 0) {
      return messageText(message);
    }
    const textParts = message.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text);
    return textParts.join("\n\n").trim();
  }, [message]);

  return (
    <div className="flex flex-col items-end my-1 gap-1.5 w-full">
      {/* Attached Files display in Conversation History */}
      {fileParts.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 max-w-[85%] sm:max-w-[70%]">
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
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-black/60 shadow-md transition-all hover:scale-[1.01] hover:border-cyan-400/60"
                  title="Click to view full image"
                >
                  <img
                    src={f.url}
                    alt={filename}
                    className="max-h-48 max-w-xs object-cover rounded-2xl"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-left opacity-90 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs font-medium text-white">{filename}</p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${filename}-${idx}`}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#1b1e2a] px-3.5 py-2.5 shadow-sm text-left max-w-full"
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs border shadow-inner",
                    isPdf
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
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

      {/* User Prompt Text */}
      {pureText && (
        <div className="max-w-[85%] sm:max-w-[70%] rounded-[22px] bg-[#242630] border border-white/10 px-4 py-2 sm:py-2.5 text-[15px] leading-relaxed text-[#f4f4f6] shadow-sm whitespace-pre-wrap">
          {pureText}
        </div>
      )}

      {/* Image Preview Lightbox */}
      {activePreviewImage && (
        <div
          onClick={() => setActivePreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={activePreviewImage}
              alt="Enlarged preview"
              className="max-h-[85vh] max-w-[85vw] rounded-2xl border border-white/20 object-contain shadow-2xl"
            />
            <button
              onClick={() => setActivePreviewImage(null)}
              className="absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full bg-zinc-800 text-white border border-white/20 hover:bg-zinc-700 shadow-lg cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const AssistantMessage = memo(function AssistantMessage({
  message,
  isPlaying,
  onSpeak,
  onStopSpeak,
}: {
  message: UIMessage;
  isPlaying?: boolean;
  onSpeak?: (id: string, text: string) => void;
  onStopSpeak?: () => void;
}) {
  const text = useMemo(() => messageText(message), [message]);
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copyTimeout.current), []);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1600);
  };

  const handleToggleSpeak = () => {
    // Synchronously unlock browser audio hardware on direct user gesture
    unlockAudio();
    if (isPlaying) {
      onStopSpeak?.();
    } else if (onSpeak) {
      onSpeak(message.id, text);
    }
  };

  return (
    <div className="group relative w-full my-1.5 text-left">
      {text ? (
        <div className="max-w-none text-[15px] sm:text-[15.5px] leading-[1.65] text-[#ececf1]">
          <MarkdownRenderer content={text} />
        </div>
      ) : (
        <span className="text-zinc-400 text-sm">Generating…</span>
      )}
      {isPlaying && (
        <div className="mt-3 mb-1 max-w-sm animate-in fade-in zoom-in-95 duration-200">
          <RealtimeAudioVisualizer
            variant="bars"
            height={36}
            barCount={24}
            label="Live Voice Frequency"
            showLevel={true}
          />
        </div>
      )}
      {text && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-400">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          {onSpeak && (
            <button
              type="button"
              onClick={handleToggleSpeak}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95",
                isPlaying
                  ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm shadow-cyan-950/50"
                  : "bg-white/[0.04] border border-white/5 text-zinc-300 hover:text-white hover:bg-white/10",
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
