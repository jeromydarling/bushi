import { Hono } from 'hono';
import { Db, type SchoolRow, type TournamentRow } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { HttpError } from '../lib/http.js';

/** Unauthenticated, cacheable, SEO-facing endpoints. */
export const publicRoutes = new Hono<AppBindings>();

// Tournament discovery with keyword + style + timeframe filters.
publicRoutes.get('/discover', async (c) => {
  const db = new Db(c.env.DB);
  const q = c.req.query('q')?.trim();
  const style = c.req.query('style');
  const timeframe = c.req.query('timeframe') ?? 'all';
  const today = new Date().toISOString().slice(0, 10);

  const clauses = ["is_public = 1", 'deleted_at IS NULL'];
  const params: unknown[] = [];
  if (q) {
    clauses.push('(name LIKE ? OR city LIKE ? OR region LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (style) {
    clauses.push('styles LIKE ?');
    params.push(`%"${style}"%`);
  }
  if (timeframe === 'upcoming') {
    clauses.push('start_date >= ?');
    params.push(today);
  } else if (timeframe === 'completed') {
    clauses.push("status = 'completed'");
  }

  const rows = await db.all<TournamentRow>(
    `SELECT * FROM tournaments WHERE ${clauses.join(' AND ')} ORDER BY start_date DESC LIMIT 60`,
    ...params,
  );
  return c.json({ tournaments: rows });
});

publicRoutes.get('/tournaments/:slug', async (c) => {
  const db = new Db(c.env.DB);
  const tournament = await db.first<TournamentRow>(
    `SELECT * FROM tournaments WHERE slug = ? AND is_public = 1 AND deleted_at IS NULL`,
    c.req.param('slug'),
  );
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  const [divisions, sponsors] = await Promise.all([
    db.all<Record<string, unknown>>(`SELECT id,name,style,format,status FROM divisions WHERE tournament_id = ?`, tournament.id),
    db.all<Record<string, unknown>>(`SELECT name,tier,logo_url,website FROM sponsors WHERE tournament_id = ?`, tournament.id),
  ]);
  return c.json({ tournament, divisions, sponsors });
});

// Public live results/brackets for a tournament.
publicRoutes.get('/tournaments/:slug/results', async (c) => {
  const db = new Db(c.env.DB);
  const tournament = await db.first<TournamentRow>(
    `SELECT * FROM tournaments WHERE slug = ? AND is_public = 1`,
    c.req.param('slug'),
  );
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  const brackets = await db.all<{ division_id: string; data: string | null }>(
    `SELECT b.division_id, b.data FROM brackets b JOIN divisions d ON d.id = b.division_id WHERE d.tournament_id = ?`,
    tournament.id,
  );
  const matches = await db.all<Record<string, unknown>>(
    `SELECT id,division_id,round,ordinal,label,status,winner_athlete_id,method FROM matches WHERE tournament_id = ? ORDER BY division_id, round, ordinal`,
    tournament.id,
  );
  return c.json({
    tournament,
    brackets: brackets.map((b) => ({ divisionId: b.division_id, bracket: b.data ? JSON.parse(b.data) : null })),
    matches,
  });
});

publicRoutes.get('/schools/:slug', async (c) => {
  const db = new Db(c.env.DB);
  const school = await db.first<SchoolRow>(
    `SELECT * FROM schools WHERE slug = ? AND is_public = 1 AND deleted_at IS NULL`,
    c.req.param('slug'),
  );
  if (!school) throw new HttpError(404, 'School not found');
  const [profile, athletes, rankings] = await Promise.all([
    db.first<Record<string, unknown>>(`SELECT * FROM public_school_profiles WHERE school_id = ?`, school.id),
    db.all<Record<string, unknown>>(
      `SELECT first_name,last_name,primary_style,belt_rank FROM athletes WHERE school_id = ? AND is_public = 1 ORDER BY last_name LIMIT 24`,
      school.id,
    ),
    db.all<Record<string, unknown>>(`SELECT style,region,points,rank,period FROM school_rankings WHERE school_id = ?`, school.id),
  ]);
  return c.json({ school, profile, athletes, rankings });
});
