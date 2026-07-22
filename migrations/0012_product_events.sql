CREATE TABLE IF NOT EXISTS product_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  project_id TEXT,
  share_token TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS product_events_created_at_idx
  ON product_events(created_at DESC);

CREATE INDEX IF NOT EXISTS product_events_type_created_at_idx
  ON product_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS product_events_user_created_at_idx
  ON product_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS product_events_session_created_at_idx
  ON product_events(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS product_events_share_created_at_idx
  ON product_events(share_token, created_at DESC);
