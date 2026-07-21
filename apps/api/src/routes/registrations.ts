import { Hono } from 'hono';
import { registrationSchema } from '@bushi/domain';
import { registrationConfirmationEmail } from '@bushi/notifications';
import { Db, now } from '@bushi/db';
import type { AppBindings } from '../types.js';
import type { AuthContext } from '../env.js';
import { HttpError, parseBody } from '../lib/http.js';
import { uuid } from '../lib/crypto.js';
import { requireAuth, assertOrgAccess, isPlatformAdmin, roleInOrg } from '../middleware/auth.js';

export const registrationRoutes = new Hono<AppBindings>();

const ENTRY_FEE_CENTS = 6500;

/** The caller may register an athlete only if they manage its school. */
async function assertAthleteSchoolAccess(db: Db, auth: AuthContext, schoolId: string | null): Promise<void> {
  if (isPlatformAdmin(auth)) return;
  if (!schoolId) throw new HttpError(403, 'This athlete is not attached to a school you manage');
  const school = await db.first<{ org_id: string | null; claimed_by: string | null }>(
    `SELECT org_id, claimed_by FROM schools WHERE id = ? AND deleted_at IS NULL`,
    schoolId,
  );
  if (!school) throw new HttpError(404, 'School not found');
  if (school.org_id && roleInOrg(auth, school.org_id)) return;
  if (school.claimed_by && school.claimed_by === auth.userId) return;
  throw new HttpError(403, 'You do not manage this athlete');
}

// Registration for a tournament — authenticated; caller must manage the athlete.
registrationRoutes.post('/', requireAuth, async (c) => {
  const body = await parseBody(c, registrationSchema);
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const ts = now();

  // Tournament must exist, be public, and still be open for registration.
  const tournament = await db.first<{
    id: string;
    is_public: number;
    status: string;
    name: string;
    slug: string;
    start_date: string;
    city: string | null;
    region: string | null;
  }>(
    `SELECT id, is_public, status, name, slug, start_date, city, region FROM tournaments WHERE id = ? AND deleted_at IS NULL`,
    body.tournamentId,
  );
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  const closed = tournament.status === 'completed' || tournament.status === 'cancelled' || tournament.status === 'archived';
  if (!tournament.is_public || closed) throw new HttpError(400, 'Registration is not open for this tournament');

  // The athlete must belong to a school the caller manages.
  const athlete = await db.first<{ id: string; school_id: string | null; first_name: string; last_name: string }>(
    `SELECT id, school_id, first_name, last_name FROM athletes WHERE id = ? AND deleted_at IS NULL`,
    body.athleteId,
  );
  if (!athlete) throw new HttpError(404, 'Athlete not found');
  await assertAthleteSchoolAccess(db, auth, athlete.school_id);

  // Enforce division caps / waitlist — and that each division belongs to this tournament.
  let waitlisted = false;
  const divisionNames: string[] = [];
  for (const divisionId of body.divisionIds) {
    const division = await db.first<{ cap: number | null; tournament_id: string; name: string }>(
      `SELECT cap, tournament_id, name FROM divisions WHERE id = ?`,
      divisionId,
    );
    if (!division) throw new HttpError(404, `Division ${divisionId} not found`);
    if (division.tournament_id !== body.tournamentId) {
      throw new HttpError(400, 'Division does not belong to this tournament');
    }
    divisionNames.push(division.name);
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
      params: [uuid(), divisionId, body.athleteId, 'registered', ts, ts],
    });
  }
  await db.batch(statements);

  // Registration confirmation email to the registering user (best-effort).
  const confirm = registrationConfirmationEmail({
    athleteName: `${athlete.first_name} ${athlete.last_name}`,
    tournamentName: tournament.name,
    division: divisionNames.join(', ') || '—',
    date: tournament.start_date,
    location: [tournament.city, tournament.region].filter(Boolean).join(', '),
    detailsUrl: `${c.env.APP_BASE_URL}/t/${tournament.slug}`,
  });
  try {
    await c.env.JOBS?.send({ kind: 'send_email', to: auth.email, subject: confirm.subject, html: confirm.html, text: confirm.text });
  } catch {
    /* queue not bound in dev */
  }

  return c.json({ registrationId, status: waitlisted ? 'waitlisted' : 'awaiting_payment', amountCents: amount }, 201);
});

// Registrant roster (PII) — restricted to organizers of the tournament's org.
registrationRoutes.get('/tournament/:tournamentId', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const tournament = await db.first<{ org_id: string }>(
    `SELECT org_id FROM tournaments WHERE id = ? AND deleted_at IS NULL`,
    c.req.param('tournamentId'),
  );
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  assertOrgAccess(auth, tournament.org_id, 'owner', 'organizer');
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
