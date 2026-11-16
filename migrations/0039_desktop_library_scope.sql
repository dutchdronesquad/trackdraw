-- Existing desktop grants retain their identity-only scope until reapproved.
UPDATE oauthResource
SET allowedScopes = json_insert(allowedScopes, '$[#]', 'desktop:library')
WHERE id = 'trackdraw-desktop-session';

UPDATE oauthClient
SET scopes = json_insert(scopes, '$[#]', 'desktop:library')
WHERE clientId = 'trackdraw-desktop';
