import { getSiteUrl } from "@/lib/seo";

export const MCP_READ_SCOPE = "mcp:read";
export const MCP_PROJECT_READ_SCOPE = "projects:read";
export const MCP_PROJECT_CREATE_SCOPE = "projects:create";
export const MCP_PROJECT_UPDATE_SCOPE = "projects:update";
export const MCP_DEFAULT_SCOPES = [
  MCP_READ_SCOPE,
  MCP_PROJECT_READ_SCOPE,
  MCP_PROJECT_CREATE_SCOPE,
  MCP_PROJECT_UPDATE_SCOPE,
];
export const MCP_TEAM_ACCESS_SCOPE = "teams:access";
export const MCP_SUPPORTED_SCOPES = [
  ...MCP_DEFAULT_SCOPES,
  MCP_TEAM_ACCESS_SCOPE,
];
export const MCP_OAUTH_SCOPES = [...MCP_SUPPORTED_SCOPES, "offline_access"];

export function getMcpResource(siteUrl: string = getSiteUrl()) {
  return new URL("/api/mcp", siteUrl).href;
}

export function getMcpIssuer(siteUrl: string = getSiteUrl()) {
  return new URL("/api/auth", siteUrl).href;
}

// These public documents contain configuration only, never account or token state.
// A parity test against the installed provider prevents dependency defaults drifting.
const signingAlgorithms = [
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
  "EdDSA",
];
const dpopAlgorithms = ["EdDSA", "ES256", "ES512", "PS256", "RS256"];
const authenticatedMethods = [
  "client_secret_basic",
  "client_secret_post",
  "private_key_jwt",
];

export function getMcpDiscoveryResponse(
  request: Request,
  siteUrl: string = getSiteUrl()
): Response | null {
  const path = new URL(request.url).pathname;
  const resource =
    path === "/.well-known/oauth-protected-resource" ||
    path === "/.well-known/oauth-protected-resource/api/mcp";
  const issuer = path === "/.well-known/oauth-authorization-server/api/auth";
  if (!resource && !issuer) return null;
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (request.method !== "GET" && request.method !== "HEAD")
    return new Response(null, {
      status: 405,
      headers: { ...headers, Allow: "GET, HEAD" },
    });
  const base = getMcpIssuer(siteUrl);
  const metadata = resource
    ? {
        resource: getMcpResource(siteUrl),
        authorization_servers: [base],
        bearer_methods_supported: ["header"],
        dpop_signing_alg_values_supported: dpopAlgorithms,
        scopes_supported: MCP_SUPPORTED_SCOPES,
      }
    : {
        scopes_supported: MCP_OAUTH_SCOPES,
        issuer: base,
        authorization_endpoint: base + "/oauth2/authorize",
        token_endpoint: base + "/oauth2/token",
        registration_endpoint: base + "/oauth2/register",
        introspection_endpoint: base + "/oauth2/introspect",
        revocation_endpoint: base + "/oauth2/revoke",
        response_types_supported: ["code"],
        response_modes_supported: ["query"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported: [
          "none",
          ...authenticatedMethods,
        ],
        token_endpoint_auth_signing_alg_values_supported: signingAlgorithms,
        introspection_endpoint_auth_methods_supported: authenticatedMethods,
        introspection_endpoint_auth_signing_alg_values_supported:
          signingAlgorithms,
        revocation_endpoint_auth_methods_supported: authenticatedMethods,
        revocation_endpoint_auth_signing_alg_values_supported:
          signingAlgorithms,
        code_challenge_methods_supported: ["S256"],
        authorization_response_iss_parameter_supported: true,
        dpop_signing_alg_values_supported: dpopAlgorithms,
        backchannel_logout_supported: false,
        backchannel_logout_session_supported: false,
      };
  return request.method === "HEAD"
    ? new Response(null, {
        headers: { ...headers, "Content-Type": "application/json" },
      })
    : Response.json(metadata, { headers });
}
