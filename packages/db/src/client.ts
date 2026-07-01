/// <reference types="@cloudflare/workers-types" />

/**
 * A very thin typed helper over the D1 binding. We deliberately avoid a heavy
 * ORM so the Worker bundle stays small and the SQL stays obvious. Repositories
 * in the API layer build on top of these primitives.
 */
export class Db {
  constructor(private readonly d1: D1Database) {}

  /** Run a query returning all rows, typed by the caller. */
  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const res = await stmt.all<T>();
    return res.results ?? [];
  }

  /** Run a query returning the first row or null. */
  async first<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const stmt = this.d1.prepare(sql).bind(...params);
    return (await stmt.first<T>()) ?? null;
  }

  /** Run a write statement, returning D1 metadata. */
  async run(sql: string, ...params: unknown[]): Promise<D1Result> {
    return this.d1.prepare(sql).bind(...params).run();
  }

  /** Execute a batch of prepared statements atomically. */
  async batch(statements: { sql: string; params?: unknown[] }[]): Promise<void> {
    const prepared = statements.map((s) =>
      this.d1.prepare(s.sql).bind(...(s.params ?? [])),
    );
    await this.d1.batch(prepared);
  }

  raw(): D1Database {
    return this.d1;
  }
}

/** Convenience: current epoch millis (kept in one place for testability). */
export function now(): number {
  return Date.now();
}
