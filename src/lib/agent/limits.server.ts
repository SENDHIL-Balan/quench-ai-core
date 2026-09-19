const DEFAULTS = {
  maxRequestBytes: 6 * 1024 * 1024,
  maxMessages: 24,
  maxContextChars: 24_000,
  maxPdfChars: 12_000,
  maxTextFileChars: 12_000,
  maxAttachmentBytes: 2 * 1024 * 1024,
  maxAttachmentsPerMessage: 2,
  maxOutputTokens: 800,
  maxDeepThinkOutputTokens: 1_400,
  requestsPerMinute: 10,
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
    20 * 1024 * 1024,
  ),
  maxMessages: readBoundedInteger("QUENCH_MAX_MESSAGES", DEFAULTS.maxMessages, 2, 100),
  maxContextChars: readBoundedInteger(
    "QUENCH_MAX_CONTEXT_CHARS",
    DEFAULTS.maxContextChars,
    4_000,
    100_000,
  ),
  maxPdfChars: readBoundedInteger("QUENCH_MAX_PDF_CHARS", DEFAULTS.maxPdfChars, 1_000, 40_000),
  maxTextFileChars: readBoundedInteger(
    "QUENCH_MAX_TEXT_FILE_CHARS",
    DEFAULTS.maxTextFileChars,
    1_000,
    40_000,
  ),
  maxAttachmentBytes: readBoundedInteger(
    "QUENCH_MAX_ATTACHMENT_BYTES",
    DEFAULTS.maxAttachmentBytes,
    64 * 1024,
    5 * 1024 * 1024,
  ),
  maxAttachmentsPerMessage: readBoundedInteger(
    "QUENCH_MAX_ATTACHMENTS_PER_MESSAGE",
    DEFAULTS.maxAttachmentsPerMessage,
    1,
    5,
  ),
  maxOutputTokens: readBoundedInteger(
    "QUENCH_MAX_OUTPUT_TOKENS",
    DEFAULTS.maxOutputTokens,
    128,
    4_000,
  ),
  maxDeepThinkOutputTokens: readBoundedInteger(
    "QUENCH_MAX_DEEP_THINK_OUTPUT_TOKENS",
    DEFAULTS.maxDeepThinkOutputTokens,
    128,
    6_000,
  ),
  requestsPerMinute: readBoundedInteger(
    "QUENCH_REQUESTS_PER_MINUTE",
    DEFAULTS.requestsPerMinute,
    1,
    60,
  ),
} as const;

export const SUPPORTED_ATTACHMENT_MEDIA_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/ld+json",
  "application/x-ndjson",
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
