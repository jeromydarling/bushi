-- Bushi migration 0006 — public profiles, SEO, rankings

CREATE TABLE public_school_profiles (
  school_id     TEXT PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  headline      TEXT,
  about         TEXT,
  hero_r2_key   TEXT,
  social        TEXT, -- JSON links
  premium       INTEGER NOT NULL DEFAULT 0,
  seo_title     TEXT,
  seo_description TEXT,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE athlete_public_profiles (
  athlete_id    TEXT PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
  headline      TEXT,
  highlights    TEXT, -- JSON
  hero_r2_key   TEXT,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE school_rankings (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  style       TEXT,
  region      TEXT,
  points      INTEGER NOT NULL DEFAULT 0,
  rank        INTEGER,
  period      TEXT, -- e.g. 2026-Q3
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ranking_lookup ON school_rankings (style, region, period, rank);

CREATE TABLE tournament_tags (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  tag           TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_ttag_unique ON tournament_tags (tournament_id, tag);
CREATE INDEX idx_ttag_tag ON tournament_tags (tag);

CREATE TABLE tournament_location_cache (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  country       TEXT,
  region        TEXT,
  city          TEXT,
  lat           REAL,
  lng           REAL,
  updated_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_loccache_tournament ON tournament_location_cache (tournament_id);
CREATE INDEX idx_loccache_geo ON tournament_location_cache (country, region, city);
