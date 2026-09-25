export type AttachmentStatus =
  "selecting" | "uploading" | "ready" | "processing" | "error" | "removed";

export interface ChatAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  mediaType: string;
  previewUrl: string; // for images (object URL or data URL) or document representation
  dataUrl: string; // full data URL for sending to backend
  status: AttachmentStatus;
  errorMessage?: string;
  isImage: boolean;
  isPdf: boolean;
  isTextDoc: boolean;
  extractedText?: string;
  pageCount?: number;
}

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_DOCUMENT_BYTES = 30 * 1024 * 1024; // 30 MB
export const MAX_ATTACHMENTS_COUNT = 5;

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function detectMediaType(file: File): string {
  if (file.type && file.type.trim()) {
    return file.type.toLowerCase().trim();
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".bmp")) return "image/bmp";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
  if (name.endsWith(".csv")) return "text/csv";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (name.endsWith(".pptx"))
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return "application/octet-stream";
}

export function getFileCategory(
  mediaType: string,
  filename: string,
): {
  isImage: boolean;
  isPdf: boolean;
  isTextDoc: boolean;
  badge: string;
} {
  const lowerName = filename.toLowerCase();
  const isImage =
    mediaType.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(lowerName);
  const isPdf = mediaType === "application/pdf" || lowerName.endsWith(".pdf");
  const isTextDoc =
    mediaType.startsWith("text/") ||
    mediaType === "application/json" ||
    /\.(txt|md|markdown|csv|json|py|js|ts|tsx|jsx|html|css|yaml|yml|xml|log)$/i.test(lowerName);

  let badge = "FILE";
  if (isImage) {
    badge = lowerName.split(".").pop()?.toUpperCase() || "IMAGE";
  } else if (isPdf) {
    badge = "PDF";
  } else if (lowerName.endsWith(".csv")) {
    badge = "CSV";
  } else if (lowerName.endsWith(".json")) {
    badge = "JSON";
  } else if (lowerName.endsWith(".md")) {
    badge = "MD";
  } else if (lowerName.endsWith(".docx")) {
    badge = "DOCX";
  } else if (isTextDoc) {
    badge = "TXT";
  }

  return { isImage, isPdf, isTextDoc, badge };
}

export function validateAttachment(file: File): {
  valid: boolean;
  error?: string;
  mediaType: string;
  isImage: boolean;
  isPdf: boolean;
  isTextDoc: boolean;
} {
  const mediaType = detectMediaType(file);
  const { isImage, isPdf, isTextDoc } = getFileCategory(mediaType, file.name);

  if (!isImage && !isPdf && !isTextDoc) {
    return {
      valid: false,
      error: `Unsupported file format (${file.name}). Please attach Images (PNG, JPG, WEBP, GIF) or Documents (PDF, TXT, CSV, Markdown, JSON, DOCX).`,
      mediaType,
      isImage: false,
      isPdf: false,
      isTextDoc: false,
    };
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `${isImage ? "Image" : "Document"} is too large (${formatFileSize(file.size)}). Maximum allowed size is ${formatFileSize(maxBytes)}.`,
      mediaType,
      isImage,
      isPdf,
      isTextDoc,
    };
  }

  return {
    valid: true,
    mediaType,
    isImage,
    isPdf,
    isTextDoc,
  };
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
