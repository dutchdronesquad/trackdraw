-- The command row exists only during this single atomic INSERT. Triggers
-- consume it before statement completion, so no durable bypass is left behind.
CREATE TABLE team_owner_transfers (
  team_id TEXT PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CHECK (from_user_id <> to_user_id)
);

DROP TRIGGER team_owner_before_member_update;
CREATE TRIGGER team_owner_before_member_update
BEFORE UPDATE OF role, userId, organizationId ON team_members
WHEN OLD.role = 'owner' AND (NEW.role <> 'owner' OR NEW.userId <> OLD.userId OR NEW.organizationId <> OLD.organizationId)
 AND NOT (NEW.role = 'editor' AND NEW.userId = OLD.userId AND NEW.organizationId = OLD.organizationId
   AND EXISTS (SELECT 1 FROM team_owner_transfers x JOIN team_members target
     ON target.organizationId = x.team_id AND target.userId = x.to_user_id
     JOIN users u ON u.id = target.userId
     WHERE x.team_id = OLD.organizationId AND x.from_user_id = OLD.userId
       AND target.role IN ('editor','viewer') AND u.emailVerified = 1 AND u.banned_at IS NULL))
BEGIN
  SELECT RAISE(ABORT, 'team_owner_required');
END;

CREATE TRIGGER team_owner_transfer_validate
BEFORE INSERT ON team_owner_transfers
WHEN NOT EXISTS (
  SELECT 1 FROM team_members current JOIN team_members target ON target.organizationId = current.organizationId
  JOIN users u ON u.id = target.userId
  WHERE current.organizationId = NEW.team_id AND current.userId = NEW.from_user_id AND current.role = 'owner'
    AND target.userId = NEW.to_user_id AND target.role IN ('editor','viewer')
    AND u.emailVerified = 1 AND u.banned_at IS NULL
    AND (SELECT count(*) FROM team_members WHERE userId = NEW.to_user_id AND role = 'owner') < 5
)
BEGIN
  SELECT RAISE(ABORT, 'team_transfer_invalid');
END;

CREATE TRIGGER team_owner_transfer_apply
AFTER INSERT ON team_owner_transfers
BEGIN
  UPDATE team_members SET role = 'editor'
    WHERE organizationId = NEW.team_id AND userId = NEW.from_user_id AND role = 'owner';
  SELECT CASE WHEN changes() <> 1 THEN RAISE(ABORT, 'team_transfer_invalid') END;
  UPDATE team_members SET role = 'owner'
    WHERE organizationId = NEW.team_id AND userId = NEW.to_user_id AND role IN ('editor','viewer');
  SELECT CASE WHEN changes() <> 1 THEN RAISE(ABORT, 'team_transfer_invalid') END;
  -- Public snapshots belong to the team's current owner, never to its creator.
  UPDATE shares SET owner_user_id = NEW.to_user_id
    WHERE project_id IN (SELECT id FROM projects WHERE owner_team_id = NEW.team_id);
  UPDATE gallery_entries SET owner_user_id = NEW.to_user_id
    WHERE share_token IN (SELECT token FROM shares WHERE project_id IN (SELECT id FROM projects WHERE owner_team_id = NEW.team_id));
  INSERT INTO audit_events(id,actor_user_id,event_type,entity_type,entity_id,metadata_json,created_at,actor_kind,target_label)
    SELECT lower(hex(randomblob(16))),NEW.from_user_id,'team.ownership_transferred','team',id,
      json_object('previousOwnerId',NEW.from_user_id,'ownerId',NEW.to_user_id),
      strftime('%Y-%m-%dT%H:%M:%fZ','now'),'user',name FROM teams WHERE id = NEW.team_id;
  DELETE FROM team_owner_transfers WHERE team_id = NEW.team_id;
END;

-- Repair creator ownership left by older team publication/move paths.
UPDATE shares SET owner_user_id = (SELECT userId FROM team_members WHERE organizationId = p.owner_team_id AND role = 'owner')
  FROM projects p WHERE shares.project_id = p.id AND p.owner_team_id IS NOT NULL;
UPDATE gallery_entries SET owner_user_id = s.owner_user_id FROM shares s JOIN projects p ON p.id = s.project_id
  WHERE gallery_entries.share_token = s.token AND p.owner_team_id IS NOT NULL;

-- Team DELETE is the explicit purge boundary. Remove public access and leases
-- before purging private projects. The existing gallery trigger queues R2
-- cleanup durably; the account-media cleanup job retries that work.
CREATE TRIGGER team_deleted_data
BEFORE DELETE ON teams
BEGIN
  INSERT INTO audit_events(id,actor_user_id,event_type,entity_type,entity_id,metadata_json,created_at,actor_kind,target_label)
    SELECT lower(hex(randomblob(16))),m.userId,'team.deleted','team',OLD.id,
      json_object('projects',(SELECT count(*) FROM projects WHERE owner_team_id = OLD.id),
        'members',(SELECT count(*) FROM team_members WHERE organizationId = OLD.id)),
      strftime('%Y-%m-%dT%H:%M:%fZ','now'),'user',OLD.name
      FROM team_members m WHERE m.organizationId = OLD.id AND m.role = 'owner';
  DELETE FROM project_edit_leases WHERE project_id IN (SELECT id FROM projects WHERE owner_team_id = OLD.id);
  UPDATE team_invitations SET status = 'canceled' WHERE organizationId = OLD.id AND status = 'pending';
  DELETE FROM gallery_entries WHERE share_token IN (SELECT token FROM shares WHERE project_id IN (SELECT id FROM projects WHERE owner_team_id = OLD.id));
  DELETE FROM shares WHERE project_id IN (SELECT id FROM projects WHERE owner_team_id = OLD.id);
  DELETE FROM projects WHERE owner_team_id = OLD.id;
END;
