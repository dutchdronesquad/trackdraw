-- Team recovery is independent of personal account retention. D1 migrates atomically.
PRAGMA defer_foreign_keys = ON;
-- Team publications may outlive the personal account of their last manager.
CREATE TABLE succession_gallery_backup AS SELECT * FROM gallery_entries;
DROP TABLE gallery_entries;
CREATE TABLE gallery_entries (
  id TEXT PRIMARY KEY,
  share_token TEXT NOT NULL UNIQUE,
  owner_user_id TEXT,
  gallery_state TEXT NOT NULL DEFAULT 'unlisted',
  gallery_title TEXT NOT NULL,
  gallery_description TEXT NOT NULL,
  gallery_preview_image TEXT,
  gallery_published_at TEXT,
  moderation_hidden_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (share_token) REFERENCES shares(token) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (
    gallery_state IN ('unlisted', 'listed', 'featured', 'hidden')
  )
);
INSERT INTO gallery_entries SELECT * FROM succession_gallery_backup;
DROP TABLE succession_gallery_backup;
CREATE INDEX gallery_entries_owner_user_id_idx
  ON gallery_entries(owner_user_id);
CREATE INDEX gallery_entries_gallery_state_idx
  ON gallery_entries(gallery_state);
CREATE INDEX gallery_entries_gallery_published_at_idx
  ON gallery_entries(gallery_published_at DESC);
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

