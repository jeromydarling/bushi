-- Bushi migration 0004 — registration & commerce

CREATE TABLE registrations (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  athlete_id    TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  school_id     TEXT REFERENCES schools(id) ON DELETE SET NULL,
  registered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'usd',
  stripe_checkout_id TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_reg_tournament ON registrations (tournament_id, status);
CREATE UNIQUE INDEX idx_reg_unique ON registrations (tournament_id, athlete_id);

CREATE TABLE registration_items (
  id              TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  division_id     TEXT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  amount_cents    INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_regitem_unique ON registration_items (registration_id, division_id);

CREATE TABLE payments (
  id              TEXT PRIMARY KEY,
  registration_id TEXT REFERENCES registrations(id) ON DELETE SET NULL,
  org_id          TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  provider        TEXT NOT NULL DEFAULT 'stripe',
  provider_ref    TEXT, -- stripe payment intent / checkout id
  amount_cents    INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'usd',
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | succeeded | failed | refunded
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_payment_reg ON payments (registration_id);
CREATE INDEX idx_payment_provider_ref ON payments (provider_ref);

CREATE TABLE refunds (
  id           TEXT PRIMARY KEY,
  payment_id   TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  reason       TEXT,
  provider_ref TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE discount_codes (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  org_id        TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'percent', -- percent | fixed
  value         INTEGER NOT NULL,
  max_uses      INTEGER,
  used_count    INTEGER NOT NULL DEFAULT 0,
  expires_at    INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_discount_code ON discount_codes (tournament_id, code);

CREATE TABLE waiver_acceptances (
  id              TEXT PRIMARY KEY,
  tournament_id   TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  athlete_id      TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  registration_id TEXT REFERENCES registrations(id) ON DELETE SET NULL,
  accepted_by     TEXT,
  signature       TEXT,
  ip              TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_waiver_athlete ON waiver_acceptances (tournament_id, athlete_id);

CREATE TABLE subscriptions (
  id                 TEXT PRIMARY KEY,
  org_id             TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tier               TEXT NOT NULL DEFAULT 'free',
  status             TEXT NOT NULL DEFAULT 'active', -- active | trialing | past_due | canceled
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_sub_org ON subscriptions (org_id);
CREATE INDEX idx_sub_stripe ON subscriptions (stripe_subscription_id);

CREATE TABLE payout_accounts (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL DEFAULT 'stripe',
  stripe_account_id TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_payout_org ON payout_accounts (org_id);
