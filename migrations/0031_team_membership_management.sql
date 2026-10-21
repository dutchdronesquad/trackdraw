ALTER TABLE team_invitations ADD COLUMN delivery_state TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_state IN ('pending', 'sent', 'failed'));

CREATE TABLE team_action_limits (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('mutation', 'invitation')),
  window_start INTEGER NOT NULL,
  used INTEGER NOT NULL,
  PRIMARY KEY (user_id, action)
);

-- Owner transfer/deletion is deliberately unavailable until the explicit
-- lifecycle transaction in #1025. Guard EVERY account deletion path, too.
CREATE TRIGGER team_owner_before_member_delete
BEFORE DELETE ON team_members
WHEN OLD.role = 'owner' AND EXISTS (SELECT 1 FROM teams WHERE id = OLD.organizationId)
BEGIN
  SELECT RAISE(ABORT, 'team_owner_required');
END;
CREATE TRIGGER team_owner_before_member_update
BEFORE UPDATE OF role, userId, organizationId ON team_members
WHEN OLD.role = 'owner' AND (NEW.role <> 'owner' OR NEW.userId <> OLD.userId OR NEW.organizationId <> OLD.organizationId)
BEGIN
  SELECT RAISE(ABORT, 'team_owner_required');
END;