CREATE TABLE team_succession_cases (
 id TEXT PRIMARY KEY,
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
 owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 activity_at TEXT NOT NULL,
 removal_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','recovery','resolved','canceled')),
 opened_at TEXT NOT NULL,
 recovery_at TEXT,
 purge_at TEXT,
 purge_checked_at TEXT,
 CHECK ((recovery_at IS NULL) = (purge_at IS NULL))
);
CREATE UNIQUE INDEX team_succession_live ON team_succession_cases(team_id) WHERE state IN ('open','recovery');
CREATE TABLE team_succession_eligible (
 case_id TEXT NOT NULL REFERENCES team_succession_cases(id) ON DELETE CASCADE,
 member_id TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY(case_id,user_id)
);
CREATE TABLE team_succession_applications (
 id TEXT PRIMARY KEY,
 case_id TEXT NOT NULL REFERENCES team_succession_cases(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 requested_at TEXT NOT NULL,
 response_at TEXT,
 checked_at TEXT,
 withdrawn_at TEXT,
 UNIQUE(case_id,user_id)
);
CREATE TABLE team_succession_notices (
 id TEXT PRIMARY KEY,
 case_id TEXT NOT NULL REFERENCES team_succession_cases(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event TEXT NOT NULL CHECK(event IN ('risk','application','ownerless','reminder30','reminder7','outcome')),
 application_id TEXT REFERENCES team_succession_applications(id) ON DELETE CASCADE,
 due_at TEXT NOT NULL,
 sent_at TEXT,
 claimed_at TEXT,
 claim_token TEXT,
 attempted_at TEXT,
 uncertain INTEGER NOT NULL DEFAULT 0,
 attempt_generation INTEGER NOT NULL DEFAULT 0,
 UNIQUE(case_id,user_id,event,application_id)
);
CREATE UNIQUE INDEX team_succession_notice_once ON team_succession_notices(case_id,user_id,event) WHERE application_id IS NULL;
CREATE INDEX team_succession_notice_due ON team_succession_notices(sent_at,due_at);
CREATE INDEX team_succession_purge ON team_succession_cases(state,purge_at);
-- These one-statement command records are consumed by triggers; no persistent bypass.
CREATE TABLE team_succession_commands (
 id TEXT PRIMARY KEY,
 case_id TEXT NOT NULL REFERENCES team_succession_cases(id) ON DELETE CASCADE,
 actor_id TEXT REFERENCES users(id) ON DELETE CASCADE,
 action TEXT NOT NULL CHECK(action IN ('apply','withdraw','advance','confirm-notice','retry-notice')),
 application_id TEXT,
 notice_id TEXT,
 reason TEXT NOT NULL DEFAULT '',
 now TEXT NOT NULL
);
CREATE TABLE team_retention_deletions (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, now TEXT NOT NULL);

-- Older owners receive a fresh full notification cycle on rollout.
DELETE FROM account_retention_notices WHERE user_id IN (SELECT userId FROM team_members WHERE role='owner');

CREATE TRIGGER team_succession_case_open
AFTER UPDATE OF sent_at ON account_retention_notices
WHEN NEW.stage='first' AND NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL
BEGIN
 INSERT OR IGNORE INTO team_succession_cases(id,team_id,owner_id,activity_at,removal_at,opened_at)
 SELECT lower(hex(randomblob(16))),m.organizationId,NEW.user_id,NEW.activity_at,NEW.removal_at,NEW.sent_at
 FROM team_members m WHERE m.userId=NEW.user_id AND m.role='owner';
END;
CREATE TRIGGER team_succession_snapshot
AFTER INSERT ON team_succession_cases
BEGIN
 INSERT INTO team_succession_eligible(case_id,member_id,user_id)
 SELECT NEW.id,m.id,m.userId FROM team_members m JOIN users u ON u.id=m.userId
 WHERE m.organizationId=NEW.team_id AND m.role='editor' AND u.banned_at IS NULL AND u.emailVerified=1;
 INSERT INTO team_succession_notices(id,case_id,user_id,event,due_at)
 SELECT lower(hex(randomblob(16))),NEW.id,userId,'risk',NEW.opened_at FROM team_members WHERE organizationId=NEW.team_id;
END;
CREATE TRIGGER team_succession_owner_return
AFTER UPDATE OF last_active_at ON users
WHEN NEW.last_active_at IS NOT OLD.last_active_at
BEGIN
 UPDATE team_succession_cases SET state='canceled' WHERE owner_id=NEW.id AND state='open' AND activity_at IS NOT NEW.last_active_at;
END;
CREATE TRIGGER team_succession_explicit_transfer
AFTER INSERT ON team_owner_transfers
BEGIN
 UPDATE team_succession_cases SET state='canceled' WHERE team_id=NEW.team_id AND state IN ('open','recovery');
END;

-- The account job sets this capability only inside its guarded deletion batch.
DROP TRIGGER team_owner_before_member_delete;
CREATE TRIGGER team_owner_before_member_delete BEFORE DELETE ON team_members
WHEN OLD.role='owner' AND EXISTS(SELECT 1 FROM teams WHERE id=OLD.organizationId)
 AND NOT EXISTS(SELECT 1 FROM team_succession_cases c WHERE c.team_id=OLD.organizationId AND c.state='recovery' AND c.owner_id IS NULL)
BEGIN SELECT RAISE(ABORT,'team_owner_required'); END;
CREATE TRIGGER team_succession_detach BEFORE DELETE ON users
WHEN EXISTS(SELECT 1 FROM team_members WHERE userId=OLD.id AND role='owner')
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM team_retention_deletions WHERE user_id=OLD.id) THEN RAISE(ABORT,'team_owner_required') END;
 INSERT OR IGNORE INTO team_succession_cases(id,team_id,owner_id,activity_at,removal_at,opened_at)
 SELECT lower(hex(randomblob(16))),organizationId,OLD.id,OLD.last_active_at,d.now,d.now
 FROM team_members JOIN team_retention_deletions d ON d.user_id=OLD.id WHERE userId=OLD.id AND role='owner';
 UPDATE team_succession_cases SET state='recovery',owner_id=NULL,
   recovery_at=(SELECT now FROM team_retention_deletions WHERE user_id=OLD.id),
   purge_at=strftime('%Y-%m-%dT%H:%M:%fZ',(SELECT now FROM team_retention_deletions WHERE user_id=OLD.id),'+90 days')
 WHERE owner_id=OLD.id AND state='open';
 UPDATE shares SET owner_user_id=NULL WHERE project_id IN (SELECT p.id FROM projects p JOIN team_succession_cases c ON c.team_id=p.owner_team_id WHERE c.state='recovery') AND owner_user_id=OLD.id;
 UPDATE gallery_entries SET owner_user_id=NULL WHERE share_token IN (SELECT token FROM shares WHERE owner_user_id IS NULL AND project_id IN (SELECT id FROM projects WHERE owner_team_id IS NOT NULL)) AND owner_user_id=OLD.id;
 DELETE FROM project_edit_leases WHERE project_id IN (SELECT p.id FROM projects p JOIN team_succession_cases c ON c.team_id=p.owner_team_id WHERE c.state='recovery');
 INSERT OR IGNORE INTO team_succession_notices(id,case_id,user_id,event,due_at)
 SELECT lower(hex(randomblob(16))),c.id,m.userId,'ownerless',c.recovery_at FROM team_succession_cases c JOIN team_members m ON m.organizationId=c.team_id WHERE c.state='recovery' AND m.userId<>OLD.id;
 INSERT OR IGNORE INTO team_succession_notices(id,case_id,user_id,event,due_at)
 SELECT lower(hex(randomblob(16))),c.id,m.userId,'reminder30',strftime('%Y-%m-%dT%H:%M:%fZ',c.purge_at,'-30 days') FROM team_succession_cases c JOIN team_members m ON m.organizationId=c.team_id WHERE c.state='recovery' AND m.userId<>OLD.id;
 INSERT OR IGNORE INTO team_succession_notices(id,case_id,user_id,event,due_at)
 SELECT lower(hex(randomblob(16))),c.id,m.userId,'reminder7',strftime('%Y-%m-%dT%H:%M:%fZ',c.purge_at,'-7 days') FROM team_succession_cases c JOIN team_members m ON m.organizationId=c.team_id WHERE c.state='recovery' AND m.userId<>OLD.id;
END;
CREATE TRIGGER team_recovery_project_insert BEFORE INSERT ON projects WHEN EXISTS(SELECT 1 FROM team_succession_cases c JOIN teams t ON t.id=c.team_id WHERE c.team_id=NEW.owner_team_id AND c.state='recovery') BEGIN SELECT RAISE(ABORT,'team_read_only'); END;
CREATE TRIGGER team_recovery_project_update BEFORE UPDATE OF title,description,design_json,owner_team_id,owner_user_id,archived_at,revision,field_width,field_height,shape_count,updated_at ON projects WHEN EXISTS(SELECT 1 FROM team_succession_cases c JOIN teams t ON t.id=c.team_id WHERE c.team_id IN (NEW.owner_team_id,OLD.owner_team_id) AND c.state='recovery') BEGIN SELECT RAISE(ABORT,'team_read_only'); END;
CREATE TRIGGER team_recovery_project_delete BEFORE DELETE ON projects WHEN EXISTS(SELECT 1 FROM team_succession_cases c JOIN teams t ON t.id=c.team_id WHERE c.team_id=OLD.owner_team_id AND c.state='recovery') BEGIN SELECT RAISE(ABORT,'team_read_only'); END;

CREATE TRIGGER team_recovery_member_insert BEFORE INSERT ON team_members
WHEN EXISTS(SELECT 1 FROM team_succession_cases WHERE team_id=NEW.organizationId AND state='recovery')
BEGIN SELECT RAISE(ABORT,'team_read_only'); END;
CREATE TRIGGER team_recovery_member_update BEFORE UPDATE ON team_members
WHEN EXISTS(SELECT 1 FROM team_succession_cases WHERE team_id=OLD.organizationId AND state='recovery')
BEGIN SELECT RAISE(ABORT,'team_read_only'); END;

CREATE TRIGGER team_succession_command_validate BEFORE INSERT ON team_succession_commands
WHEN NOT EXISTS(SELECT 1 FROM team_succession_cases c WHERE c.id=NEW.case_id AND (c.state IN ('open','recovery') OR (c.state='resolved' AND NEW.action IN ('confirm-notice','retry-notice'))) AND (c.purge_at IS NULL OR julianday(NEW.now)<julianday(c.purge_at) OR NEW.action IN ('confirm-notice','retry-notice')) AND (
 (NEW.action='apply' AND EXISTS(SELECT 1 FROM team_succession_eligible e JOIN team_members m ON m.id=e.member_id AND m.userId=e.user_id JOIN users u ON u.id=m.userId WHERE e.case_id=c.id AND e.user_id=NEW.actor_id AND m.organizationId=c.team_id AND m.role='editor' AND u.banned_at IS NULL AND u.emailVerified=1) AND (c.purge_at IS NULL OR julianday(NEW.now,'+30 days')<=julianday(c.purge_at)) AND NOT EXISTS(SELECT 1 FROM team_succession_applications a WHERE a.case_id=c.id AND a.user_id=NEW.actor_id))
 OR (NEW.action='withdraw' AND EXISTS(SELECT 1 FROM team_members m JOIN users u ON u.id=m.userId WHERE m.organizationId=c.team_id AND m.userId=NEW.actor_id AND u.banned_at IS NULL AND u.emailVerified=1) AND EXISTS(SELECT 1 FROM team_succession_applications a WHERE a.case_id=c.id AND a.user_id=NEW.actor_id AND a.withdrawn_at IS NULL))
 OR (NEW.action IN ('confirm-notice','retry-notice') AND EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND role='admin' AND banned_at IS NULL) AND length(trim(NEW.reason)) BETWEEN 1 AND 1000 AND EXISTS(SELECT 1 FROM team_succession_notices n WHERE n.id=NEW.notice_id AND n.case_id=c.id AND n.sent_at IS NULL AND n.uncertain=1))
 OR (NEW.action='advance' AND NEW.actor_id IS NULL AND EXISTS(
   SELECT 1 FROM team_succession_applications a
   JOIN team_succession_eligible e ON e.case_id=a.case_id AND e.user_id=a.user_id
   JOIN team_members m ON m.id=e.member_id AND m.userId=e.user_id
   JOIN users u ON u.id=m.userId
   WHERE a.id=NEW.application_id AND a.case_id=c.id AND a.withdrawn_at IS NULL
     AND m.organizationId=c.team_id AND m.role='editor' AND u.banned_at IS NULL AND u.emailVerified=1
     AND (SELECT count(*) FROM team_members WHERE userId=a.user_id AND role='owner')<5
     AND julianday(a.response_at)<=julianday(NEW.now)
     -- First completed eligible request wins, including deterministic ties.
     AND NOT EXISTS(SELECT 1 FROM team_succession_applications earlier
       JOIN team_succession_eligible ee ON ee.case_id=earlier.case_id AND ee.user_id=earlier.user_id
       JOIN team_members em ON em.id=ee.member_id AND em.userId=ee.user_id
       JOIN users eu ON eu.id=em.userId
       WHERE earlier.case_id=c.id AND earlier.withdrawn_at IS NULL AND em.role='editor'
         AND eu.banned_at IS NULL AND eu.emailVerified=1
         AND (SELECT count(*) FROM team_members WHERE userId=earlier.user_id AND role='owner')<5
         AND (julianday(earlier.response_at)<julianday(a.response_at)
           OR (earlier.response_at=a.response_at AND (earlier.requested_at<a.requested_at
             OR (earlier.requested_at=a.requested_at AND earlier.id<a.id)))))
 ))
))
BEGIN SELECT RAISE(ABORT,'succession_invalid'); END;

