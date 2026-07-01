-- Bushi migration 0005 — marketing, AI, notifications

CREATE TABLE campaigns (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  school_id     TEXT REFERENCES schools(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL, -- pre_event | post_event | school_growth
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | running | complete | failed
  schedule_at   INTEGER,
  workflow_id   TEXT, -- Cloudflare Workflow instance id
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_campaign_org ON campaigns (org_id, status);

CREATE TABLE generated_assets (
  id            TEXT PRIMARY KEY,
  org_id        TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL, -- og_image | result_card | poster | leaderboard | certificate | hero
  r2_key        TEXT NOT NULL,
  width         INTEGER,
  height        INTEGER,
  prompt        TEXT,
  model         TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_asset_kind ON generated_assets (kind, created_at);

CREATE TABLE content_jobs (
  id          TEXT PRIMARY KEY,
  org_id      TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queued', -- queued | running | complete | failed
  input       TEXT, -- JSON
  output      TEXT, -- JSON
  error       TEXT,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_contentjob_status ON content_jobs (status, created_at);

CREATE TABLE ai_generations (
  id          TEXT PRIMARY KEY,
  org_id      TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  feature     TEXT NOT NULL, -- promo_copy | recap | organizer_assistant | coach_assistant | search
  model       TEXT NOT NULL,
  prompt_key  TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  latency_ms  INTEGER,
  status      TEXT NOT NULL DEFAULT 'ok', -- ok | fallback | error
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_aigen_feature ON ai_generations (feature, created_at);

CREATE TABLE prompt_templates (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  system_prompt TEXT,
  user_template TEXT NOT NULL,
  model       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_prompt_key_version ON prompt_templates (key, version);

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  org_id      TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_notif_user ON notifications (user_id, read_at);

CREATE TABLE notification_deliveries (
  id              TEXT PRIMARY KEY,
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL, -- email | webhook | inapp
  destination     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  provider_ref    TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_delivery_status ON notification_deliveries (status);

CREATE TABLE search_embeddings_refs (
  id          TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- tournament | school | athlete | faq
  entity_id   TEXT NOT NULL,
  vectorize_id TEXT NOT NULL,
  model       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_embed_entity ON search_embeddings_refs (entity_type, entity_id);
