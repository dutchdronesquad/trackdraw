import "server-only";

import { isAPIError } from "better-auth/api";
import { toAccountIdentitySummary } from "@/lib/server/api-identity";
import { getAuth } from "@/lib/server/auth";
import { getDatabase } from "@/lib/server/db";
import { getBearerApiKey, trackReadPermission } from "@/lib/server/api-keys";
import { recordAuthenticatedAccountActivity } from "@/lib/server/account-activity";
import {
  MCP_DEFAULT_SCOPES,
  MCP_PROJECT_READ_SCOPE,
  MCP_PROJECT_CREATE_SCOPE,
  MCP_READ_SCOPE,
  getMcpIssuer,
  getMcpResource,
} from "./oauth-provider";

const BUDGET_WINDOW_MS = 3_600_000;
const BUDGET_MAX = 600;

export function mcpChallenge(error?: "invalid_token" | "insufficient_scope") {
  const metadata = new URL(
    "/.well-known/oauth-protected-resource/api/mcp",
    getMcpResource()
  ).href;
  return `Bearer resource_metadata="${metadata}", scope="${MCP_DEFAULT_SCOPES.join(" ")}"${error ? `, error="${error}"` : ""}`;
}

function failure(
  status: number,
  detail: string,
  error?: "invalid_token" | "insufficient_scope"
) {
  return {
    ok: false as const,
    status,
    detail,
    headers: { "WWW-Authenticate": mcpChallenge(error) },
  };
}

export async function authenticateMcpRequest(request: Request) {
  const token = getBearerApiKey(request.headers);
  if (!token || token.length > 4096)
    return failure(401, "Authorize your TrackDraw account to connect.");
  const auth = await getAuth();
  let claims;
  try {
    claims = await auth.api.verifyMcpAccessToken({
      body: { token },
      headers: request.headers,
    });
  } catch (error) {
    if (isAPIError(error) && error.statusCode === 401) {
      return failure(
        401,
        "The MCP access token is invalid, expired or revoked.",
        "invalid_token"
      );
    }
    throw error;
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    claims.iss !== getMcpIssuer() ||
    !audience.includes(getMcpResource()) ||
    !claims.sub ||
    !claims.client_id ||
    typeof claims.client_id !== "string" ||
    typeof claims.exp !== "number" ||
    !Number.isFinite(claims.exp) ||
    claims.exp * 1000 <= Date.now() ||
    claims.cnf
  ) {
    return failure(
      401,
      "The access token is not valid for this MCP resource.",
      "invalid_token"
    );
  }
  const scopes =
    typeof claims.scope === "string" ? claims.scope.split(" ") : [];
  if (!scopes.includes(MCP_READ_SCOPE))
    return failure(
      403,
      "The mcp:read scope is required.",
      "insufficient_scope"
    );
  const db = await getDatabase();
  const user = await db
    .prepare(
      `
    SELECT u.id, u.name, u.last_active_at AS lastActiveAt
    FROM users u WHERE u.id = ? AND u.banned_at IS NULL
    AND EXISTS (SELECT 1 FROM oauthConsent c WHERE c.userId = u.id AND c.clientId = ?
      AND EXISTS (SELECT 1 FROM json_each(c.scopes) WHERE value = 'mcp:read')
      AND EXISTS (SELECT 1 FROM json_each(c.resources) WHERE value = ?)
      AND (? = 0 OR EXISTS (SELECT 1 FROM json_each(c.scopes) WHERE value = 'projects:read'))
      AND (? = 0 OR EXISTS (SELECT 1 FROM json_each(c.scopes) WHERE value = 'projects:create')))
  `
    )
    .bind(
      claims.sub,
      claims.client_id,
      getMcpResource(),
      scopes.includes(MCP_PROJECT_READ_SCOPE) ? 1 : 0,
      scopes.includes(MCP_PROJECT_CREATE_SCOPE) ? 1 : 0
    )
    .first<{ id: string; name: string | null; lastActiveAt: string | null }>();
  if (!user)
    return failure(
      401,
      "The MCP connection is no longer authorized.",
      "invalid_token"
    );

  const now = Date.now();
  const slot = await db
    .prepare(
      `
    INSERT INTO mcp_oauth_request_budget (user_id, client_id, window_start_ms, request_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, client_id) DO UPDATE SET
      window_start_ms = CASE WHEN window_start_ms <= ? THEN excluded.window_start_ms ELSE window_start_ms END,
      request_count = CASE WHEN window_start_ms <= ? THEN 1 ELSE request_count + 1 END
    WHERE window_start_ms <= ? OR request_count < ?
    RETURNING request_count
  `
    )
    .bind(
      user.id,
      claims.client_id,
      now,
      now - BUDGET_WINDOW_MS,
      now - BUDGET_WINDOW_MS,
      now - BUDGET_WINDOW_MS,
      BUDGET_MAX
    )
    .first<{ request_count: number }>();
  if (!slot) {
    const budget = await db
      .prepare(
        "SELECT window_start_ms FROM mcp_oauth_request_budget WHERE user_id = ? AND client_id = ?"
      )
      .bind(user.id, claims.client_id)
      .first<{ window_start_ms: number }>();
    const retry = Math.max(
      1,
      Math.ceil(
        ((budget?.window_start_ms ?? now) + BUDGET_WINDOW_MS - now) / 1000
      )
    );
    return {
      ok: false as const,
      status: 429,
      detail: "The MCP connection request budget is exhausted.",
      headers: { "Retry-After": String(retry) },
    };
  }
  await recordAuthenticatedAccountActivity(db, user);
  return {
    ok: true as const,
    identity: toAccountIdentitySummary(
      user,
      {
        mcp: ["read"],
        ...(scopes.includes(MCP_PROJECT_CREATE_SCOPE)
          ? { projects: ["create"] }
          : {}),
        ...(scopes.includes(MCP_PROJECT_READ_SCOPE) ? trackReadPermission : {}),
      },
      new Date(claims.exp * 1000)
    ),
  };
}
