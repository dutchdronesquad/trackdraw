-- Keep lifecycle history in the existing audit_events table. The user's random
-- reference has no remaining identity mapping after account deletion.
ALTER TABLE users ADD COLUMN lifecycle_audit_ref TEXT;
UPDATE users SET lifecycle_audit_ref = lower(hex(randomblob(16)));
CREATE UNIQUE INDEX users_lifecycle_audit_ref ON users(lifecycle_audit_ref);

CREATE TRIGGER account_lifecycle_audit_ref
AFTER INSERT ON users
WHEN NEW.lifecycle_audit_ref IS NULL
BEGIN
  UPDATE users SET lifecycle_audit_ref = lower(hex(randomblob(16))) WHERE id = NEW.id;
END;

CREATE TRIGGER account_retention_notice_attempted_audit
AFTER UPDATE OF attempted_at ON account_retention_notices
WHEN OLD.attempted_at IS NULL AND NEW.attempted_at IS NOT NULL
BEGIN
  INSERT INTO audit_events (id, target_user_id, event_type, entity_type, entity_id, metadata_json, created_at, actor_kind, target_label)
  SELECT 'retention-attempted-' || NEW.id, NEW.user_id, 'account.retention.notice.attempted',
    'account_lifecycle', a.lifecycle_audit_ref,
    json_object('stage', NEW.stage, 'noticeId', NEW.id, 'activityAt', NEW.activity_at,
      'removalAt', NEW.removal_at, 'status', 'attempted'),
    NEW.attempted_at, 'system', 'Account (' || a.lifecycle_audit_ref || ')'
  FROM users a WHERE a.id = NEW.user_id;
END;

-- Backfill only evidence that still exists at migration time.
INSERT INTO audit_events (id, target_user_id, event_type, entity_type, entity_id, metadata_json, created_at, actor_kind, target_label)
  SELECT 'retention-attempted-' || n.id, n.user_id, 'account.retention.notice.attempted',
    'account_lifecycle', a.lifecycle_audit_ref,
    json_object('stage', n.stage, 'noticeId', n.id, 'activityAt', n.activity_at,
      'removalAt', n.removal_at, 'status', 'attempted'),
    n.attempted_at, 'system', 'Account (' || a.lifecycle_audit_ref || ')'
  FROM account_retention_notices n JOIN users a ON a.id = n.user_id
  WHERE n.attempted_at IS NOT NULL;

CREATE TRIGGER account_retention_notice_sent_audit
AFTER UPDATE OF sent_at ON account_retention_notices
WHEN OLD.sent_at IS NULL AND NEW.sent_at IS NOT NULL
BEGIN
  INSERT INTO audit_events (id, target_user_id, event_type, entity_type, entity_id, metadata_json, created_at, actor_kind, target_label)
  SELECT 'retention-sent-' || NEW.id, NEW.user_id, (CASE NEW.stage WHEN 'first' THEN 'account.retention.first_notice.sent' ELSE 'account.retention.final_notice.sent' END),
    'account_lifecycle', a.lifecycle_audit_ref,
    json_object('stage', NEW.stage, 'noticeId', NEW.id, 'activityAt', NEW.activity_at,
      'removalAt', NEW.removal_at, 'status', 'provider_accepted'),
    NEW.sent_at, 'system', 'Account (' || a.lifecycle_audit_ref || ')'
  FROM users a WHERE a.id = NEW.user_id;
END;

-- Backfill only evidence that still exists at migration time.
INSERT INTO audit_events (id, target_user_id, event_type, entity_type, entity_id, metadata_json, created_at, actor_kind, target_label)
  SELECT 'retention-sent-' || n.id, n.user_id, (CASE n.stage WHEN 'first' THEN 'account.retention.first_notice.sent' ELSE 'account.retention.final_notice.sent' END),
    'account_lifecycle', a.lifecycle_audit_ref,
    json_object('stage', n.stage, 'noticeId', n.id, 'activityAt', n.activity_at,
      'removalAt', n.removal_at, 'status', 'provider_accepted'),
    n.sent_at, 'system', 'Account (' || a.lifecycle_audit_ref || ')'
  FROM account_retention_notices n JOIN users a ON a.id = n.user_id
  WHERE n.sent_at IS NOT NULL;

DROP TRIGGER account_deleted_data;

CREATE TRIGGER account_deleted_data
BEFORE DELETE ON users
BEGIN
  -- App-managed deletions insert their event in the same D1 batch before
  -- DELETE. Direct Better Auth deletion gets its event inside this trigger.
  INSERT INTO audit_events (
    id, event_type, entity_type, entity_id, target_user_id, metadata_json,
    created_at, actor_kind, actor_label, target_label
  )
  SELECT lower(hex(randomblob(16))), 'account.deleted', 'account_lifecycle',
    OLD.lifecycle_audit_ref, OLD.id,
    json_object('initiatedBy', 'self'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    'user', 'Deleted account', 'Deleted account (' || OLD.lifecycle_audit_ref || ')'
  WHERE NOT EXISTS (SELECT 1 FROM audit_events
    WHERE target_user_id = OLD.id AND entity_type = 'account_lifecycle' AND event_type = 'account.deleted');

  -- Detach only the minimized lifecycle history before removing identity-linked
  -- audit records. The random reference remains searchable across all periods.
  UPDATE audit_events SET target_user_id = NULL,
    target_label = 'Deleted account (' || entity_id || ')'
  WHERE target_user_id = OLD.id AND entity_type = 'account_lifecycle'
    AND entity_id = OLD.lifecycle_audit_ref;

  UPDATE audit_events SET actor_user_id = NULL, actor_label = 'Deleted account'
  WHERE actor_user_id = OLD.id AND entity_type = 'account_lifecycle';

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
