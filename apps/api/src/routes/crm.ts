import { Hono } from 'hono';
import {
  AT_RISK_THRESHOLD,
  createInteractionSchema,
  createTaskSchema,
  createTicketSchema,
  updateCustomerSchema,
  updateTaskSchema,
  updateTicketSchema,
} from '@bushi/domain';
import { Db, now } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { HttpError, parseBody } from '../lib/http.js';
import { uuid } from '../lib/crypto.js';
import { requireRole } from '../middleware/auth.js';
import { computeHealth, recomputeAllHealth } from '../lib/health.js';

/** Super-admin CRM. All routes require platform_admin. */
export const crmRoutes = new Hono<AppBindings>();
crmRoutes.use('*', requireRole('platform_admin'));

interface CustomerRow {
  id: string;
  org_id: string | null;
  name: string;
  lifecycle_stage: string;
  owner_user_id: string | null;
  mrr_cents: number;
  health_score: number;
  health_reason: string | null;
  health_updated_at: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  tags: string;
  created_at: number;
  updated_at: number;
}

function summary(r: CustomerRow, ownerName?: string | null) {
  return {
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    lifecycleStage: r.lifecycle_stage,
    healthScore: r.health_score,
    healthReason: r.health_reason,
    mrrCents: r.mrr_cents,
    ownerName: ownerName ?? null,
    city: r.city,
    region: r.region,
    country: r.country,
    lat: r.lat,
    lng: r.lng,
    tags: safeTags(r.tags),
    atRisk: r.health_score < AT_RISK_THRESHOLD,
  };
}
function safeTags(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// --- Retention radar / overview ---
crmRoutes.get('/overview', async (c) => {
  const db = new Db(c.env.DB);
  const tiles = await db.first<{ customers: number; at_risk: number; mrr: number; at_risk_mrr: number }>(
    `SELECT COUNT(*) AS customers,
            SUM(CASE WHEN health_score < ? THEN 1 ELSE 0 END) AS at_risk,
            COALESCE(SUM(mrr_cents),0) AS mrr,
            COALESCE(SUM(CASE WHEN health_score < ? THEN mrr_cents ELSE 0 END),0) AS at_risk_mrr
     FROM crm_customers`,
    AT_RISK_THRESHOLD,
    AT_RISK_THRESHOLD,
  );
  const atRisk = await db.all<CustomerRow>(
    `SELECT * FROM crm_customers WHERE health_score < ? ORDER BY mrr_cents DESC, health_score ASC LIMIT 12`,
    AT_RISK_THRESHOLD,
  );
  const tasksDue = await db.all<Record<string, unknown>>(
    `SELECT t.id, t.title, t.due_at, t.status, c.id AS customer_id, c.name AS customer_name
     FROM crm_tasks t JOIN crm_customers c ON c.id = t.customer_id
     WHERE t.status = 'open' ORDER BY t.due_at IS NULL, t.due_at ASC LIMIT 20`,
  );
  return c.json({
    tiles: {
      customers: tiles?.customers ?? 0,
      atRisk: tiles?.at_risk ?? 0,
      mrrCents: tiles?.mrr ?? 0,
      atRiskMrrCents: tiles?.at_risk_mrr ?? 0,
      tasksDue: tasksDue.length,
    },
    atRiskCustomers: atRisk.map((r) => summary(r)),
    tasksDue,
  });
});

// --- Map points ---
crmRoutes.get('/map', async (c) => {
  const db = new Db(c.env.DB);
  const rows = await db.all<CustomerRow>(
    `SELECT * FROM crm_customers WHERE lat IS NOT NULL AND lng IS NOT NULL`,
  );
  return c.json({
    points: rows.map((r) => ({
      id: r.id,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      stage: r.lifecycle_stage,
      healthScore: r.health_score,
      mrrCents: r.mrr_cents,
      atRisk: r.health_score < AT_RISK_THRESHOLD,
    })),
  });
});

// --- Customer list ---
crmRoutes.get('/customers', async (c) => {
  const db = new Db(c.env.DB);
  const q = c.req.query('q')?.trim();
  const stage = c.req.query('stage');
  const risk = c.req.query('risk');
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (q) {
    clauses.push('(c.name LIKE ? OR c.city LIKE ? OR c.region LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (stage) {
    clauses.push('c.lifecycle_stage = ?');
    params.push(stage);
  }
  if (risk === '1') {
    clauses.push('c.health_score < ?');
    params.push(AT_RISK_THRESHOLD);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db.all<CustomerRow & { owner_name: string | null }>(
    `SELECT c.*, p.full_name AS owner_name
     FROM crm_customers c LEFT JOIN user_profiles p ON p.user_id = c.owner_user_id
     ${where} ORDER BY c.health_score ASC, c.mrr_cents DESC LIMIT 200`,
    ...params,
  );
  return c.json({ customers: rows.map((r) => summary(r, r.owner_name)) });
});

// --- Customer detail ---
crmRoutes.get('/customers/:id', async (c) => {
  const db = new Db(c.env.DB);
  const id = c.req.param('id');
  const row = await db.first<CustomerRow & { owner_name: string | null }>(
    `SELECT c.*, p.full_name AS owner_name FROM crm_customers c LEFT JOIN user_profiles p ON p.user_id = c.owner_user_id WHERE c.id = ?`,
    id,
  );
  if (!row) throw new HttpError(404, 'Customer not found');
  const [contacts, interactions, tasks, tickets, snapshots] = await Promise.all([
    db.all<Record<string, unknown>>(`SELECT id,name,email,phone,role,is_primary FROM crm_contacts WHERE customer_id = ? ORDER BY is_primary DESC, name`, id),
    db.all<Record<string, unknown>>(
      `SELECT i.id,i.kind,i.subject,i.body,i.follow_up_at,i.created_at,p.full_name AS author_name
       FROM crm_interactions i LEFT JOIN user_profiles p ON p.user_id = i.author_id
       WHERE i.customer_id = ? ORDER BY i.created_at DESC LIMIT 100`,
      id,
    ),
    db.all<Record<string, unknown>>(`SELECT id,title,due_at,status,source,created_at FROM crm_tasks WHERE customer_id = ? ORDER BY status, due_at IS NULL, due_at`, id),
    db.all<Record<string, unknown>>(`SELECT id,subject,body,status,priority,created_at FROM support_tickets WHERE customer_id = ? ORDER BY created_at DESC`, id),
    db.all<Record<string, unknown>>(`SELECT score,created_at FROM health_snapshots WHERE customer_id = ? ORDER BY created_at DESC LIMIT 30`, id),
  ]);
  const health = await computeHealth(c.env, row);
  return c.json({
    customer: summary(row, row.owner_name),
    contacts,
    interactions,
    tasks,
    tickets,
    health,
    healthTrend: snapshots.reverse(),
  });
});

crmRoutes.patch('/customers/:id', async (c) => {
  const body = await parseBody(c, updateCustomerSchema);
  const db = new Db(c.env.DB);
  const sets: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    lifecycle_stage: body.lifecycleStage,
    owner_user_id: body.ownerUserId,
    mrr_cents: body.mrrCents,
    lat: body.lat,
    lng: body.lng,
    tags: body.tags ? JSON.stringify(body.tags) : undefined,
  };
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      params.push(val);
    }
  }
  if (!sets.length) throw new HttpError(400, 'Nothing to update');
  sets.push('updated_at = ?');
  params.push(now(), c.req.param('id'));
  const res = await db.run(`UPDATE crm_customers SET ${sets.join(', ')} WHERE id = ?`, ...params);
  if (!res.meta.changes) throw new HttpError(404, 'Customer not found');
  return c.json({ ok: true });
});

