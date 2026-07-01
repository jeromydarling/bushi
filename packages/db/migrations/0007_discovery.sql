-- Bushi migration 0007 — discovered (web-sourced) tournaments
-- Populated by the Perplexity discovery pipeline; served alongside first-party
-- tournaments on the public Discover page, clearly marked as external.

CREATE TABLE discovered_tournaments (
  id            TEXT PRIMARY KEY,
  dedupe_key    TEXT NOT NULL,          -- normalized name|date|city (see domain dedupeKey)
  name          TEXT NOT NULL,
  styles        TEXT NOT NULL DEFAULT '[]', -- JSON array of style keys
  start_date_text TEXT NOT NULL,        -- free-form as reported by the source
  start_date    TEXT,                   -- normalized ISO date when parseable
  end_date_text TEXT,
  city          TEXT,
  region        TEXT,
  country       TEXT,
  organizer     TEXT,
  source_url    TEXT,
  registration_url TEXT,
  citations     TEXT,                   -- JSON array of source URLs
  source        TEXT NOT NULL DEFAULT 'web',
  status        TEXT NOT NULL DEFAULT 'published', -- published | hidden
  discovered_at INTEGER NOT NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_discovered_dedupe ON discovered_tournaments (dedupe_key);
CREATE INDEX idx_discovered_date ON discovered_tournaments (start_date);
CREATE INDEX idx_discovered_geo ON discovered_tournaments (country, region, city);

-- Log of discovery runs for admin visibility / debugging.
CREATE TABLE discovery_runs (
  id            TEXT PRIMARY KEY,
  trigger       TEXT NOT NULL,          -- cron | manual | on_demand
  query         TEXT,
  found         INTEGER NOT NULL DEFAULT 0,
  inserted      INTEGER NOT NULL DEFAULT 0,
  updated       INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'ok', -- ok | error | skipped
  error         TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_discovery_runs_created ON discovery_runs (created_at);
