import { buildTournamentSearchSql, type SearchQuery } from './query.js';

/** Minimal D1 prepared-statement surface we depend on. */
export interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): { all<T = unknown>(): Promise<{ results: T[] }> };
  };
}

/** Minimal Vectorize binding surface. */
export interface VectorizeLike {
  query(
    vector: number[],
    opts?: { topK?: number; returnMetadata?: boolean; filter?: Record<string, unknown> },
  ): Promise<{ matches: VectorizeMatch[] }>;
}

export interface VectorizeMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface TournamentSearchResult {
  id: string;
  name: string;
  slug: string;
  style: string;
  country: string | null;
  region: string | null;
  location: string | null;
  status: string;
  starts_at: number | null;
}

export interface SchoolSearchResult {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
}

export interface SearchServiceDeps {
  db: D1Like;
  vectorize?: VectorizeLike;
}

/** Embedding function injected by the caller (e.g. AiService.embed). */
export type EmbedFn = (text: string) => Promise<number[]>;

export class SearchService {
  constructor(private readonly deps: SearchServiceDeps) {}

  /** Keyword + filter tournament search backed by D1. */
  async searchTournaments(
    query: SearchQuery,
  ): Promise<TournamentSearchResult[]> {
    const { sql, params } = buildTournamentSearchSql(query);
    const { results } = await this.deps.db
      .prepare(sql)
      .bind(...params)
      .all<TournamentSearchResult>();
    return results;
  }

  /** Simple keyword school search. */
  async searchSchools(
    q: string,
    limit = 25,
  ): Promise<SchoolSearchResult[]> {
    const like = `%${q.trim().toLowerCase()}%`;
    const sql = `SELECT id, name, slug, city, country
  FROM schools
 WHERE LOWER(name) LIKE ? OR LOWER(city) LIKE ?
 ORDER BY name ASC
 LIMIT ?`;
    const { results } = await this.deps.db
      .prepare(sql)
      .bind(like, like, Math.min(Math.max(1, limit), 100))
      .all<SchoolSearchResult>();
    return results;
  }

  /**
   * Semantic suggestions via Vectorize. The caller supplies an embed function
   * (kept behind an interface so this compiles/tests without Workers AI).
   */
  async semanticSuggest(
    text: string,
    embed: EmbedFn,
    topK = 5,
  ): Promise<VectorizeMatch[]> {
    if (!this.deps.vectorize) return [];
    const vector = await embed(text);
    if (vector.length === 0) return [];
    const { matches } = await this.deps.vectorize.query(vector, {
      topK,
      returnMetadata: true,
    });
    return matches;
  }
}