CREATE TRIGGER team_succession_command_apply AFTER INSERT ON team_succession_commands
BEGIN
 INSERT INTO team_succession_applications(id,case_id,user_id,requested_at)
 SELECT NEW.id,NEW.case_id,NEW.actor_id,NEW.now WHERE NEW.action='apply';
 INSERT INTO team_succession_notices(id,case_id,user_id,event,application_id,due_at)
 SELECT lower(hex(randomblob(16))),NEW.case_id,m.userId,'application',NEW.id,NEW.now FROM team_members m JOIN team_succession_cases c ON c.team_id=m.organizationId WHERE c.id=NEW.case_id AND NEW.action='apply';
 UPDATE team_succession_applications SET withdrawn_at=NEW.now WHERE case_id=NEW.case_id AND NEW.action='withdraw' AND user_id=NEW.actor_id;
 UPDATE team_succession_notices SET sent_at=NEW.now,uncertain=0,claimed_at=NULL WHERE id=NEW.notice_id AND case_id=NEW.case_id AND NEW.action='confirm-notice';
 UPDATE team_succession_notices SET uncertain=0,claimed_at=NULL,attempted_at=NULL,attempt_generation=attempt_generation+1 WHERE id=NEW.notice_id AND case_id=NEW.case_id AND NEW.action='retry-notice';
 -- Resolve before membership mutation, so read-only and explicit-transfer guards remain intact.
 UPDATE team_succession_cases SET state='resolved' WHERE id=NEW.case_id AND NEW.action='advance';
 INSERT INTO team_owner_transfers(team_id,from_user_id,to_user_id)
 SELECT c.team_id,c.owner_id,a.user_id FROM team_succession_cases c JOIN team_succession_applications a ON a.id=NEW.application_id
 WHERE c.id=NEW.case_id AND NEW.action='advance' AND c.owner_id IS NOT NULL;
 UPDATE team_members SET role='owner' WHERE organizationId=(SELECT team_id FROM team_succession_cases WHERE id=NEW.case_id AND owner_id IS NULL)
 AND userId=(SELECT user_id FROM team_succession_applications WHERE id=NEW.application_id) AND NEW.action='advance';
 UPDATE shares SET owner_user_id=(SELECT user_id FROM team_succession_applications WHERE id=NEW.application_id)
 WHERE project_id IN (SELECT p.id FROM projects p JOIN team_succession_cases c ON c.team_id=p.owner_team_id WHERE c.id=NEW.case_id) AND NEW.action='advance';
 UPDATE gallery_entries SET owner_user_id=(SELECT user_id FROM team_succession_applications WHERE id=NEW.application_id)
 WHERE share_token IN (SELECT s.token FROM shares s JOIN projects p ON p.id=s.project_id JOIN team_succession_cases c ON c.team_id=p.owner_team_id WHERE c.id=NEW.case_id) AND NEW.action='advance';
 INSERT OR IGNORE INTO team_succession_notices(id,case_id,user_id,event,due_at)
 SELECT lower(hex(randomblob(16))),NEW.case_id,m.userId,'outcome',NEW.now FROM team_members m JOIN team_succession_cases c ON c.team_id=m.organizationId WHERE c.id=NEW.case_id AND NEW.action='advance';
 INSERT INTO audit_events(id,actor_user_id,event_type,entity_type,entity_id,metadata_json,created_at,actor_kind,target_label)
 SELECT NEW.id,NEW.actor_id,'team.succession.'||NEW.action,'team',c.team_id,
 json_object('caseId',c.id,'applicationId',NEW.application_id,'noticeId',NEW.notice_id,'reason',NEW.reason),
 NEW.now,CASE WHEN NEW.actor_id IS NULL THEN 'system' ELSE 'user' END,t.name FROM team_succession_cases c JOIN teams t ON t.id=c.team_id WHERE c.id=NEW.case_id;
 DELETE FROM team_succession_commands WHERE id=NEW.id;
