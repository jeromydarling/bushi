/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import type { AppBindings } from '../types.js';

/**
 * Public, read-only media served straight from the R2 GENERATED bucket.
 *
 * Gives generated assets (the hero video, posters, share cards) a stable
 * same-origin URL without turning on public bucket access. Supports HTTP range
 * requests so <video> scrubbing/seeking works, and sets long-lived immutable
 * caching (asset keys are content-addressed by intent, so overwrites use a new
 * key or a cache-busting query).
 */
export const mediaRoutes = new Hono<AppBindings>();

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

mediaRoutes.get('/*', async (c) => {
  // Object key = path after the "/media/" mount prefix.
  const key = decodeURIComponent(new URL(c.req.url).pathname.replace(/^\/media\//, '')).replace(/^\/+/, '');
  if (!key || key.includes('..')) return c.json({ error: 'Not found' }, 404);

  const rangeHeader = c.req.header('range');
  const rangeMatch = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim()) : null;

  // Ranged request → 206 Partial Content (video seeking / mobile Safari).
  if (rangeMatch) {
    const head = await c.env.GENERATED.head(key);
    if (!head) return c.json({ error: 'Not found' }, 404);
    const total = head.size;
    const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
    const end = rangeMatch[2] ? Number(rangeMatch[2]) : total - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= total) {
      return new Response('Range Not Satisfiable', {
        status: 416,
        headers: { 'content-range': `bytes */${total}` },
      });
    }
    const obj = await c.env.GENERATED.get(key, { range: { offset: start, length: end - start + 1 } });
    if (!obj) return c.json({ error: 'Not found' }, 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('accept-ranges', 'bytes');
    headers.set('content-range', `bytes ${start}-${end}/${total}`);
    headers.set('content-length', String(end - start + 1));
    headers.set('cache-control', CACHE_CONTROL);
    return new Response(obj.body, { status: 206, headers });
  }

  const obj = await c.env.GENERATED.get(key);
  if (!obj) return c.json({ error: 'Not found' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', CACHE_CONTROL);
  return new Response(obj.body, { headers });
});
