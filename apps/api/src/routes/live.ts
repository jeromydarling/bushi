import { Hono, type Context } from 'hono';
import type { AppBindings } from '../types.js';

/**
 * Live scoring gateway. WebSocket connections are forwarded to the per-match
 * MatRoom Durable Object; REST helpers let the command center seed a room.
 */
export const liveRoutes = new Hono<AppBindings>();

function roomStub(c: Context<AppBindings>, matchId: string): DurableObjectStub {
  const id = c.env.MAT_ROOM.idFromName(matchId);
  return c.env.MAT_ROOM.get(id);
}

// WebSocket upgrade: /api/live/:matchId?role=scorekeeper|referee|display|spectator
liveRoutes.get('/:matchId', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.text('Expected a WebSocket upgrade', 426);
  }
  const stub = roomStub(c, c.req.param('matchId'));
  const url = new URL(c.req.url);
  return stub.fetch(new Request(`https://mat-room/ws?${url.searchParams.toString()}`, c.req.raw));
});

// Seed / initialize a room with fighters + clock settings.
liveRoutes.post('/:matchId/init', async (c) => {
  const stub = roomStub(c, c.req.param('matchId'));
  const body = await c.req.text();
  const res = await stub.fetch(
    new Request('https://mat-room/init', { method: 'POST', body, headers: { 'content-type': 'application/json' } }),
  );
  return new Response(res.body, res);
});

// Snapshot the current state (for public results hydration).
liveRoutes.get('/:matchId/state', async (c) => {
  const stub = roomStub(c, c.req.param('matchId'));
  const res = await stub.fetch(new Request('https://mat-room/state'));
  return new Response(res.body, res);
});
