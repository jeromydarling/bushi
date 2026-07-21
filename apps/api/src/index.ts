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
import { mediaRoutes } from './routes/media.js';
import { inviteRoutes } from './routes/invites.js';
import { recomputeAllHealth } from './lib/health.js';
import { getMailer } from './lib/mailer.js';
import { tournamentReminderEmail, postEventRecapEmail } from '@bushi/notifications';

export { MatRoom } from './do/MatRoom.js';

const app = new Hono<AppBindings>();

// Strict CORS allowlist — never reflect an arbitrary origin while allowing
// credentials. Allowed = the configured app origin (APP_BASE_URL) plus local dev.
app.use('*', (c, next) =>
  cors({
    origin: (origin) => {
      const allowed = [c.env.APP_BASE_URL, 'http://localhost:5173', 'http://localhost:8787'].filter(
        (o): o is string => Boolean(o),
      );
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
  })(c, next),
);
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
app.route('/api/invites', inviteRoutes);
app.route('/media', mediaRoutes);

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
        pruneExpired(env),
        sendTournamentReminders(env),
        sendPostEventRecaps(env),
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

const DAY_MS = 86_400_000;

/** Distinct registrant emails for a tournament (people who registered someone). */
async function registrantEmails(db: Db, tournamentId: string): Promise<string[]> {
  const rows = await db.all<{ email: string }>(
    `SELECT DISTINCT u.email FROM registrations r JOIN users u ON u.id = r.registered_by
     WHERE r.tournament_id = ? AND r.registered_by IS NOT NULL AND r.status != 'withdrawn'`,
    tournamentId,
  );
  return rows.map((r) => r.email).filter(Boolean);
}

/** Email registrants a reminder for tournaments starting in the next ~3 days (once). */
async function sendTournamentReminders(env: Env): Promise<void> {
  const db = new Db(env.DB);
  const today = new Date(Date.now()).toISOString().slice(0, 10);
  const in3 = new Date(Date.now() + 3 * DAY_MS).toISOString().slice(0, 10);
  const rows = await db.all<{ id: string; name: string; slug: string; start_date: string; city: string | null; region: string | null }>(
    `SELECT id,name,slug,start_date,city,region FROM tournaments
     WHERE is_public = 1 AND deleted_at IS NULL AND status NOT IN ('completed','cancelled','archived','draft')
       AND start_date >= ? AND start_date <= ?`,
    today,
    in3,
  );
  for (const t of rows) {
    const flag = `reminded:${t.id}`;
    if (await env.CACHE.get(flag)) continue;
    const mail = tournamentReminderEmail({
      tournamentName: t.name,
      date: t.start_date,
      location: [t.city, t.region].filter(Boolean).join(', '),
      checkInTime: '9:00 AM',
      detailsUrl: `${env.APP_BASE_URL}/t/${t.slug}`,
    });
    for (const email of await registrantEmails(db, t.id)) {
      try {
        await env.JOBS.send({ kind: 'send_email', to: email, subject: mail.subject, html: mail.html, text: mail.text });
      } catch { /* queue unavailable */ }
    }
    await env.CACHE.put(flag, '1', { expirationTtl: 14 * 24 * 3600 });
  }
}

/** Email registrants a recap for recently-completed tournaments (once). */
async function sendPostEventRecaps(env: Env): Promise<void> {
  const db = new Db(env.DB);
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10);
  const rows = await db.all<{ id: string; name: string; slug: string }>(
    `SELECT id,name,slug FROM tournaments WHERE status = 'completed' AND deleted_at IS NULL AND start_date >= ?`,
    since,
  );
  for (const t of rows) {
    const flag = `recapped:${t.id}`;
    if (await env.CACHE.get(flag)) continue;
    const mail = postEventRecapEmail({
      tournamentName: t.name,
      recapBody: `Thanks for competing at ${t.name}. Full brackets and final results are live.`,
      recapUrl: `${env.APP_BASE_URL}/t/${t.slug}/results`,
    });
    for (const email of await registrantEmails(db, t.id)) {
      try {
        await env.JOBS.send({ kind: 'send_email', to: email, subject: mail.subject, html: mail.html, text: mail.text });
      } catch { /* queue unavailable */ }
    }
    await env.CACHE.put(flag, '1', { expirationTtl: 60 * 24 * 3600 });
  }
}

/** Housekeeping: drop expired/revoked sessions and spent reset tokens. */
async function pruneExpired(env: Env): Promise<void> {
  const db = new Db(env.DB);
  const cutoff = Date.now();
  await db.run(`DELETE FROM sessions WHERE expires_at < ? OR revoked_at IS NOT NULL`, cutoff);
  await db.run(`DELETE FROM password_reset_tokens WHERE expires_at < ? OR used_at IS NOT NULL`, cutoff);
}

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
    case 'send_email': {
      // Native Cloudflare Email Sending (or console in dev).
      await getMailer(env).sendEmail({ to: job.to, subject: job.subject, html: job.html, text: job.text });
      return;
    }
    case 'generate_asset':
      // Handled by @bushi/rendering (Browser Rendering → R2) in the full build.
      console.log('Queued job acknowledged:', job.kind);
      return;
  }
}