// --- Interactions (notes / calls / emails / meetings) ---
crmRoutes.post('/customers/:id/interactions', async (c) => {
  const auth = c.get('auth')!;
  const body = await parseBody(c, createInteractionSchema);
  const db = new Db(c.env.DB);
  const id = uuid();
  const ts = now();
  await db.run(
    `INSERT INTO crm_interactions (id,customer_id,author_id,kind,subject,body,follow_up_at,created_at) VALUES (?,?,?,?,?,?,?,?)`,
    id,
    c.req.param('id'),
    auth.userId,
    body.kind,
    body.subject ?? null,
    body.body,
    body.followUpAt ?? null,
    ts,
  );
  // If this is an email, enqueue a real send via the Cloudflare send_email binding.
  let emailed = false;
  if (body.kind === 'email') {
    const contact = await db.first<{ email: string | null }>(
      `SELECT email FROM crm_contacts WHERE customer_id = ? AND email IS NOT NULL ORDER BY is_primary DESC LIMIT 1`,
      c.req.param('id'),
    );
    if (contact?.email) {
      const subject = body.subject ?? 'A message from Bushi';
      const safe = body.body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      try {
        await c.env.JOBS?.send({
          kind: 'send_email',
          to: contact.email,
          subject,
          html: `<p style="font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${safe}</p>`,
          text: body.body,
        });
        emailed = true;
      } catch {
        /* queue not bound in local dev */
      }
    }
  }
  return c.json({ ok: true, id, emailed });
});

