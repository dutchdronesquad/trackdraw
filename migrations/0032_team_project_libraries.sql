-- Shared lease boundary for ownership changes; acquisition/renewal arrives in #1022.
-- A personal project with an active lease cannot change ownership.
CREATE TABLE project_edit_leases (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
