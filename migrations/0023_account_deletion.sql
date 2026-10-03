-- Media deletion survives its owner and is retried after transient R2 failures.
-- This is a work list of object keys, never a recoverable account snapshot.
CREATE TABLE account_deletion_media (
  object_key TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX account_deletion_media_created ON account_deletion_media(created_at, object_key);
CREATE INDEX gallery_entries_preview_image ON gallery_entries(gallery_preview_image);

CREATE TRIGGER gallery_deleted_media
AFTER DELETE ON gallery_entries
BEGIN
  INSERT OR IGNORE INTO account_deletion_media (object_key)
    VALUES ('gallery/previews/' || OLD.id || '.webp');
  INSERT OR IGNORE INTO account_deletion_media (object_key)
    SELECT OLD.gallery_preview_image
    WHERE OLD.gallery_preview_image IS NOT NULL AND trim(OLD.gallery_preview_image) <> '';
END;

-- Every account deletion (admin, Better Auth self-delete, or cron) uses this
-- lifecycle inside the same transaction as the user DELETE. Failures roll back
-- the account and all related data rather than leaving partial destruction.
CREATE TRIGGER account_deleted_data
BEFORE DELETE ON users
BEGIN
  DELETE FROM verifications
  WHERE value = OLD.id OR lower(identifier) = lower(OLD.email)
    -- Parentheses keep D1's remote SQL parser from treating this END as the
    -- trigger terminator (cloudflare/workers-sdk#4727).
    OR (CASE WHEN json_valid(value) THEN
      lower(json_extract(value, '$.email')) = lower(OLD.email)
      OR json_extract(value, '$.userData.id') = OLD.id
    ELSE 0 END);

  DELETE FROM audit_events
  WHERE actor_user_id = OLD.id OR target_user_id = OLD.id
    OR (entity_type = 'user' AND entity_id = OLD.id)
    OR (entity_type = 'privacy_preference' AND entity_id = OLD.id)
    OR (entity_type = 'api_key' AND entity_id IN (SELECT id FROM apikey WHERE referenceId = OLD.id))
    OR (entity_type = 'passkey' AND entity_id IN (SELECT id FROM passkey WHERE userId = OLD.id))
    OR (entity_type = 'gallery_entry' AND entity_id IN (SELECT id FROM gallery_entries WHERE owner_user_id = OLD.id))
    OR (entity_type = 'project' AND entity_id IN (SELECT id FROM projects WHERE owner_user_id = OLD.id))
    OR (entity_type = 'share' AND entity_id IN (SELECT token FROM shares WHERE owner_user_id = OLD.id OR project_id IN (SELECT id FROM projects WHERE owner_user_id = OLD.id)));

  DELETE FROM product_events
  WHERE user_id = OLD.id
    OR project_id IN (SELECT id FROM projects WHERE owner_user_id = OLD.id)
    OR share_token IN (SELECT token FROM shares WHERE owner_user_id = OLD.id OR project_id IN (SELECT id FROM projects WHERE owner_user_id = OLD.id));

  DELETE FROM gallery_entries
  WHERE owner_user_id = OLD.id
    OR share_token IN (SELECT token FROM shares WHERE owner_user_id = OLD.id OR project_id IN (SELECT id FROM projects WHERE owner_user_id = OLD.id));
  DELETE FROM shares
  WHERE owner_user_id = OLD.id OR project_id IN (SELECT id FROM projects WHERE owner_user_id = OLD.id);

  -- Cascades remove projects (including archived ones), layout presets, API
  -- keys, sessions, linked accounts, passkeys, creator facts and notice state.
END;
