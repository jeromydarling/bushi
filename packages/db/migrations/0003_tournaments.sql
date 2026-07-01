-- Bushi migration 0003 — tournaments, brackets, matches

CREATE TABLE tournaments (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  styles      TEXT NOT NULL DEFAULT '[]', -- JSON array
  status      TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  start_date  TEXT NOT NULL,
  end_date    TEXT,
  venue_name  TEXT,
  city        TEXT,
  region      TEXT,
  country     TEXT,
  banner_url  TEXT,
  is_public   INTEGER NOT NULL DEFAULT 0,
  registration_opens_at  INTEGER,
  registration_closes_at INTEGER,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);
CREATE UNIQUE INDEX idx_tournament_slug ON tournaments (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tournament_org ON tournaments (org_id, status);
CREATE INDEX idx_tournament_dates ON tournaments (start_date);

CREATE TABLE tournament_staff (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  name          TEXT,
  role          TEXT NOT NULL, -- organizer | referee | scorekeeper | table
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_tstaff_tournament ON tournament_staff (tournament_id);

CREATE TABLE venues (
  id          TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE mats (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  mat_number    INTEGER NOT NULL,
  name          TEXT,
  created_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_mat_number ON mats (tournament_id, mat_number);

CREATE TABLE tournament_days (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  day_date      TEXT NOT NULL,
  label         TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE divisions (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  style         TEXT NOT NULL,
  format        TEXT NOT NULL DEFAULT 'single_elimination',
  gender        TEXT, -- male | female | coed
  age_min       INTEGER,
  age_max       INTEGER,
  weight_min_kg REAL,
  weight_max_kg REAL,
  belt_rank     TEXT,
  cap           INTEGER,
  mat_id        TEXT REFERENCES mats(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'open', -- open | seeded | live | complete
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_division_tournament ON divisions (tournament_id);

CREATE TABLE division_entries (
  id          TEXT PRIMARY KEY,
  division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  athlete_id  TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  seed        INTEGER,
  status      TEXT NOT NULL DEFAULT 'registered',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_entry_unique ON division_entries (division_id, athlete_id);
CREATE INDEX idx_entry_athlete ON division_entries (athlete_id);

CREATE TABLE brackets (
  id          TEXT PRIMARY KEY,
  division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  format      TEXT NOT NULL,
  rounds      INTEGER NOT NULL DEFAULT 0,
  data        TEXT, -- JSON snapshot of the generated bracket structure
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_bracket_division ON brackets (division_id);

CREATE TABLE bracket_nodes (
  id          TEXT PRIMARY KEY,
  bracket_id  TEXT NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
  round       INTEGER NOT NULL,
  position    INTEGER NOT NULL,
  match_id    TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_node_bracket ON bracket_nodes (bracket_id, round);

CREATE TABLE matches (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  division_id   TEXT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  bracket_id    TEXT REFERENCES brackets(id) ON DELETE SET NULL,
  mat_id        TEXT REFERENCES mats(id) ON DELETE SET NULL,
  round         INTEGER NOT NULL DEFAULT 1,
  ordinal       INTEGER NOT NULL DEFAULT 0,
  label         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  winner_athlete_id TEXT REFERENCES athletes(id) ON DELETE SET NULL,
  method        TEXT,
  scheduled_at  INTEGER,
  started_at    INTEGER,
  completed_at  INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_match_division ON matches (division_id, round, ordinal);
CREATE INDEX idx_match_mat ON matches (mat_id, status);

CREATE TABLE match_participants (
  id          TEXT PRIMARY KEY,
  match_id    TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  athlete_id  TEXT REFERENCES athletes(id) ON DELETE SET NULL,
  corner      TEXT NOT NULL, -- a | b (red | blue)
  score       INTEGER NOT NULL DEFAULT 0,
  penalties   INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_participant_corner ON match_participants (match_id, corner);

CREATE TABLE scorecards (
  id          TEXT PRIMARY KEY,
  match_id    TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  judge_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  data        TEXT NOT NULL, -- JSON of scoring events / period breakdown
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_scorecard_match ON scorecards (match_id);

CREATE TABLE weigh_ins (
  id          TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  athlete_id  TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  weight_kg   REAL NOT NULL,
  passed      INTEGER NOT NULL DEFAULT 1,
  recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_weighin_athlete ON weigh_ins (tournament_id, athlete_id);

CREATE TABLE check_ins (
  id          TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  athlete_id  TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  checked_in_at INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_checkin_unique ON check_ins (tournament_id, athlete_id);

CREATE TABLE announcements (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  author_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  published_at  INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_announce_tournament ON announcements (tournament_id, created_at);

CREATE TABLE sponsors (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  org_id        TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  website       TEXT,
  tier          TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_sponsor_tournament ON sponsors (tournament_id);

CREATE TABLE sponsor_assets (
  id          TEXT PRIMARY KEY,
  sponsor_id  TEXT NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,
  kind        TEXT,
  created_at  INTEGER NOT NULL
);
