PRAGMA foreign_keys = OFF;

CREATE TABLE shares_new (
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
  expires_at TEXT,
  revoked_at TEXT,
  owner_user_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id)
);

INSERT INTO shares_new (
  id,
  token,
  design_json,
  title,
  description,
  field_width,
  field_height,
  shape_count,
  created_at,
  updated_at,
  published_at,
  expires_at,
  revoked_at,
  owner_user_id,
  project_id
)
SELECT
  id,
  token,
  design_json,
  title,
  description,
  field_width,
  field_height,
  shape_count,
  created_at,
  updated_at,
  published_at,
  expires_at,
  revoked_at,
  owner_user_id,
  project_id
FROM shares;

DROP TABLE shares;
ALTER TABLE shares_new RENAME TO shares;

CREATE INDEX IF NOT EXISTS shares_token_idx ON shares(token);
CREATE INDEX IF NOT EXISTS shares_revoked_at_idx ON shares(revoked_at);
CREATE INDEX IF NOT EXISTS shares_expires_at_idx ON shares(expires_at);
CREATE INDEX IF NOT EXISTS shares_owner_user_id_idx ON shares(owner_user_id);
CREATE INDEX IF NOT EXISTS shares_project_id_idx ON shares(project_id);

PRAGMA foreign_keys = ON;
