import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { Db } from '@bushi/db';
import type { AuthContext, Env } from '../env.js';
import { hashToken } from '../lib/crypto.js';
import { HttpError, SESSION_COOKIE } from '../lib/http.js';

interface SessionJoin {
  user_id: string;
  email: string;
  expires_at: number;
  revoked_at: number | null;
}

/**
 * Resolve the current session from the cookie (or Bearer token) and attach an
 * AuthContext. Does not reject on its own — pair with `requireAuth` for guarded
 * routes so public routes can still read an optional session.
 */
export async function loadSession(
  c: Context<{ Bindings: Env; Variables: { auth: AuthContext | null } }>,
  next: Next,
): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE) ?? bearer(c.req.header('Authorization'));
  let auth: AuthContext | null = null;
  if (token) {
    const db = new Db(c.env.DB);
    const tokenHash = await hashToken(token);
    const row = await db.first<SessionJoin>(
      `SELECT s.user_id, u.email, s.expires_at, s.revoked_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
      tokenHash,
    );
    if (row && !row.revoked_at && row.expires_at > Date.now()) {
      const memberships = await db.all<{ org_id: string; role: string }>(
        `SELECT org_id, role FROM organization_memberships WHERE user_id = ?`,
        row.user_id,
      );
      auth = {
        userId: row.user_id,
        email: row.email,
        roles: memberships.map((m) => m.role),
        orgId: memberships[0]?.org_id ?? null,
      };
    }
  }
  c.set('auth', auth);
  await next();
}

export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: { auth: AuthContext | null } }>,
  next: Next,
): Promise<void> {
  if (!c.get('auth')) throw new HttpError(401, 'Authentication required');
  await next();
}

/** Guard requiring at least one of the given roles. */
export function requireRole(...roles: string[]) {
  return async (
    c: Context<{ Bindings: Env; Variables: { auth: AuthContext | null } }>,
    next: Next,
  ): Promise<void> => {
    const auth = c.get('auth');
    if (!auth) throw new HttpError(401, 'Authentication required');
    if (!auth.roles.some((r) => roles.includes(r))) {
      throw new HttpError(403, 'Insufficient role');
    }
    await next();
  };
}

function bearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  return scheme === 'Bearer' ? value : undefined;
}