// --- Tasks ---
crmRoutes.post('/customers/:id/tasks', async (c) => {
  const auth = c.get('auth')!;
  const body = await parseBody(c, createTaskSchema);
  const db = new Db(c.env.DB);
  const id = uuid();
  const ts = now();
  await db.run(
    `INSERT INTO crm_tasks (id,customer_id,title,due_at,status,assignee_id,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    id,
    c.req.param('id'),
    body.title,
    body.dueAt ?? null,
    'open',
    auth.userId,
    'manual',
    ts,
    ts,
  );
  return c.json({ ok: true, id });
});

crmRoutes.patch('/tasks/:id', async (c) => {
  const body = await parseBody(c, updateTaskSchema);
  const db = new Db(c.env.DB);
  const ts = now();
  await db.run(
    `UPDATE crm_tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    body.status,
    body.status === 'done' ? ts : null,
    ts,
    c.req.param('id'),
  );
  return c.json({ ok: true });
});

// --- Support tickets ---
crmRoutes.post('/customers/:id/tickets', async (c) => {
  const body = await parseBody(c, createTicketSchema);
  const db = new Db(c.env.DB);
  const id = uuid();
  const ts = now();
  await db.run(
    `INSERT INTO support_tickets (id,customer_id,subject,body,status,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    id,
    c.req.param('id'),
    body.subject,
    body.body ?? null,
    'open',
    body.priority,
    ts,
    ts,
  );
  return c.json({ ok: true, id });
});

crmRoutes.patch('/tickets/:id', async (c) => {
  const body = await parseBody(c, updateTicketSchema);
  const db = new Db(c.env.DB);
  await db.run(`UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?`, body.status, now(), c.req.param('id'));
  return c.json({ ok: true });
});

// --- Health recompute ---
crmRoutes.post('/customers/:id/health/recompute', async (c) => {
  const db = new Db(c.env.DB);
  const row = await db.first<CustomerRow>(`SELECT * FROM crm_customers WHERE id = ?`, c.req.param('id'));
  if (!row) throw new HttpError(404, 'Customer not found');
  const result = await computeHealth(c.env, row);
  await db.run(
    `UPDATE crm_customers SET health_score = ?, health_reason = ?, health_updated_at = ?, updated_at = ? WHERE id = ?`,
    result.score,
    result.reason,
    now(),
    now(),
    row.id,
  );
  return c.json(result);
});

crmRoutes.post('/recompute-all', async (c) => {
  const result = await recomputeAllHealth(c.env);
  return c.json({ ok: true, ...result });
});

// --- Bootstrap: create a crm_customers row for every org that lacks one ---
crmRoutes.post('/bootstrap', async (c) => {
  const db = new Db(c.env.DB);
  const orgs = await db.all<{ id: string; name: string; plan_tier: string }>(
    `SELECT o.id, o.name, o.plan_tier FROM organizations o
     WHERE o.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM crm_customers c WHERE c.org_id = o.id)`,
  );
  const mrr: Record<string, number> = { free: 0, starter: 4900, pro: 14900, enterprise: 49900 };
  let created = 0;
  const ts = now();
  for (const o of orgs) {
    await db.run(
      `INSERT INTO crm_customers (id,org_id,name,lifecycle_stage,mrr_cents,health_score,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
      uuid(),
      o.id,
      o.name,
      'active',
      mrr[o.plan_tier] ?? 0,
      60,
      ts,
      ts,
    );
    created++;
  }
  const health = await recomputeAllHealth(c.env);
  return c.json({ ok: true, created, ...health });
});
