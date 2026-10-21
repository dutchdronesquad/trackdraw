-- Bind immutable edit proposals to the ownership context in which they were reviewed.
-- Existing proposals remain personal; moving a project never upgrades a proposal.
ALTER TABLE mcp_project_edits ADD COLUMN team_id TEXT REFERENCES teams(id);
