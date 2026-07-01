import { Hono } from 'hono';
import { registrationSchema } from '@bushi/domain';
import { Db, now } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { HttpError, parseBody } from '../lib/http.js';
import { uuid } from '../lib/crypto.js';

export const registrationRoutes = new Hono<AppBindings>();

const ENTRY_FEE_CENTS = 6500;

// Public self/school registration for a tournament.
registrationRoutes.post('/', async (c) => {
  const body = await parseBody(c, registrationSchema);
  const db = new Db(c.env.DB);
  const ts = now();

  // Enforce division caps / waitlist.
  let waitlisted = false;
  for (const divisionId of body.divisionIds) {
    const division = await db.first<{ cap: number | null }>(`SELECT cap FROM divisions WHERE id = ?`, divisionId);
    if (!division) throw new HttpError(404, `Division ${divisionId} not found`);
    if (division.cap != null) {
      const count = await db.first<{ n: number }>(
        `SELECT COUNT(*) AS n FROM division_entries WHERE division_id = ? AND status != 'withdrawn'`,
        divisionId,
      );
      if ((count?.n ?? 0) >= division.cap) waitlisted = true;
    }
  }

  const registrationId = uuid();
  const amount = body.divisionIds.length * ENTRY_FEE_CENTS;
  const statements = [
    {
      sql: `INSERT INTO registrations (id,tournament_id,athlete_id,status,amount_cents,currency,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?)`,
      params: [registrationId, body.tournamentId, body.athleteId, waitlisted ? 'waitlisted' : 'awaiting_payment', amount, 'usd', ts, ts],
    },
    {
      sql: `INSERT INTO waiver_acceptances (id,tournament_id,athlete_id,registration_id,created_at) VALUES (?,?,?,?,?)`,
      params: [uuid(), body.tournamentId, body.athleteId, registrationId, ts],
    },
  ];
  for (const divisionId of body.divisionIds) {
    statements.push({
      sql: `INSERT INTO registration_items (id,registration_id,division_id,amount_cents,created_at) VALUES (?,?,?,?,?)`,
      params: [uuid(), registrationId, divisionId, ENTRY_FEE_CENTS, ts],
    });
    statements.push({
      sql: `INSERT INTO division_entries (id,division_id,athlete_id,status,created_at,updated_at)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(division_id, athlete_id) DO NOTHING`,
      params: [uuid(), divisionId, body.athleteId, waitlisted ? 'registered' : 'registered', ts, ts],
    });
  }
  await db.batch(statements);

  return c.json({ registrationId, status: waitlisted ? 'waitlisted' : 'awaiting_payment', amountCents: amount }, 201);
});

registrationRoutes.get('/tournament/:tournamentId', async (c) => {
  const db = new Db(c.env.DB);
  const rows = await db.all<Record<string, unknown>>(
    `SELECT r.id, r.status, r.amount_cents, a.first_name, a.last_name, s.name AS school
     FROM registrations r
     JOIN athletes a ON a.id = r.athlete_id
     LEFT JOIN schools s ON s.id = a.school_id
     WHERE r.tournament_id = ? ORDER BY r.created_at DESC`,
    c.req.param('tournamentId'),
  );
  return c.json({ registrations: rows });
});
