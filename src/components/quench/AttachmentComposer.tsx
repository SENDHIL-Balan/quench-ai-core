import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  FileCode,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/attachments/attachment-types";

export type AttachmentStatus =
  "selecting" | "uploading" | "ready" | "processing" | "error" | "removed";

export interface AttachmentComposerItem {
  id: string;
  file?: File;
  name: string;
  size?: number;
  formattedSize?: string;
  mediaType?: string;
  previewUrl?: string;
  isImage?: boolean;
  isPdf?: boolean;
  isTextDoc?: boolean;
  badge?: string;
  status?: AttachmentStatus;
  errorMessage?: string;
  pageCount?: number;
}

export interface AttachmentComposerProps {
  attachments: AttachmentComposerItem[];
  onRemove: (id: string) => void;
  onPreviewImage?: (previewUrl: string, name: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * AttachmentComposer
 *
 * Renders visual previews for images and rich file cards for PDFs (and documents)
 * attached in the chat input composer, with status indicators (uploading, ready, error),
 * fullscreen image preview inspection, and removal support.
 */
export function AttachmentComposer({
  attachments,
  onRemove,
  onPreviewImage,
  className,
  disabled = false,
}: AttachmentComposerProps) {
  const [activePreview, setActivePreview] = useState<{ url: string; name: string } | null>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!activePreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActivePreview(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePreview]);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleImageClick = (item: AttachmentComposerItem) => {
    if (!item.previewUrl) return;
    if (onPreviewImage) {
      onPreviewImage(item.previewUrl, item.name);
    } else {
      setActivePreview({ url: item.previewUrl, name: item.name });
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2.5 px-1 pt-1 pb-2 overflow-x-auto [scrollbar-width:thin]",
        className,
      )}
      role="region"
      aria-label="Attached files"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {attachments.map((item) => {
          const isImg = Boolean(
            item.isImage ||
            (item.mediaType && item.mediaType.startsWith("image/")) ||
            /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(item.name),
          );

          const isPdf = Boolean(
            item.isPdf ||
            item.mediaType === "application/pdf" ||
            item.name.toLowerCase().endsWith(".pdf"),
          );

          const sizeDisplay = item.formattedSize || (item.size ? formatFileSize(item.size) : "");

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.88, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -4, transition: { duration: 0.16 } }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0"
            >
              {isImg ? (
                /* ================= Image Thumbnail Card ================= */
                <div
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-black/80 shadow-lg transition-all duration-200",
                    "hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]",
                    "w-28 sm:w-36 h-28 sm:h-36 shrink-0",
                    item.status === "error" && "border-rose-500/70 shadow-rose-950/40",
                  )}
                >
                  {/* Image Thumbnail or Placeholder */}
                  {item.previewUrl ? (
                    <button
                      type="button"
                      onClick={() => handleImageClick(item)}
                      className="h-full w-full p-0 border-0 bg-transparent cursor-pointer overflow-hidden text-left relative focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      title={`Click to preview full size: ${item.name}`}
                    >
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Hover preview eye hint */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex size-7 items-center justify-center rounded-full bg-black/70 text-cyan-300 shadow">
                          <Eye className="size-3.5" />
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-900/90 text-zinc-500">
                      <ImageIcon className="size-7 opacity-60" />
                    </div>
                  )}

                  {/* Top-Right Remove Button (×) */}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className={cn(
                      "absolute top-1.5 right-1.5 z-20 flex size-6 items-center justify-center rounded-full",
                      "bg-black/80 text-zinc-300 shadow-md backdrop-blur-md transition-all cursor-pointer",
                      "hover:bg-rose-600 hover:text-white hover:scale-110",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                    aria-label={`Remove image ${item.name}`}
                    title="Remove attachment"
                  >
                    <X className="size-3.5" />
                  </button>

                  {/* Gradient Footer Overlay with Name, Size, & Upload Status */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 pt-4 text-left">
                    <p
                      className="truncate text-[11px] font-medium text-white drop-shadow"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-300 mt-0.5">
                      <span>{sizeDisplay}</span>
                      {item.status === "uploading" ? (
                        <span className="flex items-center gap-1 text-cyan-400 font-medium">
                          <Loader2 className="size-2.5 animate-spin" />
                          <span>Uploading…</span>
                        </span>
                      ) : item.status === "error" ? (
                        <span
                          className="flex items-center gap-0.5 text-rose-400 font-semibold"
                          title={item.errorMessage || "Upload failed"}
                        >
                          <AlertCircle className="size-2.5" />
                          <span>Error</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                          <Check className="size-2.5" />
                          <span>Ready</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : isPdf ? (
                /* ================= PDF File Card ================= */
                <div
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl border border-white/20 bg-[#141824]/90 p-2.5 sm:p-3 shadow-lg transition-all duration-200",
                    "hover:border-rose-400/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.18)]",
                    "min-w-[210px] max-w-[280px] shrink-0 text-left",
                    item.status === "error" && "border-rose-500/70 shadow-rose-950/40",
                  )}
                >
                  {/* Distinct PDF Emblem */}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs border border-rose-500/40 bg-rose-500/20 text-rose-400 shadow-[inset_0_1px_3px_rgba(244,63,94,0.3)]">
                    <div className="flex flex-col items-center leading-none">
                      <FileText className="size-4 text-rose-400" />
                      <span className="text-[8px] uppercase tracking-wider font-extrabold mt-0.5 text-rose-300">
                        PDF
                      </span>
                    </div>
                  </div>

                  {/* Metadata: Title, Size, Page count, Status */}
                  <div className="min-w-0 flex-1 pr-5">
                    <p
                      className="truncate text-xs sm:text-[13px] font-medium text-white"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                      {sizeDisplay && <span>{sizeDisplay}</span>}
                      {item.pageCount && (
                        <>
                          <span>•</span>
                          <span>
                            {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      {item.status === "uploading" ? (
                        <span className="flex items-center gap-1 text-cyan-400 font-medium">
                          <Loader2 className="size-2.5 animate-spin" />
                          <span>Uploading…</span>
                        </span>
                      ) : item.status === "error" ? (
                        <span
                          className="flex items-center gap-0.5 text-rose-400 font-semibold"
                          title={item.errorMessage || "Failed to process PDF"}
                        >
                          <AlertCircle className="size-2.5" />
                          <span>Error</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                          <Check className="size-2.5" />
                          <span>Ready</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Top-Right Remove Button (×) */}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className={cn(
                      "absolute top-2 right-2 flex size-5 items-center justify-center rounded-full",
                      "bg-white/10 text-zinc-400 transition-colors cursor-pointer",
                      "hover:bg-rose-600 hover:text-white hover:scale-110",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                    aria-label={`Remove PDF ${item.name}`}
                    title="Remove attachment"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                /* ================= General Document Card ================= */
                <div
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl border border-white/20 bg-[#161a28]/90 p-2.5 sm:p-3 shadow-lg transition-all duration-200",
                    "hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.18)]",
                    "min-w-[210px] max-w-[280px] shrink-0 text-left",
                    item.status === "error" && "border-rose-500/70 shadow-rose-950/40",
                  )}
                >
                  {/* Document Badge */}
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs border shadow-inner",
                      item.name.endsWith(".csv") || item.name.endsWith(".xlsx")
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : item.name.endsWith(".json") ||
                            item.name.endsWith(".ts") ||
                            item.name.endsWith(".py")
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
                    )}
                  >
                    <div className="flex flex-col items-center leading-none">
                      {item.name.endsWith(".csv") || item.name.endsWith(".xlsx") ? (
                        <FileSpreadsheet className="size-4" />
                      ) : item.name.endsWith(".json") ||
                        item.name.endsWith(".ts") ||
                        item.name.endsWith(".py") ? (
                        <FileCode className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                      <span className="text-[8px] uppercase tracking-wider font-extrabold mt-0.5">
                        {item.badge || item.name.split(".").pop()?.toUpperCase() || "DOC"}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="min-w-0 flex-1 pr-5">
                    <p
                      className="truncate text-xs sm:text-[13px] font-medium text-white"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                      {sizeDisplay && <span>{sizeDisplay}</span>}
                      <span>•</span>
                      {item.status === "uploading" ? (
                        <span className="flex items-center gap-1 text-cyan-400 font-medium">
                          <Loader2 className="size-2.5 animate-spin" />
                          <span>Uploading…</span>
                        </span>
                      ) : item.status === "error" ? (
                        <span
                          className="flex items-center gap-0.5 text-rose-400 font-semibold"
                          title={item.errorMessage || "Failed to process document"}
                        >
                          <AlertCircle className="size-2.5" />
                          <span>Error</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                          <Check className="size-2.5" />
                          <span>Ready</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove Button (×) */}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className={cn(
                      "absolute top-2 right-2 flex size-5 items-center justify-center rounded-full",
                      "bg-white/10 text-zinc-400 transition-colors cursor-pointer",
                      "hover:bg-rose-600 hover:text-white hover:scale-110",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                    aria-label={`Remove document ${item.name}`}
                    title="Remove attachment"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Fullscreen Lightbox Modal for Image Inspection */}
      {activePreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activePreview.name}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setActivePreview(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border border-white/20 bg-black/90 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <span className="rounded-md bg-black/70 px-2 py-1 text-xs text-zinc-300 backdrop-blur-sm truncate max-w-[200px]">
                {activePreview.name}
              </span>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="flex size-8 items-center justify-center rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                title="Close preview"
              >
                <X className="size-4" />
              </button>
            </div>
            <img
              src={activePreview.url}
              alt={activePreview.name}
              className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
