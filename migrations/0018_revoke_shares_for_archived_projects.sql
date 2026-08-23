-- Archiving a project used to leave its shares active ("ghost links").
-- Revoke any share still active for a project that is already archived,
-- matching the invariant now enforced going forward by archiveProjectForUser.
UPDATE shares
SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE revoked_at IS NULL
  AND project_id IN (SELECT id FROM projects WHERE archived_at IS NOT NULL);

-- Drop the now-stale gallery rows for those shares. Any stored preview image
-- blob for these rows is not reclaimed here; volume is expected to be small
-- since it only covers shares tied to already-archived projects.
DELETE FROM gallery_entries
WHERE share_token IN (
  SELECT s.token
  FROM shares s
  JOIN projects p ON p.id = s.project_id
  WHERE p.archived_at IS NOT NULL
);
