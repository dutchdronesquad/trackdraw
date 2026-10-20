-- The provider seeds resources insert-only. Upgrade the existing MCP resource
-- allowlist without changing any client registration, consent or token scope.
UPDATE oauthResource
SET allowedScopes = json_insert(allowedScopes, '$[#]', 'projects:read'),
    policyVersion = policyVersion + 1,
    updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE identifier LIKE '%/api/mcp'
  AND json_valid(allowedScopes)
  AND EXISTS (SELECT 1 FROM json_each(allowedScopes) WHERE value = 'mcp:read')
  AND NOT EXISTS (SELECT 1 FROM json_each(allowedScopes) WHERE value = 'projects:read');
