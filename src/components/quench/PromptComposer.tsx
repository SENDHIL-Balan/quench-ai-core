import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Brain,
  Paperclip,
  ArrowUp,
  Square,
  MessageSquare,
  PenLine,
  BarChart3,
  Code2,
  Image as ImageIcon,
  Camera,
  Check,
  X,
} from "lucide-react";
import { AGENT_MODES, VISIBLE_MODES, type ModeId } from "@/lib/agent/modes";
import { cn } from "@/lib/utils";
import { MicButton } from "./MicButton";
import { LiveVoiceAgentButton } from "./LiveVoiceAgentButton";

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
  onOpenLiveVoice,
  isLiveVoiceActive,
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
  onOpenLiveVoice?: () => void;
  isLiveVoiceActive?: boolean;
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

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  const currentMode: ModeId = mode ?? "chat";
  const modesEnabled = typeof onModeChange === "function";
  const hasContent = value.trim().length > 0 || files.length > 0;

  return (
    <div className={cn("w-full shrink-0 relative z-10", className)}>
      <div
        className={cn(
          "glass-panel relative flex flex-col rounded-3xl border border-white/10 p-2 sm:px-3 sm:py-2.5 transition-all shadow-2xl backdrop-blur-2xl",
          busy && "ring-1 ring-cyan-500/50",
          error && "border-destructive/60",
        )}
      >
        {/* Attached files row */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5 px-1 pt-1">
            {files.map((file, index) => (
              <button
                key={`${file.name}-${file.lastModified}-${index}`}
                type="button"
                onClick={() => removeFile(index)}
                className="border-border bg-card/60 text-muted-foreground hover:text-foreground flex max-w-full items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <Paperclip className="size-3 shrink-0" />
                <span className="truncate">{file.name}</span>
                <X className="size-3" />
              </button>
            ))}
          </div>
        )}

        {/* Horizontal Input Capsule Row matching previous design */}
        <div className="flex items-center gap-2">
          {/* + Button & Dropdown Menu */}
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
                "border-border bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20 flex size-10 sm:size-9 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer",
                menuOpen && "border-cyan-400/60 text-cyan-300",
              )}
              title="Add mode, file, or camera"
            >
              <Plus className="size-4" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute bottom-full left-0 z-50 mb-2 max-h-[60vh] w-56 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#0c1322]/95 p-1.5 shadow-2xl backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <p className="text-muted-foreground px-2 pt-1 pb-1 text-[10px] font-semibold tracking-wider uppercase">
                  Bravura Mode
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
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]",
                        !available && "opacity-40 cursor-not-allowed",
                        active
                          ? "bg-cyan-500/20 text-cyan-300 font-medium"
                          : "text-muted-foreground hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className={cn("size-3.5", active && "text-cyan-400")} />
                      <span className="flex-1">{AGENT_MODES[id].label}</span>
                      {active && <Check className="text-cyan-400 size-3" />}
                    </button>
                  );
                })}

                <div className="my-1 border-t border-white/10" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="text-muted-foreground hover:bg-white/5 hover:text-white flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]"
                >
                  <Paperclip className="size-3.5 text-cyan-400" />
                  <span className="flex-1">Upload File or Image</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  className="text-muted-foreground hover:bg-white/5 hover:text-white flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]"
                >
                  <Camera className="size-3.5 text-emerald-400" />
                  <span className="flex-1">Camera Capture</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden File and Camera inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown,text/csv,application/json"
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

          {/* Central Input Textarea */}
          <div className="flex-1 min-w-0 flex items-center">
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
              className="placeholder:text-white/40 max-h-[140px] w-full resize-none bg-transparent px-1.5 py-1 text-base sm:text-[15px] leading-snug outline-none disabled:opacity-60 text-white"
            />
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Search Chip */}
            <button
              type="button"
              onClick={onToggleWebSearch}
              aria-pressed={webSearch}
              title={webSearch ? "Web Search Active" : "Enable Web Search"}
              className={cn(
                "hidden md:flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer",
                webSearch
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-medium"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
              )}
            >
              <Search className="size-3" />
              <span>Search</span>
            </button>

            {/* Think Chip (Brain icon + Think) */}
            <button
              type="button"
              onClick={onToggleDeepThink}
              aria-pressed={deepThink}
              title={
                deepThink
                  ? "Deep Think Active (Multi-step Reasoning)"
                  : "Enable Deep Think reasoning"
              }
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors cursor-pointer sm:gap-1.5 sm:px-2.5",
                deepThink
                  ? "border-purple-500/60 bg-purple-500/20 text-purple-200 font-medium shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
              )}
            >
              <Brain
                className={cn(
                  "size-3.5 shrink-0",
                  deepThink ? "text-purple-300" : "text-muted-foreground",
                )}
              />
              <span className="hidden sm:inline">Think</span>
            </button>

            {/* Voice to Text (MicButton) */}
            <MicButton onTranscribed={onTranscribed} disabled={disabled || busy} />

            {/* Send / Stop button when active */}
            {busy ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                className="bg-cyan-500 text-black flex size-10 sm:size-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer shadow-md shadow-cyan-500/30"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            ) : hasContent ? (
              <button
                type="button"
                onClick={submit}
                disabled={disabled}
                aria-label="Send message"
                className="bg-gradient-to-tr from-cyan-500 to-emerald-400 text-black flex size-10 sm:size-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40 cursor-pointer shadow-md shadow-cyan-500/25"
              >
                <ArrowUp className="size-4 stroke-[2.5]" />
              </button>
            ) : null}

            {/* Live Voice Agent button to talk in live */}
            {onOpenLiveVoice && (
              <LiveVoiceAgentButton
                onClick={onOpenLiveVoice}
                disabled={disabled}
                isActive={isLiveVoiceActive}
              />
            )}
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-destructive mt-2 px-2 text-sm" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-muted-foreground mt-2 px-2 text-[11px]">
          Enter to send · Shift + Enter for newline · Tap{" "}
          <span className="text-cyan-400 font-medium">blue orb</span> to talk in live
        </p>
      )}
    </div>
  );
}
