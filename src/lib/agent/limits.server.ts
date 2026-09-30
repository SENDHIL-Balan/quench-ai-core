const DEFAULTS = {
  maxRequestBytes: 50 * 1024 * 1024,
  maxMessages: 1000,
  maxContextChars: 1_000_000,
  maxPdfChars: 250_000,
  maxTextFileChars: 150_000,
  maxAttachmentBytes: 30 * 1024 * 1024, // 30 MB
  maxAttachmentsPerMessage: 10,
  maxOutputTokens: 8_192,
  maxDeepThinkOutputTokens: 16_384,
  requestsPerMinute: 300,
} as const;

function readBoundedInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, minimum), maximum) : fallback;
}

/**
 * Per-request limits keep a single chat turn predictable even when the client
 * sends a long conversation or an attachment. Each setting can be adjusted in
 * the deployment environment without changing application code.
 */
export const AGENT_LIMITS = {
  maxRequestBytes: readBoundedInteger(
    "QUENCH_MAX_REQUEST_BYTES",
    DEFAULTS.maxRequestBytes,
    64 * 1024,
    100 * 1024 * 1024,
  ),
  maxMessages: readBoundedInteger("QUENCH_MAX_MESSAGES", DEFAULTS.maxMessages, 10, 5000),
  maxContextChars: readBoundedInteger(
    "QUENCH_MAX_CONTEXT_CHARS",
    DEFAULTS.maxContextChars,
    10_000,
    5_000_000,
  ),
  maxPdfChars: readBoundedInteger("QUENCH_MAX_PDF_CHARS", DEFAULTS.maxPdfChars, 1_000, 500_000),
  maxTextFileChars: readBoundedInteger(
    "QUENCH_MAX_TEXT_FILE_CHARS",
    DEFAULTS.maxTextFileChars,
    1_000,
    300_000,
  ),
  maxAttachmentBytes: readBoundedInteger(
    "QUENCH_MAX_ATTACHMENT_BYTES",
    DEFAULTS.maxAttachmentBytes,
    64 * 1024,
    50 * 1024 * 1024,
  ),
  maxAttachmentsPerMessage: readBoundedInteger(
    "QUENCH_MAX_ATTACHMENTS_PER_MESSAGE",
    DEFAULTS.maxAttachmentsPerMessage,
    1,
    20,
  ),
  maxOutputTokens: readBoundedInteger(
    "QUENCH_MAX_OUTPUT_TOKENS",
    DEFAULTS.maxOutputTokens,
    256,
    32_768,
  ),
  maxDeepThinkOutputTokens: readBoundedInteger(
    "QUENCH_MAX_DEEP_THINK_OUTPUT_TOKENS",
    DEFAULTS.maxDeepThinkOutputTokens,
    256,
    65_536,
  ),
  requestsPerMinute: readBoundedInteger(
    "QUENCH_REQUESTS_PER_MINUTE",
    DEFAULTS.requestsPerMinute,
    1,
    600,
  ),
} as const;

export const SUPPORTED_IMAGE_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export const SUPPORTED_DOCUMENT_MEDIA_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/ld+json",
  "application/x-ndjson",
]);

export const SUPPORTED_ATTACHMENT_MEDIA_TYPES = new Set([
  ...SUPPORTED_IMAGE_MEDIA_TYPES,
  ...SUPPORTED_DOCUMENT_MEDIA_TYPES,
]);

export function getDataUrlSizeInBytes(url: string): number | undefined {
  const commaIndex = url.indexOf(",");
  if (!url.startsWith("data:") || commaIndex === -1) return undefined;

  const metadata = url.slice(0, commaIndex).toLowerCase();
  if (!metadata.includes(";base64")) return undefined;

  const encoded = url.slice(commaIndex + 1).replace(/\s/g, "");
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
}