END;

-- Authorize only the existing guarded retention batch, without extra per-account queries.
CREATE TRIGGER team_retention_capability AFTER INSERT ON audit_events
WHEN NEW.event_type='account.deleted' AND json_extract(NEW.metadata_json,'$.initiatedBy')='inactivity'
BEGIN
 INSERT OR REPLACE INTO team_retention_deletions(user_id,now) SELECT NEW.target_user_id,NEW.created_at WHERE EXISTS(SELECT 1 FROM users WHERE id=NEW.target_user_id);
END;
CREATE TRIGGER team_retention_capability_rejected AFTER DELETE ON audit_events
WHEN OLD.event_type='account.deleted' AND EXISTS(SELECT 1 FROM users WHERE id=OLD.target_user_id)
BEGIN DELETE FROM team_retention_deletions WHERE user_id=OLD.target_user_id; END;
CREATE TRIGGER team_succession_command_owner_active BEFORE INSERT ON team_succession_commands
WHEN NEW.action IN ('approve','advance') AND EXISTS(
 SELECT 1 FROM team_succession_cases c JOIN users u ON u.id=c.owner_id WHERE c.id=NEW.case_id AND
 (u.last_active_at IS NOT c.activity_at OR EXISTS(SELECT 1 FROM sessions s WHERE s.userId=u.id AND (julianday(s.expiresAt)>julianday(NEW.now) OR julianday(s.expiresAt) IS NULL))))
