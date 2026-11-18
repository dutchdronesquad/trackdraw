UPDATE oauthResource
SET allowedScopes = json_insert(allowedScopes, '$[#]', 'desktop:projects:write')
WHERE id = 'trackdraw-desktop-session';

UPDATE oauthClient
SET scopes = json_insert(scopes, '$[#]', 'desktop:projects:write')
WHERE clientId = 'trackdraw-desktop';
