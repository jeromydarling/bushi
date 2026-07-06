export * from './rows.js';
export * from './client.js';

/** Ordered list of migration filenames, applied lexicographically by wrangler. */
export const MIGRATIONS = [
  '0001_identity.sql',
  '0002_schools_athletes.sql',
  '0003_tournaments.sql',
  '0004_commerce.sql',
  '0005_marketing_ai.sql',
  '0006_public_seo.sql',
  '0007_discovery.sql',
  '0008_crm.sql',
] as const;
