-- Retain moved publications through deletion of the former personal owner,
-- using the same ownership as publications created directly by the team.
CREATE TRIGGER team_project_move_publications
AFTER UPDATE OF owner_team_id ON projects
WHEN OLD.owner_user_id IS NOT NULL AND NEW.owner_team_id IS NOT NULL
BEGIN
  UPDATE shares
  SET owner_user_id = (
    SELECT userId FROM team_members
    WHERE organizationId = NEW.owner_team_id AND role = 'owner'
  )
  WHERE project_id = NEW.id;

  UPDATE gallery_entries
  SET owner_user_id = (
    SELECT userId FROM team_members
    WHERE organizationId = NEW.owner_team_id AND role = 'owner'
  )
  WHERE share_token IN (SELECT token FROM shares WHERE project_id = NEW.id);
END;
