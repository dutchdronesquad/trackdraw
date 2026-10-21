-- Membership loss invalidates the token permanently, including removal/rejoin
-- or downgrade/promotion within the original lease's expiry window.
CREATE TRIGGER project_edit_lease_member_removed
AFTER DELETE ON team_members
BEGIN
  DELETE FROM project_edit_leases WHERE user_id = OLD.userId
    AND project_id IN (SELECT id FROM projects WHERE owner_team_id = OLD.organizationId);
END;

CREATE TRIGGER project_edit_lease_member_changed
AFTER UPDATE OF role, organizationId, userId ON team_members
WHEN NEW.role IS NOT OLD.role OR NEW.organizationId IS NOT OLD.organizationId OR NEW.userId IS NOT OLD.userId
BEGIN
  DELETE FROM project_edit_leases WHERE user_id = OLD.userId
    AND project_id IN (SELECT id FROM projects WHERE owner_team_id = OLD.organizationId);
END;

-- Lifecycle writers share the same boundary even if a future route forgets
-- its application-level lease predicate. Design writes still require their token.
CREATE TRIGGER project_edit_lease_lifecycle_guard
BEFORE UPDATE OF archived_at, owner_user_id, owner_team_id ON projects
WHEN (NEW.archived_at IS NOT OLD.archived_at
   OR NEW.owner_user_id IS NOT OLD.owner_user_id
   OR NEW.owner_team_id IS NOT OLD.owner_team_id)
 AND EXISTS (SELECT 1 FROM project_edit_leases WHERE project_id = OLD.id
   AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now'))
BEGIN
  SELECT RAISE(ABORT, 'project_edit_session_active');
END;
