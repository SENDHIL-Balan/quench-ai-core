<<<<<<< HEAD
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";
=======
import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";
import { QuenchOrb } from "./QuenchOrb";
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { AgentState } from "./AgentStatus";

export function messageText(message: UIMessage): string {
  return message.parts
<<<<<<< HEAD
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "file") return `Attached file: ${part.filename ?? "document"}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

const THINKING_DOTS = [0, 1, 2];

export function ChatView({ messages, state }: { messages: UIMessage[]; state: AgentState }) {
=======
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export function ChatView({
  messages,
  state,
}: {
  messages: UIMessage[];
  state: AgentState;
}) {
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, state]);

  return (
<<<<<<< HEAD
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-6">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <AssistantMessage key={message.id} message={message} />
=======
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-6">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserMessage key={message.id} text={messageText(message)} />
        ) : (
          <AssistantMessage key={message.id} text={messageText(message)} />
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
        ),
      )}
      {state === "thinking" && <Thinking />}
      <div ref={endRef} />
    </div>
  );
}

<<<<<<< HEAD
function UserMessage({ message }: { message: UIMessage }) {
  const text = useMemo(() => messageText(message), [message]);

  return (
    <div className="flex justify-end">
      <div className="bg-primary/90 text-primary-foreground max-w-[80%] rounded-[22px] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
=======
function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-primary/15 border-primary/25 max-w-[85%] rounded-3xl rounded-br-lg border px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
        {text}
      </div>
    </div>
  );
}

<<<<<<< HEAD
const AssistantMessage = memo(function AssistantMessage({ message }: { message: UIMessage }) {
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

  return (
    <div className="group min-w-0">
      {text ? (
        <div className="max-w-none overflow-x-auto text-[15px] leading-relaxed [&_table]:min-w-max">
          <MarkdownRenderer content={text} />
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">Generating…</span>
      )}

      {text && (
        <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
});

function Thinking() {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-muted-foreground text-sm">Thinking</span>
      {THINKING_DOTS.map((i) => (
        <span
          key={i}
          className="bg-primary size-1.5 rounded-full"
          style={{ animation: `quench-pulse 1.2s ${i * 0.18}s ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}
=======
function AssistantMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="group flex gap-3">
      <QuenchOrb className="mt-1 size-8" />
      <div className="glass-panel min-w-0 flex-1 rounded-3xl rounded-tl-lg px-4 py-3.5">
        <p className="text-muted-foreground mb-1.5 text-xs font-medium">
          Quench <span className="text-gradient-brand">AI</span>
        </p>
        {text ? (
          <MarkdownRenderer content={text} />
        ) : (
          <span className="text-muted-foreground text-sm">Generating…</span>
        )}
        {text && (
          <div className="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => {
                void navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-3">
      <QuenchOrb className="size-8" />
      <div className="glass-panel flex items-center gap-2 rounded-2xl px-4 py-3">
        <span className="text-muted-foreground text-sm">Thinking</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="bg-primary size-1.5 rounded-full"
            style={{ animation: `quench-pulse 1.2s ${i * 0.18}s ease-in-out infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
