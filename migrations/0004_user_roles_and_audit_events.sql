ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_events_actor_user_id_idx ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS audit_events_target_user_id_idx ON audit_events(target_user_id);
CREATE INDEX IF NOT EXISTS audit_events_event_type_idx ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events(created_at);
