-- Password reset tokens. We store only the SHA-256 hash of the token; the raw
-- token is emailed to the user and never persisted. Single-use, short-lived.
CREATE TABLE password_reset_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
