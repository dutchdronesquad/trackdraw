-- Opt-in create-only capability. Existing clients, grants and tokens stay read-only.
UPDATE oauthResource
SET allowedScopes = json_insert(allowedScopes, '$[#]', 'projects:create'),
    policyVersion = policyVersion + 1,
    updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE identifier LIKE '%/api/mcp'
  AND json_valid(allowedScopes)
  AND EXISTS (SELECT 1 FROM json_each(allowedScopes) WHERE value = 'mcp:read')
  AND NOT EXISTS (SELECT 1 FROM json_each(allowedScopes) WHERE value = 'projects:create');

-- Receipts outlive project deletion so a retry never recreates an archived/deleted draft.
CREATE TABLE mcp_draft_requests (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  project_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, request_key)
);
