-- Bushi migration 0001 — identity & organizations
-- D1 (SQLite). All ids are text UUIDs. Timestamps are epoch milliseconds (integer).

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified_at INTEGER,
  status        TEXT NOT NULL DEFAULT 'active', -- active | suspended | deleted
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER
);
CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;

CREATE TABLE user_profiles (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  phone       TEXT,
  locale      TEXT NOT NULL DEFAULT 'en',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE organizations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  plan_tier   TEXT NOT NULL DEFAULT 'free', -- free | starter | pro | enterprise
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);
CREATE UNIQUE INDEX idx_org_slug ON organizations (slug) WHERE deleted_at IS NULL;

CREATE TABLE organization_memberships (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL, -- platform_admin | organizer | school_admin | coach | referee | scorekeeper | competitor | spectator
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_membership_unique ON organization_memberships (org_id, user_id);
CREATE INDEX idx_membership_user ON organization_memberships (user_id);

CREATE TABLE invites (
  id          TEXT PRIMARY KEY,
  org_id      TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  invited_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at INTEGER,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_invites_email ON invites (email);
CREATE UNIQUE INDEX idx_invites_token ON invites (token_hash);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  user_agent  TEXT,
  ip          TEXT,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  revoked_at  INTEGER
);
CREATE UNIQUE INDEX idx_sessions_token ON sessions (token_hash);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  org_id      TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    TEXT, -- JSON
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_audit_org ON audit_logs (org_id, created_at);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
