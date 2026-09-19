import { AGENT_LIMITS } from "./limits.server";

type RateLimitBucket = { startedAt: number; count: number };

const WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS = 2_000;
const buckets = new Map<string, RateLimitBucket>();

export class AgentRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests. Please wait a moment and try again.");
    this.name = "AgentRateLimitError";
  }
}

function cleanExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= WINDOW_MS) buckets.delete(key);
  }
}

/**
 * A lightweight abuse guard. It is deliberately per-instance: durable account
 * quotas belong in the billing/auth layer, while this prevents accidental
 * bursts and simple public-endpoint abuse before an LLM call is made.
 */
export function enforceRequestRateLimit(clientKey: string) {
  const now = Date.now();
  if (buckets.size >= MAX_TRACKED_CLIENTS) cleanExpiredBuckets(now);

  const bucket = buckets.get(clientKey);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    buckets.set(clientKey, { startedAt: now, count: 1 });
    return;
  }

  if (bucket.count >= AGENT_LIMITS.requestsPerMinute) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - bucket.startedAt)) / 1_000),
    );
    throw new AgentRateLimitError(retryAfterSeconds);
  }

  bucket.count += 1;
}
