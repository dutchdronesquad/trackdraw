import "server-only";

import { mcp } from "@better-auth/mcp";
import { getOAuthProviderApi } from "@better-auth/oauth-provider";
import { createAuthEndpoint } from "better-auth/api";
import { z } from "zod";
import {
  getMcpResource,
  MCP_OAUTH_SCOPES,
  MCP_DEFAULT_SCOPES,
} from "./oauth-metadata";

export function getMcpOAuthPlugins() {
  const resource = getMcpResource();
  const options = {
    resource,
    loginPage: "/login",
    consentPage: "/mcp/consent",
    scopes: MCP_OAUTH_SCOPES,
    grantTypes: ["authorization_code", "refresh_token"] as (
      "authorization_code" | "refresh_token"
    )[],
    // Opaque tokens are checked against the provider's store on every call.
    // This preserves immediate revocation without a JWKS/network round trip.
    disableJwtPlugin: true,
    storeTokens: "hashed" as const,
    accessTokenExpiresIn: 15 * 60,
    refreshTokenExpiresIn: 30 * 24 * 60 * 60,
    codeExpiresIn: 5 * 60,
    refreshTokenReuseInterval: 0,
    allowDynamicClientRegistration: true,
    allowUnauthenticatedClientRegistration: true,
    clientRegistrationDefaultApplicationType: "infer" as const,
    clientRegistrationDefaultScopes: MCP_DEFAULT_SCOPES,
    clientRegistrationAllowedScopes: MCP_OAUTH_SCOPES,
    clientRegistrationRequirePKCE: true,
    resources: [
      {
        identifier: resource,
        allowedScopes: MCP_OAUTH_SCOPES,
        accessTokenTtl: 15 * 60,
      },
    ],
  };
  return [
    mcp(options),
    {
      id: "trackdraw-mcp-token-validation",
      endpoints: {
        // Pathless, server-only API: never expose token introspection without
        // client authentication over HTTP. Reuse the provider's own validation.
        verifyMcpAccessToken: createAuthEndpoint.serverOnly(
          {
            method: "POST",
            body: z.object({ token: z.string().min(1).max(4096) }),
          },
          async (ctx) =>
            getOAuthProviderApi(ctx, options).requireActiveAccessToken(
              ctx.body.token
            )
        ),
      },
    },
  ] as const;
}
