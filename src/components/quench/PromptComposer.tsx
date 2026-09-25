import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
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
  Upload,
} from "lucide-react";
import { AGENT_MODES, VISIBLE_MODES, type ModeId } from "@/lib/agent/modes";
import { cn } from "@/lib/utils";
import { MicButton } from "./MicButton";
import { LiveVoiceAgentButton } from "./LiveVoiceAgentButton";
import { ModelSelector, type SupportedModelId } from "./ModelSelector";
import { AttachmentComposer, type AttachmentComposerItem } from "./AttachmentComposer";
import {
  formatFileSize,
  detectMediaType,
  getFileCategory,
  validateAttachment,
} from "@/lib/attachments/attachment-types";

export type ComposerAttachmentItem = AttachmentComposerItem;

const MODE_ICONS: Record<ModeId, typeof MessageSquare> = {
  chat: MessageSquare,
  research: Search,
  create: PenLine,
  plan: ListChecks,
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
  onOpenImageStudio,
  onOpenPdfStudio,
  mode,
  onModeChange,
  selectedModel,
  onSelectModel,
  busy,
  disabled,
  error,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (files?: File[]) => void;
  onStop: () => void;
  deepThink?: boolean;
  onToggleDeepThink?: () => void;
  webSearch?: boolean;
  onToggleWebSearch?: () => void;
  onTranscribed: (text: string) => void;
  onOpenLiveVoice?: () => void;
  isLiveVoiceActive?: boolean;
  onOpenImageStudio?: () => void;
  onOpenPdfStudio?: () => void;
  mode?: ModeId;
  onModeChange?: (mode: ModeId) => void;
  selectedModel?: SupportedModelId;
  onSelectModel?: (model: SupportedModelId) => void;
  busy: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [attachments, setAttachments] = useState<ComposerAttachmentItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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

  const addFiles = (selected: FileList | File[] | null) => {
    if (!selected) return;
    const array = Array.from(selected);
    if (array.length === 0) return;

    const newItems: ComposerAttachmentItem[] = array.map((file) => {
      const mediaType = detectMediaType(file);
      const { isImage, isPdf, isTextDoc, badge } = getFileCategory(mediaType, file.name);
      const isImg = isImage || file.type.startsWith("image/");
      const previewUrl = isImg ? URL.createObjectURL(file) : "";
      const validation = validateAttachment(file);

      return {
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        mediaType,
        previewUrl,
        isImage: isImg,
        isPdf,
        isTextDoc,
        badge,
        status: validation.valid ? "uploading" : "error",
        errorMessage: validation.error,
      };
    });

    setAttachments((current) => [...current, ...newItems]);

    // Simulated quick async upload/ready transition
    setTimeout(() => {
      setAttachments((current) =>
        current.map((item) => (item.status === "uploading" ? { ...item, status: "ready" } : item)),
      );
    }, 350);
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const target = current.find((a) => a.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((a) => a.id !== id);
    });
  };

  const submit = () => {
    const readyFiles = attachments
      .filter((a) => a.status === "ready" || a.status === "uploading")
      .map((a) => a.file);

    onSubmit(readyFiles);

    for (const item of attachments) {
      if (item.previewUrl && item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
    setAttachments([]);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  // Clipboard paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      addFiles(e.clipboardData.files);
    }
  };

  const currentMode: ModeId = mode ?? "chat";
  const modesEnabled = typeof onModeChange === "function";
  const hasContent = value.length > 0 || attachments.length > 0;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "w-full max-w-full min-w-0 shrink-0 relative",
        menuOpen ? "z-50" : "z-30",
        className,
      )}
    >
      <motion.div
        layout
        transition={{
          layout: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
        }}
        animate={{
          borderColor: isDragging
            ? "rgba(6, 182, 212, 0.85)"
            : hasContent
              ? "rgba(6, 182, 212, 0.35)"
              : "rgba(255, 255, 255, 0.1)",
          boxShadow: isDragging
            ? "0 0 40px rgba(6,182,212,0.35), inset 0 0 25px rgba(6,182,212,0.15)"
            : hasContent
              ? "0 10px 35px rgba(6,182,212,0.12), inset 0 0 16px rgba(6,182,212,0.03)"
              : "0 10px 30px rgba(0,0,0,0.35)",
        }}
        className={cn(
          "glass-panel relative flex flex-col rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3.5 backdrop-blur-2xl w-full max-w-full min-w-0 transition-colors duration-200",
          isDragging && "ring-2 ring-cyan-400 bg-cyan-950/20",
          busy && "ring-1 ring-cyan-500/50",
          error && "border-destructive/60",
        )}
      >
        {/* Drag and Drop Active Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl bg-black/80 backdrop-blur-md border-2 border-dashed border-cyan-400/80 p-4 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <Upload className="size-10 text-cyan-400 animate-bounce mb-2" />
            <p className="text-base font-semibold text-white">Drop files to attach</p>
            <p className="text-xs text-cyan-200/80 mt-1">
              Images (PNG, JPG, WEBP) & Documents (PDF, TXT, CSV, DOCX)
            </p>
          </div>
        )}

        {/* AttachmentComposer Component rendering visual previews for images and file cards for PDFs */}
        <AttachmentComposer
          attachments={attachments}
          onRemove={removeAttachment}
          disabled={busy || disabled}
        />

        {/* Hidden File and Camera inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.csv,.json,.docx,.xlsx,.pptx,application/pdf,text/plain,text/markdown,text/csv,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
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
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {/* Full-width Prompt Input Textarea */}
        <div className="w-full min-w-0 px-1 py-1">
          <textarea
            ref={ref}
            rows={1}
            value={value}
            disabled={disabled}
            onPaste={handlePaste}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              attachments.length > 0
                ? "Ask a question about the attached file(s)..."
                : "Ask Bravura AI anything..."
            }
            className="placeholder:text-white/40 min-h-[44px] max-h-[180px] w-full resize-none bg-transparent px-1.5 py-1 text-base sm:text-[15px] leading-relaxed outline-none disabled:opacity-60 text-white [scrollbar-width:thin] transition-[height] duration-200 ease-out"
          />
        </div>

        {/* Bottom Actions Row matching Google AI Studio */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 w-full min-w-0">
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
                  "border-border bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20 flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer",
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
                  className="absolute bottom-full left-0 z-50 mb-2 max-h-[60vh] w-56 overflow-y-auto overscroll-contain rounded-2xl border border-white/20 bg-[#0c1322] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

                  {onOpenImageStudio && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenImageStudio();
                      }}
                      className="text-muted-foreground hover:bg-white/5 hover:text-white flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]"
                    >
                      <Sparkles className="size-3.5 text-cyan-400" />
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
                      className="text-muted-foreground hover:bg-white/5 hover:text-white flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer min-h-[38px]"
                    >
                      <FileText className="size-3.5 text-emerald-400" />
                      <span className="flex-1">AI PDF Document Studio</span>
                    </button>
                  )}

                  {(onOpenImageStudio || onOpenPdfStudio) && (
                    <div className="my-1 border-t border-white/10" />
                  )}

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

            {/* Direct Paperclip Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-border bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20 flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer"
              title="Attach File or Image"
            >
              <Paperclip className="size-4" />
            </button>

            {/* Active Mode Chip (Styled like DeepThink when selected) */}
            {currentMode !== "chat" && (
              <div
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all cursor-pointer shrink-0 select-none",
                  "border-cyan-500/60 bg-cyan-500/20 text-cyan-200 font-medium shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:bg-cyan-500/30",
                )}
                title={`Active Mode: ${AGENT_MODES[currentMode]?.label || currentMode}. Click to switch, or × to clear.`}
              >
                {(() => {
                  const ActiveIcon = MODE_ICONS[currentMode] || MessageSquare;
                  return <ActiveIcon className="size-3.5 shrink-0 text-cyan-300" />;
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
                  className="hover:text-white p-0.5 ml-0.5 rounded-full hover:bg-white/20 text-cyan-300 transition-colors cursor-pointer"
                  title="Reset mode to default"
                  aria-label="Reset mode to default"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            {/* LLM Model Option Chip (Replacing search & think toggles right in the chat action bar) */}
            {selectedModel && onSelectModel && (
              <ModelSelector
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                direction="up"
              />
            )}
          </div>

          {/* Right Action Controls: If chatbox has letter/content, ONLY send button is shown; if empty, ONLY voice agent & transcribe are shown */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-h-[36px]">
            <AnimatePresence mode="wait" initial={false}>
              {busy ? (
                <motion.button
                  key="stop-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generating"
                  className="bg-cyan-500 text-black flex size-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer shadow-md shadow-cyan-500/30"
                >
                  <Square className="size-3.5 fill-current" />
                </motion.button>
              ) : hasContent ? (
                <motion.button
                  key="send-btn"
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ type: "spring", stiffness: 450, damping: 26 }}
                  type="button"
                  onClick={submit}
                  disabled={disabled}
                  aria-label="Send message"
                  className="bg-gradient-to-tr from-cyan-500 to-emerald-400 text-black flex size-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40 cursor-pointer shadow-md shadow-cyan-500/25"
                >
                  <ArrowUp className="size-4 stroke-[2.5]" />
                </motion.button>
              ) : (
                <motion.div
                  key="voice-controls"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-1.5 sm:gap-2"
                >
                  {/* Voice to Text (MicButton) */}
                  <MicButton onTranscribed={onTranscribed} disabled={disabled || busy} />

                  {/* Live Voice Agent button to talk in live */}
                  {onOpenLiveVoice && (
                    <LiveVoiceAgentButton
                      onClick={onOpenLiveVoice}
                      disabled={disabled}
                      isActive={isLiveVoiceActive}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {error && (
        <p className="text-destructive mt-2 px-2 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
