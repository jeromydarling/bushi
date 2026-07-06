/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Db, now } from '@bushi/db';
import type { AppBindings } from './types.js';
import type { Env, JobMessage } from './env.js';
import { HttpError } from './lib/http.js';
import { uuid } from './lib/crypto.js';
import { loadSession } from './middleware/auth.js';
import { ingestAll } from './lib/discovery.js';
import { authRoutes } from './routes/auth.js';
import { tournamentRoutes } from './routes/tournaments.js';
import { schoolRoutes } from './routes/schools.js';
import { registrationRoutes } from './routes/registrations.js';
import { liveRoutes } from './routes/live.js';
import { publicRoutes } from './routes/public.js';
import { billingRoutes } from './routes/billing.js';
import { aiRoutes } from './routes/ai.js';
import { adminRoutes } from './routes/admin.js';
import { crmRoutes } from './routes/crm.js';
import { recomputeAllHealth } from './lib/health.js';

export { MatRoom } from './do/MatRoom.js';

const app = new Hono<AppBindings>();

app.use('*', cors({ origin: (o) => o, credentials: true }));
app.use('*', loadSession);

app.get('/api/health', (c) =>
  c.json({ status: 'ok', service: 'bushi-api', environment: c.env.ENVIRONMENT }),
);

app.route('/api/auth', authRoutes);
app.route('/api/tournaments', tournamentRoutes);
app.route('/api/schools', schoolRoutes);
app.route('/api/registrations', registrationRoutes);
app.route('/api/live', liveRoutes);
app.route('/api/public', publicRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/admin/crm', crmRoutes);

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message, details: err.details }, err.status as never);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default {
  fetch: app.fetch,

  /** Cron trigger — nightly discovery (Perplexity) + customer-health recompute. */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      Promise.allSettled([
        ingestAll(env).then((r) => console.log('Discovery run:', r)),
        recomputeAllHealth(env).then((r) => console.log('Health recompute:', r)),
      ]).then((results) => {
        for (const r of results) if (r.status === 'rejected') console.error('Scheduled task failed:', r.reason);
      }),
    );
  },

  /** Queue consumer — background side effects (persistence, email, indexing). */
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    const db = new Db(env.DB);
    for (const msg of batch.messages) {
      try {
        await handleJob(msg.body, db, env);
        msg.ack();
      } catch (err) {
        console.error('Job failed:', msg.body.kind, err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env, JobMessage>;

async function handleJob(job: JobMessage, db: Db, env: Env): Promise<void> {
  switch (job.kind) {
    case 'persist_match_result': {
      await db.run(
        `UPDATE matches SET status = 'completed', winner_athlete_id = ?, method = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
        job.winnerAthleteId,
        job.method,
        now(),
        now(),
        job.matchId,
      );
      return;
    }
    case 'index_entity': {
      // Placeholder: compute an embedding and upsert into Vectorize.
      await db.run(
        `INSERT INTO search_embeddings_refs (id,entity_type,entity_id,vectorize_id,model,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?)
         ON CONFLICT(entity_type, entity_id) DO UPDATE SET updated_at = excluded.updated_at`,
        uuid(),
        job.entityType,
        job.entityId,
        `${job.entityType}:${job.entityId}`,
        '@cf/baai/bge-base-en-v1.5',
        now(),
        now(),
      );
      return;
    }
    case 'send_email':
    case 'generate_asset':
      // Handled by @bushi/notifications / @bushi/rendering in the full build.
      console.log('Queued job acknowledged:', job.kind);
      return;
  }
}
