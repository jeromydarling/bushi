import { Hono, type Context } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { loginSchema, signupSchema, slugify } from '@bushi/domain';
import { Db, now, type UserRow } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { generateToken, hashPassword, hashToken, uuid, verifyPassword } from '../lib/crypto.js';
import { HttpError, SESSION_COOKIE, parseBody } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

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

// --- request a password reset (scaffolding: creates a token, would email it) ---
authRoutes.post('/password/reset-request', async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  // Always return ok to avoid account enumeration.
  if (email) {
    const token = generateToken();
    // In production: store hashToken(token) with an expiry and enqueue an email job.
    void token;
  }
  return c.json({ ok: true, message: 'If the account exists, a reset link has been sent.' });
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
