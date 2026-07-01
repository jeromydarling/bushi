-- Bushi migration 0002 — schools & athletes

CREATE TABLE schools (
  id          TEXT PRIMARY KEY,
  org_id      TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  styles      TEXT NOT NULL DEFAULT '[]', -- JSON array of style keys
  bio         TEXT,
  logo_url    TEXT,
  website     TEXT,
  city        TEXT,
  region      TEXT,
  country     TEXT,
  claimed_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_public   INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);
CREATE UNIQUE INDEX idx_school_slug ON schools (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_geo ON schools (country, region, city);

CREATE TABLE school_locations (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  region      TEXT,
  country     TEXT,
  lat         REAL,
  lng         REAL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_location_school ON school_locations (school_id);

CREATE TABLE school_staff (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL, -- head_coach | coach | admin
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_staff_school ON school_staff (school_id);

CREATE TABLE athletes (
  id            TEXT PRIMARY KEY,
  school_id     TEXT REFERENCES schools(id) ON DELETE SET NULL,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  date_of_birth TEXT, -- ISO date
  gender        TEXT, -- male | female | other
  primary_style TEXT,
  belt_rank     TEXT,
  is_public     INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER
);
CREATE INDEX idx_athlete_school ON athletes (school_id);
CREATE INDEX idx_athlete_name ON athletes (last_name, first_name);

CREATE TABLE athlete_guardians (
  id          TEXT PRIMARY KEY,
  athlete_id  TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  relationship TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_guardian_athlete ON athlete_guardians (athlete_id);

CREATE TABLE athlete_ranks (
  id          TEXT PRIMARY KEY,
  athlete_id  TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  style       TEXT NOT NULL,
  rank_label  TEXT NOT NULL,
  rank_ordinal INTEGER,
  awarded_at  TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_rank_athlete ON athlete_ranks (athlete_id);

CREATE TABLE athlete_measurements (
  id          TEXT PRIMARY KEY,
  athlete_id  TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  measured_at INTEGER NOT NULL,
  weight_kg   REAL,
  height_cm   REAL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_measure_athlete ON athlete_measurements (athlete_id, measured_at);

CREATE TABLE athlete_documents (
  id          TEXT PRIMARY KEY,
  athlete_id  TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL, -- waiver | medical | id | photo
  r2_key      TEXT NOT NULL,
  filename    TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_doc_athlete ON athlete_documents (athlete_id);

CREATE TABLE athlete_notes (
  id          TEXT PRIMARY KEY,
  athlete_id  TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  author_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_note_athlete ON athlete_notes (athlete_id, created_at);
