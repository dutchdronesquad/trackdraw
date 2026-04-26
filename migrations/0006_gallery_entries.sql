CREATE TABLE IF NOT EXISTS gallery_entries (
  id TEXT PRIMARY KEY,
  share_token TEXT NOT NULL UNIQUE,
  owner_user_id TEXT NOT NULL,
  gallery_state TEXT NOT NULL DEFAULT 'unlisted',
  gallery_title TEXT NOT NULL,
  gallery_description TEXT NOT NULL,
  gallery_preview_image TEXT,
  gallery_published_at TEXT,
  moderation_hidden_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (share_token) REFERENCES shares(token) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (
    gallery_state IN ('unlisted', 'listed', 'featured', 'hidden')
  )
);

CREATE INDEX IF NOT EXISTS gallery_entries_owner_user_id_idx
  ON gallery_entries(owner_user_id);

CREATE INDEX IF NOT EXISTS gallery_entries_gallery_state_idx
  ON gallery_entries(gallery_state);

CREATE INDEX IF NOT EXISTS gallery_entries_gallery_published_at_idx
  ON gallery_entries(gallery_published_at DESC);
