-- Existing desktop grants retain their current scopes until reapproved.
UPDATE oauthResource
SET allowedScopes = json_insert(allowedScopes, '$[#]', 'desktop:projects:read')
WHERE id = 'trackdraw-desktop-session';

UPDATE oauthClient
SET scopes = json_insert(scopes, '$[#]', 'desktop:projects:read')
WHERE clientId = 'trackdraw-desktop';
