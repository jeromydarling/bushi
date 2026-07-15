import { Hono } from 'hono';
import { Db, type SchoolRow, type TournamentRow } from '@bushi/db';
import type { AppBindings } from '../types.js';
import { HttpError } from '../lib/http.js';
import { ingestQuery } from '../lib/discovery.js';
import { clientIp, rateLimit } from '../lib/ratelimit.js';

/** Unauthenticated, cacheable, SEO-facing endpoints. */
export const publicRoutes = new Hono<AppBindings>();

/** Unified discovery result shape (Bushi-hosted + web-discovered). */
interface DiscoverItem {
  id: string;
  source: 'bushi' | 'web';
  name: string;
  slug: string | null;
  styles: string[];
  startDate: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  status: string | null;
  sourceUrl: string | null;
}

function parseStyles(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function queryDiscover(
  db: Db,
  opts: { q?: string; style?: string; timeframe?: string },
): Promise<DiscoverItem[]> {
  const today = new Date().toISOString().slice(0, 10);

  // First-party tournaments.
  const bushiClauses = ['is_public = 1', 'deleted_at IS NULL'];
  const bushiParams: unknown[] = [];
  if (opts.q) {
    bushiClauses.push('(name LIKE ? OR city LIKE ? OR region LIKE ?)');
    bushiParams.push(`%${opts.q}%`, `%${opts.q}%`, `%${opts.q}%`);
  }
  if (opts.style) {
    bushiClauses.push('styles LIKE ?');
    bushiParams.push(`%"${opts.style}"%`);
  }
  if (opts.timeframe === 'upcoming') {
    bushiClauses.push('start_date >= ?');
    bushiParams.push(today);
  } else if (opts.timeframe === 'completed') {
    bushiClauses.push("status = 'completed'");
  }
  const bushi = await db.all<TournamentRow>(
    `SELECT * FROM tournaments WHERE ${bushiClauses.join(' AND ')} ORDER BY start_date DESC LIMIT 60`,
    ...bushiParams,
  );

  // Web-discovered tournaments (only surfaced for 'all'/'upcoming').
  let web: Array<Record<string, unknown>> = [];
  if (opts.timeframe !== 'completed') {
    const webClauses = ["status = 'published'"];
    const webParams: unknown[] = [];
    if (opts.q) {
      webClauses.push('(name LIKE ? OR city LIKE ? OR region LIKE ?)');
      webParams.push(`%${opts.q}%`, `%${opts.q}%`, `%${opts.q}%`);
    }
    if (opts.style) {
      webClauses.push('styles LIKE ?');
      webParams.push(`%"${opts.style}"%`);
    }
    web = await db.all<Record<string, unknown>>(
      `SELECT * FROM discovered_tournaments WHERE ${webClauses.join(' AND ')} ORDER BY start_date IS NULL, start_date LIMIT 60`,
      ...webParams,
    );
  }

  return [
    ...bushi.map((t): DiscoverItem => ({
      id: t.id,
      source: 'bushi',
      name: t.name,
      slug: t.slug,
      styles: parseStyles(t.styles),
      startDate: t.start_date,
      city: t.city,
      region: t.region,
      country: t.country,
      status: t.status,
      sourceUrl: null,
    })),
    ...web.map((r): DiscoverItem => ({
      id: String(r.id),
      source: 'web',
      name: String(r.name),
      slug: null,
      styles: parseStyles(String(r.styles ?? '[]')),
      startDate: (r.start_date as string | null) ?? (r.start_date_text as string | null),
      city: (r.city as string | null) ?? null,
      region: (r.region as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      status: 'external',
      sourceUrl: (r.registration_url as string | null) ?? (r.source_url as string | null),
    })),
  ];
}

// Tournament discovery (Bushi-hosted + web-discovered) with filters.
publicRoutes.get('/discover', async (c) => {
  const db = new Db(c.env.DB);
  const results = await queryDiscover(db, {
    q: c.req.query('q')?.trim(),
    style: c.req.query('style'),
    timeframe: c.req.query('timeframe') ?? 'all',
  });
  return c.json({ results });
});

// On-demand web search — runs a live Perplexity query, upserts, returns matches.
// KV-cached for an hour per query to control cost.
publicRoutes.get('/discover/web', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q || q.length < 3) throw new HttpError(400, 'Query must be at least 3 characters');
  const cacheKey = `discover:web:${q.toLowerCase()}`;

  const cached = await c.env.CACHE.get(cacheKey);
  if (cached) return c.json({ results: JSON.parse(cached), cached: true });

  // Cache miss → a paid Perplexity call follows. Rate-limit per IP to bound cost.
  await rateLimit(c, 'discweb', clientIp(c), 15, 3600); // 15 uncached web searches / hour / IP

  const query = `Upcoming martial arts tournaments matching "${q}" in the next 6 months, with dates, city, country, styles, organizer, and official registration links.`;
  const outcome = await ingestQuery(c.env, query, 'on_demand');
  const db = new Db(c.env.DB);
  const results = await queryDiscover(db, { q, timeframe: 'all' });
  // Cache for 1h (KV min TTL 60s).
  await c.env.CACHE.put(cacheKey, JSON.stringify(results), { expirationTtl: 3600 });
  return c.json({ results, found: outcome.found });
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
