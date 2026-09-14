import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";
import { QuenchOrb } from "./QuenchOrb";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { AgentState } from "./AgentStatus";

export function messageText(message: UIMessage): string {
  return message.parts
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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, state]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-6">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserMessage key={message.id} text={messageText(message)} />
        ) : (
          <AssistantMessage key={message.id} text={messageText(message)} />
        ),
      )}
      {state === "thinking" && <Thinking />}
      <div ref={endRef} />
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-primary/15 border-primary/25 max-w-[85%] rounded-3xl rounded-br-lg border px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}

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