BEGIN SELECT RAISE(ABORT,'succession_invalid'); END;
CREATE TRIGGER team_succession_applicant_removed AFTER DELETE ON team_members
BEGIN UPDATE team_succession_applications SET withdrawn_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE user_id=OLD.userId AND withdrawn_at IS NULL AND case_id IN (SELECT id FROM team_succession_cases WHERE team_id=OLD.organizationId AND state IN ('open','recovery')); END;
CREATE TRIGGER team_succession_applicant_demoted AFTER UPDATE OF role ON team_members
WHEN NEW.role <> 'editor'
BEGIN UPDATE team_succession_applications SET withdrawn_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE user_id=OLD.userId AND withdrawn_at IS NULL AND case_id IN (SELECT id FROM team_succession_cases WHERE team_id=OLD.organizationId AND state IN ('open','recovery')); END;

CREATE TRIGGER team_succession_warning_updated AFTER UPDATE OF sent_at ON account_retention_notices
WHEN NEW.sent_at IS NOT NULL
BEGIN UPDATE team_succession_cases SET removal_at=NEW.removal_at WHERE owner_id=NEW.user_id AND activity_at=NEW.activity_at AND state='open'; END;
CREATE TRIGGER team_succession_banned AFTER UPDATE OF banned_at ON users
WHEN NEW.banned_at IS NOT NULL
BEGIN UPDATE team_succession_applications SET withdrawn_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id=NEW.id AND withdrawn_at IS NULL; END;

