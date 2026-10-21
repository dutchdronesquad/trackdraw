-- D1 runs each migration in a transaction. Deferral keeps existing share FKs
-- valid while projects is rebuilt; it does NOT suppress ON DELETE CASCADE.
PRAGMA defer_foreign_keys = ON;

-- Organization-plugin-compatible fields, mapped to product-facing Teams.
-- Do not enable organization endpoints until invitation/lifecycle work lands.
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT,
  metadata TEXT,
  createdAt TEXT NOT NULL
);
CREATE TABLE team_members (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  createdAt TEXT NOT NULL,
  UNIQUE (organizationId, userId)
);
CREATE UNIQUE INDEX team_members_one_owner ON team_members(organizationId) WHERE role = 'owner';
CREATE INDEX team_members_user ON team_members(userId, organizationId);
CREATE TABLE team_invitations (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
  inviterId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX team_invitations_team ON team_invitations(organizationId);
CREATE INDEX team_invitations_inviter ON team_invitations(inviterId);
CREATE UNIQUE INDEX team_invitations_pending_email ON team_invitations(organizationId, lower(email)) WHERE status = 'pending';

-- Preserve applied AND pending history before dropping the parent: the old
-- mcp_project_edits FK cascades even with deferred foreign key checking.
CREATE TABLE team_migration_projects AS SELECT * FROM projects;
CREATE TABLE team_migration_edits AS SELECT * FROM mcp_project_edits;
DROP TABLE projects;
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  owner_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  design_json TEXT NOT NULL,
  field_width REAL,
  field_height REAL,
  shape_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  CHECK ((owner_user_id IS NOT NULL) != (owner_team_id IS NOT NULL))
);
INSERT INTO projects (
  id, owner_user_id, owner_team_id, created_by_user_id, title, description,
  design_json, field_width, field_height, shape_count, created_at, updated_at,
  archived_at, revision
)
SELECT id, owner_user_id, NULL, owner_user_id, title, description, design_json,
  field_width, field_height, shape_count, created_at, updated_at, archived_at,
  revision FROM team_migration_projects;
INSERT INTO mcp_project_edits SELECT * FROM team_migration_edits;
DROP TABLE team_migration_edits;
DROP TABLE team_migration_projects;

CREATE INDEX projects_owner_user_id_idx ON projects(owner_user_id);
CREATE INDEX projects_created_by_user_id_idx ON projects(created_by_user_id);
CREATE INDEX projects_owner_team_id_idx ON projects(owner_team_id, archived_at, updated_at DESC, id);
CREATE INDEX projects_updated_at_idx ON projects(updated_at);
CREATE TRIGGER projects_revision_after_update
AFTER UPDATE ON projects WHEN NEW.revision = OLD.revision
BEGIN
  UPDATE projects SET revision = OLD.revision + 1 WHERE id = NEW.id;
END;

-- COMMIT restores immediate checking and validates deferred references.
