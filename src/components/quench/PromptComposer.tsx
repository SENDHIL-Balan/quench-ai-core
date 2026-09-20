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
  ListChecks,
  Code2,
  Image as ImageIcon,
  Camera,
  Check,
  X,
  Sparkles,
  FileText,
} from "lucide-react";
import { AGENT_MODES, VISIBLE_MODES, type ModeId } from "@/lib/agent/modes";
import { cn } from "@/lib/utils";
import { MicButton } from "./MicButton";
import { LiveVoiceAgentButton } from "./LiveVoiceAgentButton";

const MODE_ICONS: Record<ModeId, typeof MessageSquare> = {
  chat: MessageSquare,
  research: Search,
  create: PenLine,
  plan: ListChecks,
  analyze: BarChart3,
  code: Code2,
  image: ImageIcon,
};

const PHRASES = [
  "Ask Bravura AI anything...",
  "Ask me to write code, debug, or analyze data...",
  "What can I help you build today?",
  "Ask Bravura AI anything...",
];

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
  onOpenImageStudio,
  onOpenPdfStudio,
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
  onOpenImageStudio?: () => void;
  onOpenPdfStudio?: () => void;
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

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(80);

  useEffect(() => {
    if (value) {
      setDisplayedPlaceholder("Ask Bravura AI anything...");
      return;
    }
    const currentPhrase = PHRASES[placeholderIndex];
    const handleTyping = () => {
      if (!isDeleting) {
        const nextText = currentPhrase.substring(0, displayedPlaceholder.length + 1);
        setDisplayedPlaceholder(nextText);
        if (nextText === currentPhrase) {
          setTimeout(() => setIsDeleting(true), 2200);
          setTypingSpeed(40);
        }
      } else {
        const nextText = currentPhrase.substring(0, displayedPlaceholder.length - 1);
        setDisplayedPlaceholder(nextText);
        if (nextText === "") {
          setIsDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % PHRASES.length);
          setTypingSpeed(90);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayedPlaceholder, isDeleting, placeholderIndex, typingSpeed, value]);

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
    <div
      className={cn(
        "w-full max-w-full min-w-0 shrink-0 relative",
        menuOpen ? "z-50" : "z-30",
        className,
      )}
    >
      <div
        className={cn(
          "glass-panel relative flex flex-col rounded-2xl sm:rounded-3xl border border-white/10 p-2.5 sm:p-3.5 transition-all shadow-2xl backdrop-blur-2xl w-full max-w-full min-w-0",
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

        {/* Full-width Prompt Input Textarea - Spans all the way to the edge like Google AI Studio */}
        <div className="w-full min-w-0 px-1 py-1">
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
            placeholder={displayedPlaceholder || "Ask Bravura AI anything..."}
            className="placeholder:text-muted-foreground min-h-[44px] max-h-[180px] w-full resize-none bg-transparent px-1.5 py-1 text-base sm:text-[15px] leading-relaxed outline-none disabled:opacity-60 text-foreground [scrollbar-width:thin]"
          />
        </div>

        {/* Bottom Actions Row matching Google AI Studio */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 w-full min-w-0">
          {/* Left Action Controls (+ menu, mode chip, search, think) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
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
                  "border-border bg-card/60 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:border-primary/40 flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer",
                  menuOpen && "border-cyan-400/60 text-cyan-600 dark:text-cyan-300",
                )}
                title="Add mode, file, or camera"
              >
                <Plus className="size-4" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 z-50 mb-2 max-h-[60vh] w-56 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover text-popover-foreground p-1.5 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                            ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-3.5",
                            active ? "text-cyan-700 dark:text-cyan-400" : "text-muted-foreground",
                          )}
                        />
                        <span className="flex-1">{AGENT_MODES[id].label}</span>
                        {active && <Check className="text-cyan-600 dark:text-cyan-400 size-3" />}
                      </button>
                    );
                  })}

                  <div className="my-1 border-t border-border" />

                  {onOpenImageStudio && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenImageStudio();
                      }}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]"
                    >
                      <Sparkles className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="flex-1">AI Image Studio</span>
                    </button>
                  )}

                  {onOpenPdfStudio && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenPdfStudio();
                      }}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]"
                    >
                      <FileText className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="flex-1">AI PDF Document Studio</span>
                    </button>
                  )}

                  {(onOpenImageStudio || onOpenPdfStudio) && (
                    <div className="my-1 border-t border-border" />
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]"
                  >
                    <Paperclip className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="flex-1">Upload File or Image</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      cameraInputRef.current?.click();
                    }}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]"
                  >
                    <Camera className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="flex-1">Camera Capture</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Mode Chip (Styled like DeepThink when selected) */}
            {currentMode !== "chat" && (
              <div
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all cursor-pointer shrink-0 select-none",
                  "border-cyan-500/60 bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 font-medium shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:bg-cyan-500/30",
                )}
                title={`Active Mode: ${AGENT_MODES[currentMode]?.label || currentMode}. Click to switch, or × to clear.`}
              >
                {(() => {
                  const ActiveIcon = MODE_ICONS[currentMode] || MessageSquare;
                  return (
                    <ActiveIcon className="size-3.5 shrink-0 text-cyan-700 dark:text-cyan-300" />
                  );
                })()}
                <span className="truncate max-w-[80px] sm:max-w-none">
                  {AGENT_MODES[currentMode]?.label || currentMode}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onModeChange?.("chat");
                  }}
                  className="hover:text-foreground p-0.5 ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 text-cyan-700 dark:text-cyan-300 transition-colors cursor-pointer"
                  title="Reset mode to default"
                  aria-label="Reset mode to default"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            {/* Search Chip */}
            <button
              type="button"
              onClick={onToggleWebSearch}
              aria-pressed={webSearch}
              title={
                webSearch ? "Real-Time Search Active (Live Web Data)" : "Enable Real-Time Search"
              }
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer",
                webSearch
                  ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 font-medium shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "border-border bg-card/60 dark:bg-white/5 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Search
                className={cn(
                  "size-3.5 shrink-0",
                  webSearch ? "text-cyan-700 dark:text-cyan-300" : "text-muted-foreground",
                )}
              />
              <span>Search</span>
              {webSearch && <span className="size-1.5 rounded-full bg-cyan-500 animate-pulse" />}
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
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer sm:gap-1.5",
                deepThink
                  ? "border-purple-500/60 bg-purple-500/20 text-purple-900 dark:text-purple-200 font-medium shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                  : "border-border bg-card/60 dark:bg-white/5 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Brain
                className={cn(
                  "size-3.5 shrink-0",
                  deepThink ? "text-purple-700 dark:text-purple-300" : "text-muted-foreground",
                )}
              />
              <span className="hidden sm:inline">Think</span>
            </button>
          </div>

          {/* Right Action Controls:
              - When there is text/files or busy: show only Send / Stop button. Voice & transcribe buttons are gone.
              - When empty: show only transcribe (MicButton) and voice agent (LiveVoiceAgentButton). No send button.
          */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {busy ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                className="bg-cyan-500 text-black flex size-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer shadow-md shadow-cyan-500/30 animate-in fade-in zoom-in-90 duration-150"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            ) : hasContent ? (
              <button
                type="button"
                onClick={submit}
                disabled={disabled}
                aria-label="Send message"
                className="bg-gradient-to-tr from-cyan-500 to-emerald-400 text-black flex size-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40 cursor-pointer shadow-md shadow-cyan-500/25 animate-in fade-in zoom-in-90 duration-150"
              >
                <ArrowUp className="size-4 stroke-[2.5]" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 animate-in fade-in zoom-in-90 duration-150">
                {/* Voice to Text (transcribe button) */}
                <MicButton onTranscribed={onTranscribed} disabled={disabled} />

                {/* Live Voice Agent button */}
                {onOpenLiveVoice && (
                  <LiveVoiceAgentButton
                    onClick={onOpenLiveVoice}
                    disabled={disabled}
                    isActive={isLiveVoiceActive}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-destructive mt-2 px-2 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
