import { Hono } from 'hono';
import { Db } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { requireRole } from '../middleware/auth.js';

/** Internal admin surface — restricted to platform_admin. */
export const adminRoutes = new Hono<AppBindings>();

adminRoutes.use('*', requireRole('platform_admin'));

adminRoutes.get('/search', async (c) => {
  const q = `%${(c.req.query('q') ?? '').trim()}%`;
  const db = new Db(c.env.DB);
  const [users, schools, tournaments] = await Promise.all([
    db.all<Record<string, unknown>>(`SELECT id,email,status FROM users WHERE email LIKE ? LIMIT 20`, q),
    db.all<Record<string, unknown>>(`SELECT id,name,slug FROM schools WHERE name LIKE ? LIMIT 20`, q),
    db.all<Record<string, unknown>>(`SELECT id,name,slug,status FROM tournaments WHERE name LIKE ? LIMIT 20`, q),
  ]);
  return c.json({ users, schools, tournaments });
});

adminRoutes.get('/audit-logs', async (c) => {
  const db = new Db(c.env.DB);
  const logs = await db.all<Record<string, unknown>>(
    `SELECT id,action,entity_type,entity_id,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100`,
  );
  return c.json({ logs });
});

adminRoutes.get('/feature-flags', async (c) => {
  const list = await c.env.FEATURE_FLAGS.list();
  const flags: Record<string, string | null> = {};
  for (const key of list.keys) {
    flags[key.name] = await c.env.FEATURE_FLAGS.get(key.name);
  }
  return c.json({ flags });
});

adminRoutes.put('/feature-flags/:key', async (c) => {
  const { value } = await c.req.json<{ value?: string }>();
  await c.env.FEATURE_FLAGS.put(c.req.param('key'), value ?? 'true');
  return c.json({ ok: true });
});
