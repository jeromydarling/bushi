import { Hono, type Context } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { loginSchema, signupSchema, slugify } from '@bushi/domain';
import { passwordResetEmail } from '@bushi/notifications';
import { Db, now, type UserRow } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { generateToken, hashPassword, hashToken, timingSafeEqual, uuid, verifyPassword } from '../lib/crypto.js';
import { HttpError, SESSION_COOKIE, parseBody } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

export const authRoutes = new Hono<AppBindings>();

authRoutes.post('/signup', async (c) => {
  const body = await parseBody(c, signupSchema);
  const db = new Db(c.env.DB);
  const existing = await db.first<UserRow>(
    `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`,
    body.email,
  );
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const ts = now();
  const userId = uuid();
  const passwordHash = await hashPassword(body.password);
  await db.batch([
    {
      sql: `INSERT INTO users (id,email,password_hash,status,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
      params: [userId, body.email, passwordHash, 'active', ts, ts],
    },
    {
      sql: `INSERT INTO user_profiles (user_id,full_name,locale,created_at,updated_at) VALUES (?,?,?,?,?)`,
      params: [userId, body.fullName, 'en', ts, ts],
    },
  ]);

  // Give every new user a personal organization so they can start immediately.
  const orgId = uuid();
  const baseSlug = slugify(body.fullName) || 'org';
  await db.batch([
    {
      sql: `INSERT INTO organizations (id,name,slug,plan_tier,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
      params: [orgId, `${body.fullName}'s Organization`, `${baseSlug}-${orgId.slice(0, 6)}`, 'free', userId, ts, ts],
    },
    {
      sql: `INSERT INTO organization_memberships (id,org_id,user_id,role,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
      params: [uuid(), orgId, userId, 'organizer', ts, ts],
    },
    {
      sql: `INSERT INTO subscriptions (id,org_id,tier,status,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
      params: [uuid(), orgId, 'free', 'active', ts, ts],
    },
  ]);

  const token = await createSession(db, userId, c.req.header('User-Agent') ?? null);
  setSessionCookie(c, token);
  return c.json({ user: { id: userId, email: body.email, fullName: body.fullName }, orgId }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await parseBody(c, loginSchema);
  const db = new Db(c.env.DB);
  const user = await db.first<UserRow>(
    `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`,
    body.email,
  );
  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  const token = await createSession(db, user.id, c.req.header('User-Agent') ?? null);
  setSessionCookie(c, token);
  return c.json({ user: { id: user.id, email: user.email } });
});

authRoutes.post('/logout', async (c) => {
  const cookie = c.req.header('Cookie');
  if (cookie) {
    const match = /bushi_session=([^;]+)/.exec(cookie);
    if (match) {
      const db = new Db(c.env.DB);
      await db.run(`UPDATE sessions SET revoked_at = ? WHERE token_hash = ?`, now(), await hashToken(match[1]!));
    }
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

authRoutes.get('/me', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const profile = await db.first<{ full_name: string; avatar_url: string | null }>(
    `SELECT full_name, avatar_url FROM user_profiles WHERE user_id = ?`,
    auth.userId,
  );
  return c.json({ id: auth.userId, email: auth.email, roles: auth.roles, orgId: auth.orgId, profile });
});

// --- request a password reset: persist a hashed token and email the link ---
authRoutes.post('/password/reset-request', async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  if (email) {
    const db = new Db(c.env.DB);
    const user = await db.first<{ id: string }>(
      `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`,
      email,
    );
    if (user) {
      const token = generateToken();
      const ts = now();
      await db.run(
        `INSERT INTO password_reset_tokens (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)`,
        uuid(),
        user.id,
        await hashToken(token),
        ts + RESET_TTL_MS,
        ts,
      );
      const profile = await db.first<{ full_name: string }>(
        `SELECT full_name FROM user_profiles WHERE user_id = ?`,
        user.id,
      );
      const resetUrl = `${c.env.APP_BASE_URL}/login?reset=${encodeURIComponent(token)}`;
      const mail = passwordResetEmail({ name: profile?.full_name ?? 'there', resetUrl });
      try {
        await c.env.JOBS?.send({ kind: 'send_email', to: email, subject: mail.subject, html: mail.html, text: mail.text });
      } catch {
        /* queue not bound in local dev */
      }
    }
  }
  // Always return ok to avoid account enumeration.
  return c.json({ ok: true, message: 'If the account exists, a reset link has been sent.' });
});

// --- consume a reset token and set a new password ---
authRoutes.post('/password/reset', async (c) => {
  const { token, password } = await c.req.json<{ token?: string; password?: string }>();
  if (!token || !password || password.length < 8) {
    throw new HttpError(400, 'A token and a new password (min 8 characters) are required');
  }
  const db = new Db(c.env.DB);
  const row = await db.first<{ id: string; user_id: string; expires_at: number; used_at: number | null }>(
    `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`,
    await hashToken(token),
  );
  if (!row || row.used_at || row.expires_at < Date.now()) {
    throw new HttpError(400, 'This reset link is invalid or has expired');
  }
  const passwordHash = await hashPassword(password);
  await db.batch([
    { sql: `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, params: [passwordHash, now(), row.user_id] },
    { sql: `UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`, params: [now(), row.id] },
    // Revoke existing sessions so a compromised session can't survive a reset.
    { sql: `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, params: [now(), row.user_id] },
  ]);
  return c.json({ ok: true });
});

/**
 * One-time platform-admin bootstrap. Disabled unless ADMIN_BOOTSTRAP_TOKEN is
 * set as a Worker secret. Grants `platform_admin` to an existing (already
 * signed-up) user so the operator can reach the super-admin CRM on a fresh DB.
 * Rotate/unset the token after use.
 */
authRoutes.post('/bootstrap-admin', async (c) => {
  const configured = c.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!configured) throw new HttpError(404, 'Not found'); // feature off → indistinguishable from a missing route
  const { token, email } = await c.req.json<{ token?: string; email?: string }>();
  if (!token || !timingSafeEqual(await hashToken(token), await hashToken(configured))) {
    throw new HttpError(401, 'Invalid bootstrap token');
  }
  if (!email) throw new HttpError(400, 'email is required');
  const db = new Db(c.env.DB);
  const user = await db.first<{ id: string }>(
    `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`,
    email,
  );
  if (!user) throw new HttpError(404, 'No user with that email — sign up first, then bootstrap');
  const already = await db.first<{ role: string }>(
    `SELECT role FROM organization_memberships WHERE user_id = ? AND role = 'platform_admin'`,
    user.id,
  );
  if (already) return c.json({ ok: true, alreadyAdmin: true });
  const org = await db.first<{ org_id: string }>(
    `SELECT org_id FROM organization_memberships WHERE user_id = ? ORDER BY created_at LIMIT 1`,
    user.id,
  );
  if (!org) throw new HttpError(400, 'User has no organization to attach the role to');
  await db.run(
    `INSERT INTO organization_memberships (id,org_id,user_id,role,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
    uuid(),
    org.org_id,
    user.id,
    'platform_admin',
    now(),
    now(),
  );
  return c.json({ ok: true });
});

async function createSession(db: Db, userId: string, userAgent: string | null): Promise<string> {
  const token = generateToken();
  const ts = now();
  await db.run(
    `INSERT INTO sessions (id,user_id,token_hash,user_agent,expires_at,created_at) VALUES (?,?,?,?,?,?)`,
    uuid(),
    userId,
    await hashToken(token),
    userAgent,
    ts + SESSION_TTL_MS,
    ts,
  );
  return token;
}

function setSessionCookie(c: Context<AppBindings>, token: string): void {
  // The SPA (Pages) and API (Worker) are on different origins in production, so
  // the session cookie must be SameSite=None to ride cross-origin credentialed
  // requests (and WebSocket handshakes). CORS is locked to an allowlist, and the
  // cookie is httpOnly+Secure, so this doesn't reopen CSRF. Dev stays Lax.
  const crossSite = c.env.ENVIRONMENT === 'production';
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: crossSite ? 'None' : 'Lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}
