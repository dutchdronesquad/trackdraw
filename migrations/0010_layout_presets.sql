CREATE TABLE IF NOT EXISTS layout_presets (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  shapes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS layout_presets_owner_user_id_idx ON layout_presets(owner_user_id);
CREATE INDEX IF NOT EXISTS layout_presets_updated_at_idx ON layout_presets(updated_at);
