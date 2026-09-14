import { useEffect, useRef } from "react";
import { Plus, Search, BrainCircuit, Paperclip, ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  disabled,
  error,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!busy) ref.current?.focus();
  }, [busy]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "glass-panel rounded-3xl p-4 transition-shadow",
          busy && "glow-ring",
          error && "border-destructive/60",
        )}
      >
        <textarea
          ref={ref}
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Ask anything..."
          className="placeholder:text-muted-foreground max-h-[200px] w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed outline-none disabled:opacity-60"
        />

        <div className="mt-3 flex items-center gap-2">
          <ComposerChip icon={Plus} label="" />
          <ComposerChip icon={Search} label="Search" />
          <ComposerChip icon={BrainCircuit} label="Deep Think" />
          <ComposerChip icon={Paperclip} label="Attach" />

          <button
            onClick={busy ? onStop : onSubmit}
            disabled={!busy && (disabled || value.trim().length === 0)}
            aria-label={busy ? "Stop generating" : "Send message"}
            className="bg-gradient-brand text-primary-foreground glow-ring ml-auto flex size-12 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
          >
            {busy ? <Square className="size-4 fill-current" /> : <ArrowUp className="size-5" />}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive mt-2 px-2 text-sm" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-muted-foreground mt-2 px-2 text-xs">
          Enter to send · Shift + Enter for a new line
        </p>
      )}
    </div>
  );
}

function ComposerChip({
  icon: Icon,
  label,
}: {
  icon: typeof Plus;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center gap-2 rounded-full border transition-colors",
        label ? "hidden px-3.5 py-2 text-xs sm:flex sm:text-sm" : "size-10 justify-center",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
