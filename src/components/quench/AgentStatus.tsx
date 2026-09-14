import { Activity, AlertTriangle, CheckCircle2, Loader2, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENT_MODES, type ModeId } from "@/lib/agent/modes";

export type AgentState = "idle" | "thinking" | "generating" | "complete" | "error";

const STATE_META: Record<
  AgentState,
  { label: string; detail: string; icon: typeof Activity; tone: string }
> = {
  idle: {
    label: "Idle",
    detail: "Waiting for your prompt",
    icon: Sparkle,
    tone: "text-muted-foreground",
  },
  thinking: {
    label: "Thinking",
    detail: "Understanding your request…",
    icon: Loader2,
    tone: "text-quench-cyan",
  },
  generating: {
    label: "Generating",
    detail: "Streaming the response…",
    icon: Loader2,
    tone: "text-quench-green",
  },
  complete: {
    label: "Complete",
    detail: "Response delivered",
    icon: CheckCircle2,
    tone: "text-quench-green",
  },
  error: {
    label: "Error",
    detail: "The run did not finish",
    icon: AlertTriangle,
    tone: "text-destructive",
  },
};

/** Real lifecycle of the current request — no simulated steps. */
const SEQUENCE: AgentState[] = ["thinking", "generating", "complete"];

export function AgentRunCard({
  state,
  mode,
  errorMessage,
}: {
  state: AgentState;
  mode: ModeId;
  errorMessage?: string | null;
}) {
  const activeIndex = SEQUENCE.indexOf(state);

  return (
    <section className="glass-panel rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Current Agent Run</h2>
        <span className="text-muted-foreground text-xs">{AGENT_MODES[mode].label}</span>
      </div>

      <ol className="space-y-3">
        {SEQUENCE.map((step, i) => {
          const meta = STATE_META[step];
          const Icon = meta.icon;
          const isActive = state === step;
          const isDone = activeIndex > i || state === "complete";
          return (
            <li key={step} className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border",
                  isActive
                    ? "border-primary/50 bg-primary/15 glow-ring"
                    : isDone
                      ? "border-primary/25 bg-primary/10"
                      : "border-border bg-card/60",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    isActive || isDone ? meta.tone : "text-muted-foreground",
                    isActive && step !== "complete" && "animate-spin",
                  )}
                />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    isActive || isDone ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {meta.label}
                </span>
                <span className="text-muted-foreground block text-xs">{meta.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {state === "error" && (
        <p className="text-destructive border-destructive/40 bg-destructive/10 mt-3 rounded-xl border px-3 py-2 text-xs">
          {errorMessage ?? "Something went wrong."}
        </p>
      )}
      {state === "idle" && (
        <p className="text-muted-foreground mt-3 text-xs">
          Idle — planning, tools and review steps appear here as the agent grows.
        </p>
      )}
    </section>
  );
}

export function AgentOnlineCard({ state }: { state: AgentState }) {
  const meta = STATE_META[state];
  const live = state === "thinking" || state === "generating";

  return (
    <section className="glass-panel flex items-center gap-3 rounded-3xl p-4">
      <span className="relative flex size-9 items-center justify-center">
        <span
          className={cn(
            "bg-quench-green absolute size-9 rounded-full opacity-25",
            live && "animate-ping",
          )}
        />
        <span className="bg-gradient-brand relative size-4 rounded-full" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">
          AI {state === "error" ? "Offline" : "Online"}
        </span>
        <span className="text-muted-foreground block text-xs">
          {state === "idle" ? "Ready to assist you" : meta.detail}
        </span>
      </span>
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {[10, 16, 22, 14, 8].map((h, i) => (
          <span
            key={i}
            className="bg-gradient-brand w-1 rounded-full"
            style={{
              height: h,
              animation: live ? `quench-pulse ${0.8 + i * 0.12}s ease-in-out infinite` : undefined,
              opacity: live ? 1 : 0.5,
            }}
          />
        ))}
      </span>
    </section>
  );
}
