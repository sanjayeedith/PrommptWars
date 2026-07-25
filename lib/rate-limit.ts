/**
 * Tiny in-memory IP rate limiter for API routes.
 * Resets on process restart — fine for demo / single-instance deploys.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  limit = 20,
  windowMs = 60_000,
  bucket = "default",
): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Optional demo override header; reject absurd lengths. */
export function optionalSupermemoryKey(request: Request): string | undefined {
  const raw = request.headers.get("x-supermemory-key")?.trim();
  if (!raw) return undefined;
  if (raw.length < 8 || raw.length > 200) return undefined;
  return raw;
}
