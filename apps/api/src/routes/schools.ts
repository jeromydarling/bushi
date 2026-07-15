import { Hono } from 'hono';
import { createAthleteSchema, createSchoolSchema } from '@bushi/domain';
import { Db, now, type AthleteRow, type SchoolRow } from '@bushi/db';
import type { AppBindings } from '../types.js';
import type { AuthContext } from '../env.js';
import { HttpError, parseBody } from '../lib/http.js';
import { uuid } from '../lib/crypto.js';
import { requireAuth, isPlatformAdmin, roleInOrg } from '../middleware/auth.js';

export const schoolRoutes = new Hono<AppBindings>();

/** A school is accessible if the caller owns its org, has claimed it, or is a platform admin. */
function assertSchoolAccess(auth: AuthContext, school: SchoolRow): void {
  if (isPlatformAdmin(auth)) return;
  if (school.org_id && roleInOrg(auth, school.org_id)) return;
  if (school.claimed_by && school.claimed_by === auth.userId) return;
  throw new HttpError(403, 'Forbidden');
}

schoolRoutes.get('/', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const rows = await db.all<SchoolRow>(
    `SELECT * FROM schools WHERE (org_id = ? OR org_id IS NULL) AND deleted_at IS NULL ORDER BY name`,
    auth.orgId,
  );
  return c.json({ schools: rows });
});

schoolRoutes.post('/', requireAuth, async (c) => {
  const body = await parseBody(c, createSchoolSchema);
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const ts = now();
  const id = uuid();
  await db.run(
    `INSERT INTO schools (id,org_id,name,slug,styles,bio,city,region,country,claimed_by,is_public,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    auth.orgId,
    body.name,
    body.slug,
    JSON.stringify(body.styles),
    body.bio ?? null,
    body.city ?? null,
    body.region ?? null,
    body.country ?? null,
    auth.userId,
    1,
    ts,
    ts,
  );
  const school = await db.first<SchoolRow>(`SELECT * FROM schools WHERE id = ?`, id);
  return c.json({ school }, 201);
});

schoolRoutes.get('/:id/athletes', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const school = await db.first<SchoolRow>(
    `SELECT * FROM schools WHERE id = ? AND deleted_at IS NULL`,
    c.req.param('id'),
  );
  if (!school) throw new HttpError(404, 'School not found');
  assertSchoolAccess(auth, school);
  const athletes = await db.all<AthleteRow>(
    `SELECT * FROM athletes WHERE school_id = ? AND deleted_at IS NULL ORDER BY last_name, first_name`,
    school.id,
  );
  return c.json({ athletes });
});

schoolRoutes.post('/:id/athletes', requireAuth, async (c) => {
  const body = await parseBody(c, createAthleteSchema);
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const school = await db.first<SchoolRow>(
    `SELECT * FROM schools WHERE id = ? AND deleted_at IS NULL`,
    c.req.param('id'),
  );
  if (!school) throw new HttpError(404, 'School not found');
  assertSchoolAccess(auth, school);
  const ts = now();
  const id = uuid();
  await db.run(
    `INSERT INTO athletes (id,school_id,first_name,last_name,date_of_birth,gender,primary_style,belt_rank,is_public,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    school.id,
    body.firstName,
    body.lastName,
    body.dateOfBirth ?? null,
    body.gender ?? null,
    body.primaryStyle ?? null,
    body.beltRank ?? null,
    0,
    ts,
    ts,
  );
  const athlete = await db.first<AthleteRow>(`SELECT * FROM athletes WHERE id = ?`, id);
  return c.json({ athlete }, 201);
});

// Bulk CSV import: accepts { schoolId, rows: [{firstName,lastName,...}] }.
schoolRoutes.post('/:id/athletes/import', requireAuth, async (c) => {
  const payload = await c.req.json<{ rows?: Array<Record<string, string>> }>();
  const rows = payload.rows ?? [];
  if (!rows.length) throw new HttpError(400, 'No rows provided');
  const auth = c.get('auth')!;
  const db = new Db(c.env.DB);
  const schoolId = c.req.param('id');
  const school = await db.first<SchoolRow>(
    `SELECT * FROM schools WHERE id = ? AND deleted_at IS NULL`,
    schoolId,
  );
  if (!school) throw new HttpError(404, 'School not found');
  assertSchoolAccess(auth, school);
  const ts = now();
  const statements = rows
    .filter((r) => r.firstName && r.lastName)
    .map((r) => ({
      sql: `INSERT INTO athletes (id,school_id,first_name,last_name,gender,primary_style,belt_rank,is_public,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      params: [uuid(), schoolId, r.firstName, r.lastName, r.gender ?? null, r.primaryStyle ?? null, r.beltRank ?? null, 0, ts, ts],
    }));
  await db.batch(statements);
  return c.json({ imported: statements.length });
});
