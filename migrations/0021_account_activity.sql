ALTER TABLE users ADD COLUMN last_active_at TEXT;

-- Adoption starts a full inactivity window for existing accounts. Preserve any
-- later reliable account/session timestamp without treating admin edits as use.
UPDATE users
SET last_active_at = max(
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  coalesce(strftime('%Y-%m-%dT%H:%M:%fZ', createdAt), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  coalesce((
    SELECT max(strftime('%Y-%m-%dT%H:%M:%fZ', s.createdAt))
    FROM sessions s WHERE s.userId = users.id
  ), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  coalesce((
    SELECT max(strftime('%Y-%m-%dT%H:%M:%fZ', s.updatedAt))
    FROM sessions s WHERE s.userId = users.id
  ), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
