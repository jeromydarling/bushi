import { Hono, type Context } from 'hono';
import { Db } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { HttpError } from '../lib/http.js';
import { assertOrgAccess } from '../middleware/auth.js';

/**
 * Live scoring gateway. WebSocket connections are forwarded to the per-match
 * MatRoom Durable Object; REST helpers let the command center seed a room.
 *
 * SECURITY: the Durable Object trusts the `role` in the URL it receives — but
 * that URL is built *here*, never copied from the client. Privileged roles
 * (scorekeeper/referee/organizer) require an authenticated caller with a
 * scoring role in the match's tournament org; everyone else is forced to a
 * read-only spectator/display role. The DO is not publicly addressable, so it
 * can safely trust the gateway-resolved role.
 */
export const liveRoutes = new Hono<AppBindings>();

/** Mat roles that may emit scoring events (must be authenticated + authorized). */
const PRIVILEGED_ROLES = new Set(['scorekeeper', 'referee', 'organizer']);
/** Org roles permitted to take a privileged mat seat. */
const SCORING_ORG_ROLES = ['owner', 'organizer', 'scorekeeper', 'referee'] as const;

function roomStub(c: Context<AppBindings>, matchId: string): DurableObjectStub {
  const id = c.env.MAT_ROOM.idFromName(matchId);
  return c.env.MAT_ROOM.get(id);
}

/** Room keys are `${tournamentId}-mat-${matNumber}` — recover the tournament id. */
function tournamentIdFromRoom(matchId: string): string | null {
  const i = matchId.lastIndexOf('-mat-');
  return i > 0 ? matchId.slice(0, i) : null;
}

/** Assert the caller may take a privileged mat role for this room's tournament. */
async function assertScoringAccess(c: Context<AppBindings>, matchId: string): Promise<void> {
  const auth = c.get('auth');
  if (!auth) throw new HttpError(401, 'Sign in to score this match');
  const tournamentId = tournamentIdFromRoom(matchId);
  if (!tournamentId) throw new HttpError(403, 'Unknown match room');
  const db = new Db(c.env.DB);
  const t = await db.first<{ org_id: string }>(
    `SELECT org_id FROM tournaments WHERE id = ? AND deleted_at IS NULL`,
    tournamentId,
  );
  if (!t) throw new HttpError(404, 'Tournament not found');
  assertOrgAccess(auth, t.org_id, ...SCORING_ORG_ROLES);
}

// WebSocket upgrade: /api/live/:matchId?role=scorekeeper|referee|display|spectator
liveRoutes.get('/:matchId', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.text('Expected a WebSocket upgrade', 426);
  }
  const matchId = c.req.param('matchId');
  const requested = new URL(c.req.url).searchParams.get('role') ?? 'spectator';

  // Resolve the effective role server-side; privileged roles must be authorized.
  let role: string;
  if (PRIVILEGED_ROLES.has(requested)) {
    await assertScoringAccess(c, matchId);
    role = requested;
  } else {
    role = requested === 'display' ? 'display' : 'spectator';
  }

  const stub = roomStub(c, matchId);
  // Forward with ONLY the server-decided role — the client's query is discarded.
  return stub.fetch(new Request(`https://mat-room/ws?role=${encodeURIComponent(role)}`, c.req.raw));
});

// Seed / initialize a room with fighters + clock settings (organizers only).
liveRoutes.post('/:matchId/init', async (c) => {
  const matchId = c.req.param('matchId');
  const auth = c.get('auth');
  if (!auth) throw new HttpError(401, 'Authentication required');
  const tournamentId = tournamentIdFromRoom(matchId);
  if (!tournamentId) throw new HttpError(403, 'Unknown match room');
  const db = new Db(c.env.DB);
  const t = await db.first<{ org_id: string }>(
    `SELECT org_id FROM tournaments WHERE id = ? AND deleted_at IS NULL`,
    tournamentId,
  );
  if (!t) throw new HttpError(404, 'Tournament not found');
  assertOrgAccess(auth, t.org_id, 'owner', 'organizer');

  const stub = roomStub(c, matchId);
  const body = await c.req.text();
  const res = await stub.fetch(
    new Request('https://mat-room/init', { method: 'POST', body, headers: { 'content-type': 'application/json' } }),
  );
  return new Response(res.body, res);
});

// Snapshot the current state — public, read-only (spectator scoreboard hydration).
liveRoutes.get('/:matchId/state', async (c) => {
  const stub = roomStub(c, c.req.param('matchId'));
  const res = await stub.fetch(new Request('https://mat-room/state'));
  return new Response(res.body, res);
});
