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
        memberships: memberships.map((m) => ({ orgId: m.org_id, role: m.role })),
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

// ── Org-scoped authorization helpers ─────────────────────────────────────────
// Roles are granted per-organization. NEVER authorize a write against the flat
// `roles` list — always check the caller's role in the specific org that owns
// the resource, so a member of org A can't act on org B's data.

/** Platform admins bypass org scoping (super-admin / CRM). */
export function isPlatformAdmin(auth: AuthContext): boolean {
  return auth.roles.includes('platform_admin');
}

/** The caller's role within a given org, or null if not a member. */
export function roleInOrg(auth: AuthContext, orgId: string | null | undefined): string | null {
  if (!orgId) return null;
  return auth.memberships.find((m) => m.orgId === orgId)?.role ?? null;
}

/**
 * Assert the caller may act on `orgId`. With no `roles`, any membership passes
 * (read access); with roles, the caller's role in that org must be one of them.
 * Platform admins always pass. Throws 403 otherwise.
 */
export function assertOrgAccess(
  auth: AuthContext,
  orgId: string | null | undefined,
  ...roles: string[]
): void {
  if (isPlatformAdmin(auth)) return;
  if (!orgId) throw new HttpError(403, 'Forbidden');
  const role = roleInOrg(auth, orgId);
  if (!role) throw new HttpError(403, 'Not a member of this organization');
  if (roles.length > 0 && !roles.includes(role)) throw new HttpError(403, 'Insufficient role');
}
