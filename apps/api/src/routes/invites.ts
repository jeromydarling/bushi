import { Hono } from 'hono';
import { z } from 'zod';
import { inviteEmail } from '@bushi/notifications';
import { Db, now } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { HttpError, parseBody } from '../lib/http.js';
import { generateToken, hashToken, uuid } from '../lib/crypto.js';
import { requireAuth, assertOrgAccess } from '../middleware/auth.js';

/**
 * Team invitations. An org owner/organizer invites an email to a role; the
 * invitee receives a link, signs in (or up) with that email, and accepts —
 * which grants the org membership. Tokens are single-use, hashed at rest, and
 * expire after 7 days. The accepting user's email must match the invite.
 */
export const inviteRoutes = new Hono<AppBindings>();

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const ALLOWED_ROLES = ['owner', 'organizer', 'scorekeeper', 'referee', 'coach'] as const;

const createInviteSchema = z.object({
  orgId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(ALLOWED_ROLES),
});

// Create + email an invite.
inviteRoutes.post('/', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const body = await parseBody(c, createInviteSchema);
  assertOrgAccess(auth, body.orgId, 'owner', 'organizer');
  const db = new Db(c.env.DB);
  const token = generateToken();
  const id = uuid();
  const ts = now();
  await db.run(
    `INSERT INTO invites (id,org_id,email,role,token_hash,invited_by,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)`,
    id,
    body.orgId,
    body.email.toLowerCase(),
    body.role,
    await hashToken(token),
    auth.userId,
    ts + INVITE_TTL_MS,
    ts,
  );
  const [org, profile] = await Promise.all([
    db.first<{ name: string }>(`SELECT name FROM organizations WHERE id = ?`, body.orgId),
    db.first<{ full_name: string }>(`SELECT full_name FROM user_profiles WHERE user_id = ?`, auth.userId),
  ]);
  const acceptUrl = `${c.env.APP_BASE_URL}/invite?token=${encodeURIComponent(token)}`;
  const mail = inviteEmail({
    inviterName: profile?.full_name ?? auth.email,
    organizationName: org?.name ?? 'the team',
    role: body.role,
    acceptUrl,
  });
  try {
    await c.env.JOBS?.send({ kind: 'send_email', to: body.email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch {
    /* queue not bound in dev */
  }
  return c.json({ id, email: body.email, role: body.role }, 201);
});

// List an org's invites (pending + accepted).
inviteRoutes.get('/', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const orgId = c.req.query('orgId');
  if (!orgId) throw new HttpError(400, 'orgId is required');
  assertOrgAccess(auth, orgId, 'owner', 'organizer');
  const db = new Db(c.env.DB);
  const invites = await db.all<Record<string, unknown>>(
    `SELECT id, email, role, accepted_at, expires_at, created_at FROM invites WHERE org_id = ? ORDER BY created_at DESC`,
    orgId,
  );
  return c.json({ invites });
});

// Revoke an invite.
inviteRoutes.delete('/:id', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const invite = await db.first<{ org_id: string }>(`SELECT org_id FROM invites WHERE id = ?`, c.req.param('id'));
  if (!invite) throw new HttpError(404, 'Invite not found');
  assertOrgAccess(auth, invite.org_id, 'owner', 'organizer');
  await db.run(`DELETE FROM invites WHERE id = ?`, c.req.param('id'));
  return c.json({ ok: true });
});

// Accept an invite — grants the org membership to the signed-in user.
inviteRoutes.post('/accept', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const { token } = await c.req.json<{ token?: string }>();
  if (!token) throw new HttpError(400, 'token is required');
  const db = new Db(c.env.DB);
  const invite = await db.first<{ id: string; org_id: string; email: string; role: string; accepted_at: number | null; expires_at: number }>(
    `SELECT id, org_id, email, role, accepted_at, expires_at FROM invites WHERE token_hash = ?`,
    await hashToken(token),
  );
  if (!invite || invite.accepted_at || invite.expires_at < Date.now()) {
    throw new HttpError(400, 'This invitation is invalid or has expired');
  }
  if (invite.email.toLowerCase() !== auth.email.toLowerCase()) {
    throw new HttpError(403, 'This invitation was sent to a different email address');
  }
  const existing = await db.first<{ id: string }>(
    `SELECT id FROM organization_memberships WHERE org_id = ? AND user_id = ?`,
    invite.org_id,
    auth.userId,
  );
  const ts = now();
  const statements: { sql: string; params: unknown[] }[] = [
    { sql: `UPDATE invites SET accepted_at = ? WHERE id = ?`, params: [ts, invite.id] },
  ];
  if (!existing) {
    statements.push({
      sql: `INSERT INTO organization_memberships (id,org_id,user_id,role,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
      params: [uuid(), invite.org_id, auth.userId, invite.role, ts, ts],
    });
  }
  await db.batch(statements);
  return c.json({ ok: true, orgId: invite.org_id, role: invite.role });
});