-- Creator anonymization is bookkeeping, not an editor write or a new revision.
DROP TRIGGER projects_revision_after_update;
CREATE TRIGGER projects_revision_after_update
AFTER UPDATE OF title,description,design_json,owner_user_id,owner_team_id,archived_at,field_width,field_height,shape_count,updated_at ON projects
WHEN NEW.revision=OLD.revision
BEGIN UPDATE projects SET revision=OLD.revision+1 WHERE id=NEW.id; END;
-- New members are notified without changing the original eligibility snapshot.
CREATE TRIGGER team_succession_member_joined AFTER INSERT ON team_members
BEGIN
 INSERT OR IGNORE INTO team_succession_notices(id,case_id,user_id,event,due_at)
 SELECT lower(hex(randomblob(16))),c.id,NEW.userId,'risk',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM team_succession_cases c WHERE c.team_id=NEW.organizationId AND c.state='open';
 INSERT OR IGNORE INTO team_succession_notices(id,case_id,user_id,event,application_id,due_at)
 SELECT lower(hex(randomblob(16))),c.id,NEW.userId,'application',a.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM team_succession_cases c JOIN team_succession_applications a ON a.case_id=c.id WHERE c.team_id=NEW.organizationId AND c.state='open' AND a.withdrawn_at IS NULL;
END;

