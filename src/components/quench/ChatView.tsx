import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy, Volume2, VolumeX } from "lucide-react";
import { QuenchOrb } from "./QuenchOrb";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { AgentState } from "./AgentStatus";
import { BravuraTypingIndicator } from "./BravuraTypingIndicator";
import { cn } from "@/lib/utils";

export { BravuraTypingIndicator };

export function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "file") return `Attached file: ${part.filename ?? "document"}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
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
  const text = useMemo(() => messageText(message), [message]);

  return (
    <div className="flex justify-end my-1">
      <div className="max-w-[85%] sm:max-w-[70%] rounded-[22px] bg-[#242630] border border-white/10 px-4 py-2 sm:py-2.5 text-[15px] leading-relaxed text-[#f4f4f6] shadow-sm whitespace-pre-wrap">
        {text}
      </div>
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
                "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors cursor-pointer",
                isPlaying
                  ? "text-cyan-300 font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-white/5",
              )}
              title={isPlaying ? "Stop audio" : "Listen"}
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
                  <Volume2 className="size-3.5" />
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
