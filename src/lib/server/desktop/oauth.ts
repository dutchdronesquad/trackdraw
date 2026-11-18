import "server-only";

import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { isAPIError } from "better-auth/api";
import { getAuth } from "@/lib/server/auth";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getBearerApiKey } from "@/lib/server/api-keys";
import { getDatabase } from "@/lib/server/db";
import { getMcpIssuer } from "@/lib/server/mcp/oauth-metadata";

import {
  DESKTOP_CLIENT_ID,
  DESKTOP_LIBRARY_SCOPE,
  DESKTOP_PROJECT_READ_SCOPE,
  DESKTOP_PROJECT_WRITE_SCOPE,
  DESKTOP_RESOURCE,
  DESKTOP_SCOPE,
} from "@/lib/desktop/oauth-contract";

export async function getDesktopConsentRequest(
  query: string,
  headers: Headers
) {
  if (query.length > 8192) return null;
  const auth = await getAuth();
  const { secret } = await auth.$context;
  if (!(await verifyOAuthQueryParams(query, secret))) return null;
  const params = new URLSearchParams(query);
  const resources = params.getAll("resource");
  const scopes = new Set(params.get("scope")?.split(" "));
  const library = scopes.has(DESKTOP_LIBRARY_SCOPE);
  const projects = scopes.has(DESKTOP_PROJECT_READ_SCOPE);
  const write = scopes.has(DESKTOP_PROJECT_WRITE_SCOPE);
  if (
    params.get("client_id") !== DESKTOP_CLIENT_ID ||
    resources.length !== 1 ||
    resources[0] !== DESKTOP_RESOURCE ||
    (projects && !library) ||
    (write && !projects) ||
    scopes.size !== 2 + Number(library) + Number(projects) + Number(write) ||
    !scopes.has(DESKTOP_SCOPE) ||
    !scopes.has("offline_access")
  )
    return null;
  const user = await getCurrentUserFromHeaders(headers);
  return user
    ? {
        query,
        account: user.email ?? user.name ?? user.id,
        library,
        projects,
        write,
      }
    : null;
}

export async function getDesktopAccount(request: Request) {
  const token = getBearerApiKey(request.headers);
  if (!token || token.length > 4096) return null;
  const auth = await getAuth();
  let claims;
  try {
    claims = await auth.api.verifyOAuthAccessToken({
      body: { token },
      headers: request.headers,
    });
  } catch (error) {
    if (isAPIError(error) && error.statusCode === 401) return null;
    throw error;
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    claims.iss !== getMcpIssuer() ||
    claims.client_id !== DESKTOP_CLIENT_ID ||
    audience.length !== 1 ||
    audience[0] !== DESKTOP_RESOURCE ||
    !claims.sub ||
    claims.cnf ||
    typeof claims.scope !== "string" ||
    !claims.scope.split(" ").includes(DESKTOP_SCOPE)
  )
    return null;
  const db = await getDatabase();
  const account = await db
    .prepare(
      `SELECT u.id, u.name, u.email FROM users u WHERE u.id = ? AND u.banned_at IS NULL
      AND EXISTS (SELECT 1 FROM oauthConsent c WHERE c.userId = u.id AND c.clientId = ?
        AND EXISTS (SELECT 1 FROM json_each(c.resources) WHERE value = ?)
        AND EXISTS (SELECT 1 FROM json_each(c.scopes) WHERE value = ?))`
    )
    .bind(claims.sub, DESKTOP_CLIENT_ID, DESKTOP_RESOURCE, DESKTOP_SCOPE)
    .first<{ id: string; name: string | null; email: string | null }>();
  if (!account) return null;

  const tokenScopes = new Set(claims.scope.split(" "));
  if (!tokenScopes.has(DESKTOP_LIBRARY_SCOPE))
    return {
      ...account,
      libraryAccess: false,
      projectAccess: false,
      projectWriteAccess: false,
    };
  const { results } = await db
    .prepare(
      `SELECT DISTINCT scope.value AS scope FROM oauthConsent c JOIN json_each(c.scopes) scope
      WHERE c.userId = ? AND c.clientId = ?
      AND EXISTS (SELECT 1 FROM json_each(c.resources) WHERE value = ?)`
    )
    .bind(account.id, DESKTOP_CLIENT_ID, DESKTOP_RESOURCE)
    .all<{ scope: string }>();
  const granted = new Set(results.map(({ scope }) => scope));
  const can = (scope: string) => tokenScopes.has(scope) && granted.has(scope);
  const libraryAccess = can(DESKTOP_LIBRARY_SCOPE);
  return {
    ...account,
    libraryAccess,
    projectAccess: libraryAccess && can(DESKTOP_PROJECT_READ_SCOPE),
    projectWriteAccess:
      libraryAccess &&
      can(DESKTOP_PROJECT_READ_SCOPE) &&
      can(DESKTOP_PROJECT_WRITE_SCOPE),
  };
}
