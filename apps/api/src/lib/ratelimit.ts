import type { Context } from 'hono';
import type { AppBindings } from '../types.js';
import { HttpError } from './http.js';

/** Best-effort client IP from Cloudflare headers. */
export function clientIp(c: Context<AppBindings>): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * Fixed-window KV rate limit. Throws 429 when the window budget is exhausted.
 * KV isn't transactional, so counts are approximate under high concurrency —
 * fine for abuse control. Fails OPEN if the CACHE namespace is unavailable (dev).
 * `windowSec` must be ≥ 60 (KV minimum TTL).
 */
export async function rateLimit(
  c: Context<AppBindings>,
  bucket: string,
  id: string,
  limit: number,
  windowSec: number,
): Promise<void> {
  const kv = c.env.CACHE;
  if (!kv) return;
  const key = `rl:${bucket}:${id}`;
  const current = Number((await kv.get(key)) ?? '0');
  if (current >= limit) {
    throw new HttpError(429, 'Too many requests — please slow down and try again shortly.');
  }
  await kv.put(key, String(current + 1), { expirationTtl: Math.max(60, windowSec) });
}
