-- Bushi migration 0008 — CRM & customer health (super-admin)
-- A "customer" is an organization (paying account). crm_customers is a 1:1
-- overlay on organizations (org_id nullable so standalone/demo customers can
-- exist too).

CREATE TABLE crm_customers (
  id              TEXT PRIMARY KEY,
  org_id          TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  lifecycle_stage TEXT NOT NULL DEFAULT 'onboarding',
  owner_user_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  mrr_cents       INTEGER NOT NULL DEFAULT 0,
  health_score    INTEGER NOT NULL DEFAULT 60,
  health_reason   TEXT,
  health_updated_at INTEGER,
  city            TEXT,
  region          TEXT,
  country         TEXT,
  lat             REAL,
  lng             REAL,
  tags            TEXT NOT NULL DEFAULT '[]',
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_crm_customer_org ON crm_customers (org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_crm_customer_stage ON crm_customers (lifecycle_stage);
CREATE INDEX idx_crm_customer_health ON crm_customers (health_score);

CREATE TABLE crm_contacts (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  role         TEXT,
  is_primary   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_crm_contact_customer ON crm_contacts (customer_id);

CREATE TABLE crm_interactions (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  author_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL, -- note | call | email | meeting
  subject      TEXT,
  body         TEXT NOT NULL,
  follow_up_at INTEGER,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_crm_interaction_customer ON crm_interactions (customer_id, created_at);
CREATE INDEX idx_crm_interaction_followup ON crm_interactions (follow_up_at);

CREATE TABLE crm_tasks (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  due_at       INTEGER,
  status       TEXT NOT NULL DEFAULT 'open', -- open | done
  assignee_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  source       TEXT, -- manual | at_risk_auto
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX idx_crm_task_customer ON crm_tasks (customer_id);
CREATE INDEX idx_crm_task_due ON crm_tasks (status, due_at);

CREATE TABLE support_tickets (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  body         TEXT,
  status       TEXT NOT NULL DEFAULT 'open', -- open | pending | resolved | closed
  priority     TEXT NOT NULL DEFAULT 'normal',
  assignee_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_support_ticket_customer ON support_tickets (customer_id, status);

-- History of health scores for trend lines.
CREATE TABLE health_snapshots (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL,
  reason       TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_health_snapshot_customer ON health_snapshots (customer_id, created_at);
