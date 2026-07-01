import { PerplexityClient, PerplexityNotConfigured } from '@bushi/ai';
import {
  STYLE_LABELS,
  dedupeKey,
  discoveryResponseSchema,
  type DiscoveredTournamentInput,
} from '@bushi/domain';
import { Db, now } from '@bushi/db';
import type { Env } from '../env.js';
import { uuid } from './crypto.js';

/** JSON schema Perplexity conforms its answer to (structured outputs). */
const DISCOVERY_SCHEMA = {
  name: 'tournaments',
  schema: {
    type: 'object',
    properties: {
      tournaments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            city: { type: 'string' },
            region: { type: 'string' },
            country: { type: 'string' },
            styles: { type: 'array', items: { type: 'string' } },
            organizer: { type: 'string' },
            sourceUrl: { type: 'string' },
            registrationUrl: { type: 'string' },
          },
          required: ['name', 'startDate'],
        },
      },
    },
    required: ['tournaments'],
  },
} as const;

const SYSTEM =
  'You are a precise research assistant for a martial-arts tournament platform. ' +
  'Return only real, upcoming, verifiable tournaments with a source URL. Prefer official event or registration pages. ' +
  'Use the exact style keys: karate, taekwondo, bjj, judo, kickboxing, mma_amateur, open_mixed. Do not invent events.';

export function makeClient(env: Env): PerplexityClient {
  const gatewayBaseUrl = env.AI_GATEWAY_ID
    ? `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ID}/perplexity`
    : undefined;
  return new PerplexityClient({ apiKey: env.PERPLEXITY_API_KEY, model: 'sonar', gatewayBaseUrl });
}

/** The batched queries the nightly cron runs (kept small for cost control). */
export function defaultQueries(): string[] {
  const styles = Object.values(STYLE_LABELS);
  return [
    ...styles.map((s) => `Upcoming ${s} tournaments and competitions in the United States in the next 3 months, with dates, city, and official links.`),
    'Major upcoming Brazilian Jiu-Jitsu and grappling tournaments worldwide in the next 2 months with registration links.',
  ];
}

export interface IngestResult {
  found: number;
  inserted: number;
  updated: number;
}

/** Run one discovery query and upsert the results into D1. */
export async function ingestQuery(
  env: Env,
  query: string,
  trigger: 'cron' | 'manual' | 'on_demand',
): Promise<IngestResult> {
  const db = new Db(env.DB);
  const client = makeClient(env);
  const runId = uuid();
  const ts = now();

  if (!client.configured) {
    await logRun(db, runId, trigger, query, 0, 0, 0, 'skipped', 'PERPLEXITY_API_KEY not set');
    return { found: 0, inserted: 0, updated: 0 };
  }

  let items: DiscoveredTournamentInput[] = [];
  try {
    const result = await client.searchJSON<{ tournaments: unknown[] }>(SYSTEM, query, DISCOVERY_SCHEMA);
    const parsed = discoveryResponseSchema.safeParse(result.data);
    items = parsed.success ? parsed.data.tournaments : [];
  } catch (err) {
    if (err instanceof PerplexityNotConfigured) {
      await logRun(db, runId, trigger, query, 0, 0, 0, 'skipped', 'not configured');
      return { found: 0, inserted: 0, updated: 0 };
    }
    await logRun(db, runId, trigger, query, 0, 0, 0, 'error', err instanceof Error ? err.message : 'unknown');
    return { found: 0, inserted: 0, updated: 0 };
  }

  let inserted = 0;
  let updated = 0;
  for (const t of items) {
    const key = dedupeKey(t.name, t.startDate, t.city);
    const existing = await db.first<{ id: string }>(
      `SELECT id FROM discovered_tournaments WHERE dedupe_key = ?`,
      key,
    );
    const isoDate = normalizeDate(t.startDate);
    if (existing) {
      await db.run(
        `UPDATE discovered_tournaments SET name=?, styles=?, start_date_text=?, start_date=?, city=?, region=?, country=?, organizer=?, source_url=?, registration_url=?, updated_at=? WHERE id=?`,
        t.name, JSON.stringify(t.styles), t.startDate, isoDate, t.city ?? null, t.region ?? null,
        t.country ?? null, t.organizer ?? null, t.sourceUrl ?? null, t.registrationUrl ?? null, ts, existing.id,
      );
      updated++;
    } else {
      await db.run(
        `INSERT INTO discovered_tournaments (id,dedupe_key,name,styles,start_date_text,start_date,city,region,country,organizer,source_url,registration_url,citations,source,status,discovered_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        uuid(), key, t.name, JSON.stringify(t.styles), t.startDate, isoDate, t.city ?? null, t.region ?? null,
        t.country ?? null, t.organizer ?? null, t.sourceUrl ?? null, t.registrationUrl ?? null,
        JSON.stringify(t.sourceUrl ? [t.sourceUrl] : []), 'web', 'published', ts, ts, ts,
      );
      inserted++;
    }
  }

  await logRun(db, runId, trigger, query, items.length, inserted, updated, 'ok', null);
  return { found: items.length, inserted, updated };
}

/** Run the full nightly batch. */
export async function ingestAll(env: Env): Promise<IngestResult> {
  const totals: IngestResult = { found: 0, inserted: 0, updated: 0 };
  for (const q of defaultQueries()) {
    const r = await ingestQuery(env, q, 'cron');
    totals.found += r.found;
    totals.inserted += r.inserted;
    totals.updated += r.updated;
  }
  return totals;
}

/** Best-effort ISO date extraction from free-form text ("Aug 15, 2026"). */
function normalizeDate(text: string): string | null {
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return null;
}

async function logRun(
  db: Db,
  id: string,
  trigger: string,
  query: string,
  found: number,
  inserted: number,
  updated: number,
  status: string,
  error: string | null,
): Promise<void> {
  await db.run(
    `INSERT INTO discovery_runs (id,trigger,query,found,inserted,updated,status,error,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    id, trigger, query.slice(0, 300), found, inserted, updated, status, error, now(),
  );
}
