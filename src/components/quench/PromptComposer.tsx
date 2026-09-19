import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  BrainCircuit,
  Paperclip,
  ArrowUp,
  Square,
  MessageSquare,
  PenLine,
  BarChart3,
  Code2,
  Image as ImageIcon,
  Camera,
  ChevronDown,
  Check,
  
} from "lucide-react";
import { AGENT_MODES, VISIBLE_MODES, type ModeId } from "@/lib/agent/modes";
import { cn } from "@/lib/utils";
import { MicButton } from "./MicButton";

const MODE_ICONS: Record<ModeId, typeof MessageSquare> = {
  chat: MessageSquare,
  research: Search,
  create: PenLine,
  analyze: BarChart3,
  code: Code2,
  image: ImageIcon,
};

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  deepThink,
  onToggleDeepThink,
  webSearch,
  onToggleWebSearch,
  onTranscribed,
  mode,
  onModeChange,
  busy,
  disabled,
  error,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (files?: File[]) => void;
  onStop: () => void;
  deepThink: boolean;
  onToggleDeepThink: () => void;
  webSearch: boolean;
  onToggleWebSearch: () => void;
   onTranscribed: (text: string) => void;
  mode?: ModeId;
  onModeChange?: (mode: ModeId) => void;
  busy: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!busy) ref.current?.focus();
  }, [busy]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const selectFiles = (selected: FileList | null) => {
    if (!selected) return;
    setFiles((current) => [...current, ...Array.from(selected)]);
  };

  const removeFile = (fileIndex: number) => {
    setFiles((current) => current.filter((_, index) => index !== fileIndex));
  };

  const submit = () => {
    onSubmit(files);
    setFiles([]);
  };

  const currentMode: ModeId = mode ?? "chat";
  const modesEnabled = typeof onModeChange === "function";
  const hasContent = value.trim().length > 0 || files.length > 0;
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "glass-panel rounded-2xl p-3 transition-shadow",
          busy && "glow-ring",
          error && "border-destructive/60",
        )}
      >
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {files.map((file, index) => (
              <button
                key={`${file.name}-${file.lastModified}-${index}`}
                type="button"
                onClick={() => removeFile(index)}
                className="border-border bg-card/60 text-muted-foreground hover:text-foreground max-w-full truncate rounded-full border px-2.5 py-1 text-xs"
                title="Remove attachment"
              >
                {file.name}
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask anything..."
          className="placeholder:text-muted-foreground max-h-[160px] w-full resize-none bg-transparent px-1 text-[15px] leading-snug outline-none disabled:opacity-60"
        />

        <div className="mt-2 flex items-center gap-1.5">
          {/* + button + menu — outside the scroll container */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={cn(
                "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/30 flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                menuOpen && "border-primary/60 text-primary",
              )}
              title="Add mode, file, or camera"
            >
              <Plus className="size-3.5" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute bottom-full left-0 z-50 mb-1.5 max-h-[55vh] w-52 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 p-1 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  background: "oklch(0.17 0.022 235 / 97%)",
                  backdropFilter: "blur(20px) saturate(140%)",
                  WebkitBackdropFilter: "blur(20px) saturate(140%)",
                }}
              >
                <p className="text-muted-foreground px-2 pt-1 pb-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  Mode
                </p>

                {VISIBLE_MODES.filter((id) => id !== "image").map((id) => {
                  const Icon = MODE_ICONS[id];
                  const active = currentMode === id;
                  const available = AGENT_MODES[id].available && modesEnabled;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="menuitem"
                      disabled={!available}
                      onClick={() => {
                        if (!available || !onModeChange) return;
                        onModeChange(id);
                        setMenuOpen(false);
                      }}
                      title={AGENT_MODES[id].hint}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
                        !available && "opacity-40",
                        active
                          ? "bg-primary/15 text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("size-3.5", active && "text-primary")} />
                      <span className="flex-1">{AGENT_MODES[id].label}</span>
                      {active && <Check className="text-primary size-3" />}
                    </button>
                  );
                })}

                <div className="bg-border/60 my-0.5 h-px" />

                <p className="text-muted-foreground px-2 pt-1 pb-0.5 text-[9px] font-semibold tracking-wider uppercase">
                  Attach
                </p>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors"
                >
                  <Paperclip className="size-3.5" />
                  <span className="flex-1">Attach file</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors"
                >
                  <Camera className="size-3.5" />
                  <span className="flex-1">Camera</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ComposerChip
              icon={Search}
              label="Search"
              active={webSearch}
              onClick={onToggleWebSearch}
            />
            <ComposerChip
              icon={BrainCircuit}
              label="Deep Think"
              active={deepThink}
              onClick={onToggleDeepThink}
            />
        
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown,text/csv,application/json"
            className="hidden"
            onChange={(event) => {
              selectFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              selectFiles(event.target.files);
              event.target.value = "";
            }}
          />

                   {busy ? (
            <button
              onClick={onStop}
              aria-label="Stop generating"
              className="bg-gradient-brand text-primary-foreground glow-ring flex size-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105"
            >
              <Square className="size-4 fill-current" />
            </button>
          ) : hasContent ? (
            <button
              onClick={submit}
              disabled={disabled}
              aria-label="Send message"
              className="bg-gradient-brand text-primary-foreground glow-ring flex size-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
            >
              <ArrowUp className="size-4" />
            </button>
          ) : (
            <MicButton onTranscribed={onTranscribed} disabled={disabled} />
          )}
        </div>
      </div>
    </div>
  );
}

function ComposerChip({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
            aria-pressed={
        label === "Deep Think" || label === "Search" ? active : undefined
      }
      className={cn(
        "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/30 flex shrink-0 items-center gap-1.5 rounded-full border transition-colors",
        active && "border-primary/60 bg-primary/10 text-primary",
        label ? "px-3 py-1.5 text-xs sm:text-sm" : "size-9 justify-center",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}