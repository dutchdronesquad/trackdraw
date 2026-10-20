import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../../helpers/sqlite-d1";
import { getDatabase } from "@/lib/server/db";
import {
  disconnectMcpConnection,
  listMcpConnections,
} from "@/lib/server/mcp/connections";
import { cleanupMcpOauth } from "@/lib/server/mcp/oauth-retention";
import { getMcpLoginContinuation } from "@/lib/mcp/login-continuation";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn() }));
let sqlite: ReturnType<typeof createMigratedDatabase>;
const resource = "https://trackdraw.app/api/mcp";
function grant(
  id: string,
  userId = "owner",
  clientId = "client",
  target = resource
) {
  sqlite
    .prepare(
      "INSERT INTO oauthConsent (id,userId,clientId,resources,scopes,createdAt,updatedAt) VALUES (?,?,?,?,?,'2026-10-20','2026-10-20')"
    )
    .run(id, userId, clientId, JSON.stringify([target]), '["mcp:read"]');
}
function tokens(userId = "owner", expires = "2030-01-01") {
  sqlite
    .prepare(
      "INSERT INTO oauthRefreshToken (id,token,clientId,userId,scopes,createdAt,expiresAt) VALUES ('refresh','hashed-refresh','client',?,'[\"mcp:read\",\"offline_access\"]','2026-10-20',?)"
    )
    .run(userId, expires);
  sqlite
    .prepare(
      "INSERT INTO oauthAccessToken (id,token,clientId,userId,refreshId,scopes,createdAt,expiresAt) VALUES ('access','hashed-access','client',?,'refresh','[\"mcp:read\"]','2026-10-20',?)"
    )
    .run(userId, expires);
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");
  sqlite = createMigratedDatabase();
  for (const id of ["owner", "other"])
    sqlite
      .prepare(
        "INSERT INTO users (id,name,email,createdAt,updatedAt) VALUES (?,?,?,'2026-10-20','2026-10-20')"
      )
      .run(id, id, id + "@example.invalid");
  sqlite.exec(
    `INSERT INTO oauthClient (id,clientId,name,redirectUris,createdAt) VALUES ('client','client','Example app','["https://example.com/callback"]','2026-10-20')`
  );
  vi.mocked(getDatabase).mockResolvedValue(sqliteD1(sqlite));
});
afterEach(() => {
  sqlite.close();
  vi.unstubAllEnvs();
});

describe("MCP grants and credential lifecycle", () => {
  it("lists only this user's MCP grants", async () => {
    grant("owned");
    grant("other-user", "other");
    grant("other-resource", "owner", "client", "https://other.example/api");
    expect(await listMcpConnections("owner")).toMatchObject([
      { id: "owned", name: "Example app" },
    ]);
  });
  it("does not let another account disconnect a grant", async () => {
    grant("owned");
    tokens();
    expect(await disconnectMcpConnection("other", "owned")).toBe(false);
    expect(
      sqlite.prepare("SELECT count(*) AS count FROM oauthAccessToken").get()
    ).toMatchObject({ count: 1 });
  });
  it("atomically removes a disconnected grant and its access/refresh tokens", async () => {
    grant("owned");
    grant("unrelated", "other");
    tokens();
    expect(await disconnectMcpConnection("owner", "owned")).toBe(true);
    expect(
      sqlite.prepare("SELECT count(*) AS count FROM oauthAccessToken").get()
    ).toMatchObject({ count: 0 });
    expect(
      sqlite.prepare("SELECT count(*) AS count FROM oauthRefreshToken").get()
    ).toMatchObject({ count: 0 });
    expect(await listMcpConnections("other")).toHaveLength(1);
  });
  it("cascades account deletion into grants, tokens and budgets", () => {
    grant("owned");
    tokens();
    sqlite.exec(
      "INSERT INTO mcp_oauth_request_budget VALUES ('owner','client',123,1); DELETE FROM users WHERE id='owner'"
    );
    for (const table of [
      "oauthConsent",
      "oauthAccessToken",
      "oauthRefreshToken",
      "mcp_oauth_request_budget",
    ])
      expect(
        sqlite.prepare(`SELECT count(*) AS count FROM ${table}`).get()
      ).toMatchObject({ count: 0 });
  });
  it("cleans old credential records and counters while preserving active grants", async () => {
    grant("owned");
    tokens("owner", "2000-01-01");
    sqlite.exec(
      "INSERT INTO auth_rate_limit (id,key,count,lastRequest) VALUES ('rate','fixture',1,0); INSERT INTO mcp_oauth_request_budget VALUES ('owner','client',0,1); INSERT INTO oauthClientAssertion (id,expiresAt) VALUES ('assertion','2000-01-01')"
    );
    const result = await cleanupMcpOauth(sqliteD1(sqlite));
    expect(result.meta.changes).toBe(5);
    expect(await listMcpConnections("owner")).toHaveLength(1);
    tokens("owner", "2030-01-01");
    await cleanupMcpOauth(sqliteD1(sqlite));
    expect(
      sqlite.prepare("SELECT count(*) AS count FROM oauthAccessToken").get()
    ).toMatchObject({ count: 1 });
  });
});

describe("MCP sign-in continuation", () => {
  it("keeps ordinary sign-in callbacks unchanged", () => {
    expect(getMcpLoginContinuation("?callbackURL=%2Fstudio")).toBeNull();
    expect(getMcpLoginContinuation("?client_id=untrusted")).toBeNull();
  });
  it("returns to our authorizer and preserves the request through either sign-in method", () => {
    const result = getMcpLoginContinuation(
      "?sig=signed&ba_param=client_id&client_id=app&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&resource=https%3A%2F%2Ftrackdraw.app%2Fapi%2Fmcp&state=secret-state&code_challenge=challenge&code_challenge_method=S256&scope=mcp%3Aread&callbackURL=https%3A%2F%2Fevil.example"
    );
    const url = new URL(result!, "https://trackdraw.app");
    expect(url.pathname).toBe("/api/auth/oauth2/authorize");
    expect(url.searchParams.get("state")).toBe("secret-state");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("callbackURL")).toBeNull();
    expect(url.searchParams.get("sig")).toBeNull();
  });
});
