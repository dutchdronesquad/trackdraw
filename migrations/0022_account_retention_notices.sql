CREATE TABLE account_retention_notices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_at TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('first', 'final')),
  removal_at TEXT NOT NULL,
  attempted_at TEXT,
  claim_token TEXT,
  claim_until TEXT,
  sent_at TEXT,
  UNIQUE (user_id, activity_at, stage)
);

CREATE INDEX account_retention_notices_pending ON account_retention_notices(sent_at, attempted_at);

-- Reset notices atomically with authenticated activity, including API-key use.
CREATE TRIGGER account_retention_notices_reactivated
AFTER UPDATE OF last_active_at ON users
WHEN OLD.last_active_at IS NOT NEW.last_active_at
BEGIN
  DELETE FROM account_retention_notices WHERE user_id = NEW.id;
END;
