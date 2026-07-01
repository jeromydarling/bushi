import { MARTIAL_ARTS_STYLES, type MartialArtStyle } from '@bushi/domain';

export interface SearchQuery {
  q?: string;
  style?: MartialArtStyle;
  country?: string;
  region?: string;
  timeframe?: 'upcoming' | 'completed' | 'all';
  limit?: number;
}

export interface BuiltSql {
  sql: string;
  params: unknown[];
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

/**
 * Build a parameterized D1 keyword+filter query for tournaments. All user input
 * is bound via `?` placeholders; only validated enum values are inlined.
 */
export function buildTournamentSearchSql(query: SearchQuery): BuiltSql {
  const params: unknown[] = [];
  const where: string[] = ['1 = 1'];

  if (query.q && query.q.trim()) {
    const like = `%${query.q.trim().toLowerCase()}%`;
    where.push(
      '(LOWER(t.name) LIKE ? OR LOWER(t.location) LIKE ? OR LOWER(t.description) LIKE ?)',
    );
    params.push(like, like, like);
  }

  if (query.style && MARTIAL_ARTS_STYLES.includes(query.style)) {
    where.push('t.style = ?');
    params.push(query.style);
  }

  if (query.country && query.country.trim()) {
    where.push('t.country = ?');
    params.push(query.country.trim());
  }

  if (query.region && query.region.trim()) {
    where.push('t.region = ?');
    params.push(query.region.trim());
  }

  const timeframe = query.timeframe ?? 'all';
  if (timeframe === 'upcoming') {
    where.push("t.status IN ('published','registration_open','registration_closed')");
    where.push('t.starts_at >= ?');
    params.push(Date.now());
  } else if (timeframe === 'completed') {
    where.push("t.status IN ('completed','archived')");
  }

  const limit = clampLimit(query.limit);
  params.push(limit);

  const sql = `SELECT t.id, t.name, t.slug, t.style, t.country, t.region,
       t.location, t.status, t.starts_at
  FROM tournaments t
 WHERE ${where.join(' AND ')}
 ORDER BY t.starts_at ASC
 LIMIT ?`;

  return { sql, params };
}
