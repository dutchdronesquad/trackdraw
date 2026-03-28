CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  design_json TEXT NOT NULL,
  title TEXT,
  description TEXT,
  field_width REAL,
  field_height REAL,
  shape_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS shares_token_idx ON shares(token);
CREATE INDEX IF NOT EXISTS shares_revoked_at_idx ON shares(revoked_at);
CREATE INDEX IF NOT EXISTS shares_expires_at_idx ON shares(expires_at);
