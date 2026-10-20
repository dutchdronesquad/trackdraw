import "server-only";

import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { getAuth } from "@/lib/server/auth";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getDatabase } from "@/lib/server/db";
import {
  MCP_OAUTH_SCOPES,
  MCP_READ_SCOPE,
  getMcpResource,
} from "./oauth-provider";

export async function getConsentRequest(query: string, headers: Headers) {
  if (query.length > 8192) return null;
  const auth = await getAuth();
  const { secret } = await auth.$context;
  if (!(await verifyOAuthQueryParams(query, secret))) return null;
  const params = new URLSearchParams(query);
  const scopes = params.get("scope")?.split(" ").filter(Boolean) ?? [];
  if (
    !scopes.includes(MCP_READ_SCOPE) ||
    scopes.some((scope) => !MCP_OAUTH_SCOPES.includes(scope)) ||
    !params.getAll("resource").includes(getMcpResource())
  )
    return null;
  const user = await getCurrentUserFromHeaders(headers);
  if (!user) return null;
  const db = await getDatabase();
  const client = await db
    .prepare(
      "SELECT clientId, name FROM oauthClient WHERE clientId = ? AND (disabled IS NULL OR disabled = 0)"
    )
    .bind(params.get("client_id") ?? "")
    .first<{ clientId: string; name: string | null }>();
  if (!client) return null;
  const callback = params.get("redirect_uri");
  if (!callback) return null;
  let callbackHost;
  try {
    callbackHost = new URL(callback).host || new URL(callback).protocol;
  } catch {
    return null;
  }
  return {
    query,
    clientId: client.clientId,
    clientName: client.name ?? client.clientId,
    callbackHost,
    account: user.email ?? user.name ?? user.id,
    offlineAccess: scopes.includes("offline_access"),
  };
}

export async function listMcpConnections(userId: string) {
  const db = await getDatabase();
  const result = await db
    .prepare(
      `
    SELECT c.id, c.clientId, a.name, c.createdAt
    FROM oauthConsent c JOIN oauthClient a ON a.clientId = c.clientId
    WHERE c.userId = ?
    AND EXISTS (SELECT 1 FROM json_each(c.resources) WHERE value = ?)
    ORDER BY c.createdAt DESC, c.id
  `
    )
    .bind(userId, getMcpResource())
    .all<{
      id: string;
      clientId: string;
      name: string | null;
      createdAt: string;
    }>();
  return result.results;
}

export async function disconnectMcpConnection(
  userId: string,
  consentId: string
) {
  const db = await getDatabase();
  // The deletion trigger atomically removes access/refresh tokens. Ownership
  // and resource filtering live in the mutation, not a separate preflight.
  const deleted = await db
    .prepare(
      `
    DELETE FROM oauthConsent WHERE id = ? AND userId = ?
    AND EXISTS (SELECT 1 FROM json_each(resources) WHERE value = ?)
    RETURNING id
  `
    )
    .bind(consentId, userId, getMcpResource())
    .first<{ id: string }>();
  return Boolean(deleted);
}
