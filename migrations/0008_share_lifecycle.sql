ALTER TABLE shares
  ADD COLUMN share_type TEXT NOT NULL DEFAULT 'temporary';

UPDATE shares
SET
  share_type = 'published',
  expires_at = NULL,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE owner_user_id IS NOT NULL
  AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS shares_share_type_idx ON shares(share_type);
CREATE INDEX IF NOT EXISTS shares_owner_project_type_idx
  ON shares(owner_user_id, project_id, share_type);
