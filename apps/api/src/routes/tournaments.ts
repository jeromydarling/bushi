import { Hono } from 'hono';
import {
  createDivisionSchema,
  createTournamentSchema,
  updateTournamentStatusSchema,
} from '@bushi/domain';
import { generateBracket, type BracketFormat, type Competitor } from '@bushi/brackets';
import { Db, now, type DivisionRow, type TournamentRow } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { HttpError, parseBody } from '../lib/http.js';
import { uuid } from '../lib/crypto.js';
import { requireAuth } from '../middleware/auth.js';

export const tournamentRoutes = new Hono<AppBindings>();

// List tournaments for the caller's organization.
tournamentRoutes.get('/', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const rows = await db.all<TournamentRow>(
    `SELECT * FROM tournaments WHERE org_id = ? AND deleted_at IS NULL ORDER BY start_date DESC`,
    auth.orgId,
  );
  return c.json({ tournaments: rows });
});

tournamentRoutes.post('/', requireAuth, async (c) => {
  const body = await parseBody(c, createTournamentSchema);
  const db = new Db(c.env.DB);
  const ts = now();
  const id = uuid();
  await db.run(
    `INSERT INTO tournaments (id,org_id,name,slug,styles,status,description,start_date,end_date,venue_name,city,region,country,is_public,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    body.organizationId,
    body.name,
    body.slug,
    JSON.stringify(body.styles),
    'draft',
    body.description ?? null,
    body.startDate,
    body.endDate ?? null,
    body.venueName ?? null,
    body.city ?? null,
    body.region ?? null,
    body.country ?? null,
    0,
    ts,
    ts,
  );
  const created = await db.first<TournamentRow>(`SELECT * FROM tournaments WHERE id = ?`, id);
  return c.json({ tournament: created }, 201);
});

tournamentRoutes.get('/:id', requireAuth, async (c) => {
  const db = new Db(c.env.DB);
  const tournament = await db.first<TournamentRow>(
    `SELECT * FROM tournaments WHERE id = ? AND deleted_at IS NULL`,
    c.req.param('id'),
  );
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  const divisions = await db.all<DivisionRow>(
    `SELECT * FROM divisions WHERE tournament_id = ? ORDER BY created_at`,
    tournament.id,
  );
  return c.json({ tournament, divisions });
});

tournamentRoutes.patch('/:id/status', requireAuth, async (c) => {
  const body = await parseBody(c, updateTournamentStatusSchema);
  const db = new Db(c.env.DB);
  const res = await db.run(
    `UPDATE tournaments SET status = ?, is_public = ?, updated_at = ? WHERE id = ?`,
    body.status,
    body.status === 'draft' ? 0 : 1,
    now(),
    c.req.param('id'),
  );
  if (!res.meta.changes) throw new HttpError(404, 'Tournament not found');
  return c.json({ ok: true, status: body.status });
});

// --- divisions ---

tournamentRoutes.post('/:id/divisions', requireAuth, async (c) => {
  const body = await parseBody(c, createDivisionSchema);
  const db = new Db(c.env.DB);
  const ts = now();
  const id = uuid();
  await db.run(
    `INSERT INTO divisions (id,tournament_id,name,style,format,gender,age_min,age_max,weight_min_kg,weight_max_kg,belt_rank,cap,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    c.req.param('id'),
    body.name,
    body.style,
    body.format,
    body.gender ?? null,
    body.ageMin ?? null,
    body.ageMax ?? null,
    body.weightMinKg ?? null,
    body.weightMaxKg ?? null,
    body.beltRank ?? null,
    body.cap ?? null,
    'open',
    ts,
    ts,
  );
  const division = await db.first<DivisionRow>(`SELECT * FROM divisions WHERE id = ?`, id);
  return c.json({ division }, 201);
});

// Generate (or regenerate) the bracket for a division from its checked-in entries.
tournamentRoutes.post('/divisions/:divisionId/bracket', requireAuth, async (c) => {
  const db = new Db(c.env.DB);
  const divisionId = c.req.param('divisionId');
  const division = await db.first<DivisionRow>(`SELECT * FROM divisions WHERE id = ?`, divisionId);
  if (!division) throw new HttpError(404, 'Division not found');

  const entries = await db.all<{ athlete_id: string; seed: number | null; first_name: string; last_name: string; school_id: string | null }>(
    `SELECT e.athlete_id, e.seed, a.first_name, a.last_name, a.school_id
     FROM division_entries e JOIN athletes a ON a.id = e.athlete_id
     WHERE e.division_id = ? AND e.status IN ('registered','checked_in','weighed_in')
     ORDER BY e.seed IS NULL, e.seed`,
    divisionId,
  );
  if (entries.length < 2) throw new HttpError(400, 'Need at least two entries to build a bracket');

  const competitors: Competitor[] = entries.map((e) => ({
    id: e.athlete_id,
    name: `${e.first_name} ${e.last_name}`,
    seed: e.seed ?? undefined,
    schoolId: e.school_id ?? undefined,
  }));

  const bracket = generateBracket(competitors, {
    format: division.format as BracketFormat,
    thirdPlace: true,
  });

  const ts = now();
  const bracketId = uuid();
  await db.run(
    `INSERT INTO brackets (id,division_id,format,rounds,data,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(division_id) DO UPDATE SET format=excluded.format, rounds=excluded.rounds, data=excluded.data, updated_at=excluded.updated_at`,
    bracketId,
    divisionId,
    bracket.format,
    bracket.rounds,
    JSON.stringify(bracket),
    ts,
    ts,
  );
  await db.run(`UPDATE divisions SET status = 'seeded', updated_at = ? WHERE id = ?`, ts, divisionId);
  return c.json({ bracket });
});
