import { AT_RISK_THRESHOLD } from '@bushi/domain';
import { Db, now } from '@bushi/db';
import type { Env } from '../env.js';
import { uuid } from './crypto.js';

export interface HealthFactor {
  label: string;
  value: number; // contribution (+/-)
}
export interface HealthResult {
  score: number;
  reason: string;
  factors: HealthFactor[];
}

interface CustomerRow {
  id: string;
  org_id: string | null;
  health_score: number;
  health_reason: string | null;
}

/**
 * Compute a 0–100 health score for a customer from real usage signals in D1.
 * Standalone/demo customers (no org_id) keep their stored score.
 */
export async function computeHealth(env: Env, customer: CustomerRow): Promise<HealthResult> {
  if (!customer.org_id) {
    return { score: customer.health_score, reason: customer.health_reason ?? 'Manual', factors: [] };
  }
  const db = new Db(env.DB);
  const orgId = customer.org_id;
  const today = new Date().toISOString().slice(0, 10);
  const factors: HealthFactor[] = [{ label: 'Baseline', value: 55 }];

  // Subscription state.
  const sub = await db.first<{ status: string; tier: string }>(
    `SELECT status, tier FROM subscriptions WHERE org_id = ?`,
    orgId,
  );
  if (sub) {
    if (sub.status === 'active' || sub.status === 'trialing') factors.push({ label: 'Subscription active', value: 15 });
    else if (sub.status === 'past_due') factors.push({ label: 'Payment past due', value: -25 });
    else if (sub.status === 'canceled') factors.push({ label: 'Subscription canceled', value: -40 });
    if (sub.tier === 'pro' || sub.tier === 'enterprise') factors.push({ label: 'Premium plan', value: 5 });
  } else {
    factors.push({ label: 'No subscription', value: -10 });
  }

  // Tournament activity.
  const counts = await db.first<{ total: number; upcoming: number; recent: number; last_start: string | null }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN start_date >= ? AND status != 'draft' THEN 1 ELSE 0 END) AS upcoming,
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS recent,
       MAX(start_date) AS last_start
     FROM tournaments WHERE org_id = ? AND deleted_at IS NULL`,
    today,
    now() - 90 * 86400_000,
    orgId,
  );
  const total = counts?.total ?? 0;
  if (total === 0) factors.push({ label: 'No tournaments yet', value: -12 });
  if ((counts?.upcoming ?? 0) > 0) factors.push({ label: 'Upcoming event scheduled', value: 15 });
  if ((counts?.recent ?? 0) > 0) factors.push({ label: 'Created an event recently', value: 10 });
  if (counts?.last_start) {
    const days = Math.floor((Date.now() - Date.parse(`${counts.last_start}T00:00:00Z`)) / 86400_000);
    if (days > 180) factors.push({ label: `No event in ${days} days`, value: -18 });
  }

  // Registration volume (engagement proxy).
  const regs = await db.first<{ n: number }>(
    `SELECT COUNT(*) AS n FROM registrations r JOIN tournaments t ON t.id = r.tournament_id WHERE t.org_id = ?`,
    orgId,
  );
  if ((regs?.n ?? 0) > 100) factors.push({ label: 'Strong registration volume', value: 10 });
  else if ((regs?.n ?? 0) > 0) factors.push({ label: 'Some registrations', value: 4 });

  const raw = factors.reduce((sum, f) => sum + f.value, 0);
  const score = Math.max(0, Math.min(100, raw));
  // Reason = the most negative factor if at-risk, else the strongest positive.
  const sorted = [...factors].filter((f) => f.label !== 'Baseline').sort((a, b) => a.value - b.value);
  const reason =
    score < AT_RISK_THRESHOLD
      ? sorted[0]?.label ?? 'Low engagement'
      : sorted[sorted.length - 1]?.label ?? 'Healthy';

  return { score, reason, factors };
}

/** Persist a computed score + snapshot; nudge lifecycle stage on at-risk. */
export async function applyHealth(env: Env, customer: CustomerRow, result: HealthResult): Promise<void> {
  const db = new Db(env.DB);
  const ts = now();
  await db.run(
    `UPDATE crm_customers SET health_score = ?, health_reason = ?, health_updated_at = ?, updated_at = ? WHERE id = ?`,
    result.score,
    result.reason,
    ts,
    ts,
    customer.id,
  );
  await db.run(
    `INSERT INTO health_snapshots (id,customer_id,score,reason,created_at) VALUES (?,?,?,?,?)`,
    uuid(),
    customer.id,
    result.score,
    result.reason,
    ts,
  );
}

/**
 * Recompute every customer's health. When a customer newly drops below the
 * at-risk threshold, move them to 'at_risk' and auto-create a follow-up task
 * (the proactive retention play).
 */
export async function recomputeAllHealth(env: Env): Promise<{ updated: number; flagged: number }> {
  const db = new Db(env.DB);
  const customers = await db.all<CustomerRow & { lifecycle_stage: string }>(
    `SELECT id, org_id, health_score, health_reason, lifecycle_stage FROM crm_customers`,
  );
  let updated = 0;
  let flagged = 0;
  for (const c of customers) {
    const result = await computeHealth(env, c);
    await applyHealth(env, c, result);
    updated++;
    const wasHealthy = c.health_score >= AT_RISK_THRESHOLD;
    if (result.score < AT_RISK_THRESHOLD && wasHealthy && c.lifecycle_stage !== 'churned') {
      flagged++;
      const ts = now();
      await db.run(
        `UPDATE crm_customers SET lifecycle_stage = 'at_risk', updated_at = ? WHERE id = ?`,
        ts,
        c.id,
      );
      await db.run(
        `INSERT INTO crm_tasks (id,customer_id,title,due_at,status,source,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        uuid(),
        c.id,
        `Reach out — health dropped (${result.reason})`,
        ts + 2 * 86400_000,
        'open',
        'at_risk_auto',
        ts,
        ts,
      );
    }
  }
  return { updated, flagged };
}
