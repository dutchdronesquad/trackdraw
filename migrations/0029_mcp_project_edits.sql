ALTER TABLE projects ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;

-- Every persistence path, including metadata-only updates, invalidates proposals.
CREATE TRIGGER projects_revision_after_update
AFTER UPDATE ON projects WHEN NEW.revision = OLD.revision
BEGIN
  UPDATE projects SET revision = OLD.revision + 1 WHERE id = NEW.id;
END;

UPDATE oauthResource
SET allowedScopes = json_insert(allowedScopes, '$[#]', 'projects:update'),
    policyVersion = policyVersion + 1,
    updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE identifier LIKE '%/api/mcp' AND json_valid(allowedScopes)
  AND NOT EXISTS (SELECT 1 FROM json_each(allowedScopes) WHERE value = 'projects:update');

-- Applied proposals double as durable, account-owned pre-change versions.
-- Unapplied proposals expire; applied versions remain until project/account removal.
CREATE TABLE mcp_project_edits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  base_revision INTEGER NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  changes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  applied_at TEXT,
  applied_revision INTEGER
);
CREATE INDEX mcp_project_edits_owner_project ON mcp_project_edits(user_id, project_id, applied_revision);
