-- First-party public native client, independent of dynamic MCP registration.
-- The audience is a stable identifier. The issuing origin and token database
-- are still separate per environment.
INSERT INTO oauthResource (id, identifier, name, allowedScopes, accessTokenTtl)
VALUES ('trackdraw-desktop-session', 'https://trackdraw.app/api/desktop/session',
        'TrackDraw Desktop session', '["desktop:account","offline_access"]', 900);

INSERT INTO oauthClient (id, clientId, name, applicationType, tokenEndpointAuthMethod,
                         scopes, redirectUris, grantTypes, responseTypes, requirePKCE)
VALUES ('trackdraw-desktop', 'trackdraw-desktop', 'TrackDraw Desktop', 'native', 'none',
        '["desktop:account","offline_access"]', '["http://127.0.0.1/callback"]',
        '["authorization_code","refresh_token"]', '["code"]', 1);

INSERT INTO oauthClientResource (id, clientId, resourceId)
VALUES ('trackdraw-desktop-session', 'trackdraw-desktop',
        'https://trackdraw.app/api/desktop/session');
