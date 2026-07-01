export * from './constants.js';
export * from './schemas.js';
export * from './live.js';

/**
 * Stable dedupe key for a discovered tournament — normalized name + first
 * date token + city. Lets nightly ingestion upsert instead of duplicating.
 */
export function dedupeKey(name: string, startDate: string, city?: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const dateToken = (startDate.match(/\d{4}/)?.[0] ?? norm(startDate).slice(0, 12)) || 'na';
  return [norm(name), dateToken, norm(city ?? '')].filter(Boolean).join('|');
}

/** Small shared helper: turn an arbitrary label into a url-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