CREATE TRIGGER team_recovery_member_delete BEFORE DELETE ON team_members
WHEN EXISTS(SELECT 1 FROM team_succession_cases c JOIN teams t ON t.id=c.team_id WHERE c.team_id=OLD.organizationId AND c.state='recovery')
 AND EXISTS(SELECT 1 FROM users WHERE id=OLD.userId)
BEGIN SELECT RAISE(ABORT,'team_read_only'); END;
CREATE TRIGGER team_recovery_lease_insert BEFORE INSERT ON project_edit_leases
WHEN EXISTS(SELECT 1 FROM projects p JOIN team_succession_cases c ON c.team_id=p.owner_team_id WHERE p.id=NEW.project_id AND c.state='recovery')
BEGIN SELECT RAISE(ABORT,'team_read_only'); END;

-- Audited owner correction works for every team, including ownerless recovery.
-- Compare the owner shown to the administrator to reject stale concurrent changes.
CREATE TABLE team_admin_owner_changes (
 id TEXT PRIMARY KEY,
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 owner_id TEXT,
 target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason TEXT NOT NULL,
 now TEXT NOT NULL
);
CREATE TRIGGER team_admin_owner_change_validate BEFORE INSERT ON team_admin_owner_changes
WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND role='admin' AND banned_at IS NULL)
 OR length(trim(NEW.reason)) NOT BETWEEN 1 AND 1000
 OR NEW.owner_id IS NOT (SELECT userId FROM team_members WHERE organizationId=NEW.team_id AND role='owner')
 OR NOT EXISTS(SELECT 1 FROM team_members m JOIN users u ON u.id=m.userId
   WHERE m.organizationId=NEW.team_id AND m.userId=NEW.target_id AND m.role='editor'
     AND u.emailVerified=1 AND u.banned_at IS NULL
     AND (SELECT count(*) FROM team_members WHERE userId=NEW.target_id AND role='owner')<5)
 OR EXISTS(SELECT 1 FROM team_succession_cases WHERE team_id=NEW.team_id AND state='recovery' AND julianday(purge_at)<=julianday(NEW.now))
BEGIN SELECT RAISE(ABORT,'team_admin_owner_invalid'); END;
CREATE TRIGGER team_admin_owner_change_apply AFTER INSERT ON team_admin_owner_changes
BEGIN
 UPDATE team_succession_cases SET state='resolved' WHERE team_id=NEW.team_id AND state IN ('open','recovery');
 INSERT INTO team_owner_transfers(team_id,from_user_id,to_user_id)
 SELECT NEW.team_id,NEW.owner_id,NEW.target_id WHERE NEW.owner_id IS NOT NULL;
 UPDATE team_members SET role='owner' WHERE organizationId=NEW.team_id AND userId=NEW.target_id AND NEW.owner_id IS NULL;
 UPDATE shares SET owner_user_id=NEW.target_id WHERE project_id IN (SELECT id FROM projects WHERE owner_team_id=NEW.team_id);
 UPDATE gallery_entries SET owner_user_id=NEW.target_id WHERE share_token IN (SELECT token FROM shares WHERE project_id IN (SELECT id FROM projects WHERE owner_team_id=NEW.team_id));
 INSERT OR IGNORE INTO team_succession_notices(id,case_id,user_id,event,due_at)
 SELECT lower(hex(randomblob(16))),c.id,m.userId,'outcome',NEW.now FROM team_succession_cases c JOIN team_members m ON m.organizationId=c.team_id
 WHERE c.team_id=NEW.team_id AND c.state='resolved';
 INSERT INTO audit_events(id,actor_user_id,event_type,entity_type,entity_id,metadata_json,created_at,actor_kind,target_label)
 SELECT NEW.id,NEW.actor_id,'team.owner_corrected','team',t.id,
 json_object('previousOwnerId',NEW.owner_id,'ownerId',NEW.target_id,'reason',NEW.reason),NEW.now,'user',t.name FROM teams t WHERE t.id=NEW.team_id;
 DELETE FROM team_admin_owner_changes WHERE id=NEW.id;
END;
