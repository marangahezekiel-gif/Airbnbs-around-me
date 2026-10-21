/**
 * Tiny in-memory rate limiter (per server instance). Enough to slow down
 * password guessing and sign-up spam; for multiple instances or serverless
 * at scale, swap this for Upstash/Redis.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

/** Returns true if the action is allowed, false if `key` is over `max` within `windowMs`. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export const clientIp = (headers: Headers) =>
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
