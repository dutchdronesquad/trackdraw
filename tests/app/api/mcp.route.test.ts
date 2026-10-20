import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "better-auth/api";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { POST, GET, DELETE, OPTIONS } from "@/app/api/mcp/route";
import { MCP_MAX_BODY_BYTES } from "@/lib/server/mcp/handler";
import { getAuth } from "@/lib/server/auth";
import { getDatabase } from "@/lib/server/db";
import { getEarlyWorkerResponse } from "@/lib/server/request-guards";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ getAuth: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/server/account-activity", () => ({
  recordAuthenticatedAccountActivity: vi.fn(),
}));

const endpoint = "https://trackdraw.app/api/mcp";
let sqlite: ReturnType<typeof createMigratedDatabase>;
const verifyAccessToken = vi.fn();
const claims = {
  active: true,
  iss: "https://trackdraw.app/api/auth",
  aud: "https://trackdraw.app/api/mcp",
  sub: "user-1",
  client_id: "client-1",
  scope: "mcp:read",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

function rpc(method: string, params?: unknown, init?: RequestInit) {
  return new Request(endpoint, {
    method: "POST",
    ...init,
    headers: {
      authorization: "Bearer oauth_test",
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2025-11-25",
      ...init?.headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      ...(params === undefined ? {} : { params }),
    }),
  });
}

async function openClient(key = "oauth_test") {
  const client = new Client({ name: "trackdraw-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers: { authorization: `Bearer ${key}` } },
    fetch: async (url, init) => {
      const request = new Request(url, init);
      return request.method === "POST" ? POST(request) : GET(request);
    },
  });
  await client.connect(transport);
  return { client, transport };
}

describe("TrackDraw MCP endpoint", () => {
  afterEach(() => {
    sqlite?.close();
    vi.unstubAllEnvs();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
    vi.spyOn(console, "info").mockImplementation(() => {});
    sqlite = createMigratedDatabase();
    const now = new Date().toISOString();
    for (const id of ["user-1", "user-2"]) {
      sqlite
        .prepare(
          "INSERT INTO users (id,name,email,createdAt,updatedAt,last_active_at) VALUES (?,?,?,?,?,?)"
        )
        .run(
          id,
          id === "user-1" ? "Pilot" : "Other pilot",
          id + "@example.invalid",
          now,
          now,
          now
        );
    }
    sqlite.exec(
      `INSERT INTO oauthClient (id,clientId,name,redirectUris) VALUES ('client-1','client-1','Test client','["http://localhost/callback"]')`
    );
    for (const id of ["user-1", "user-2"]) {
      sqlite
        .prepare(
          "INSERT INTO oauthConsent (id,userId,clientId,resources,scopes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)"
        )
        .run(
          "consent-" + id,
          id,
          "client-1",
          JSON.stringify([claims.aud]),
          JSON.stringify(["mcp:read"]),
          now,
          now
        );
    }
    verifyAccessToken.mockImplementation(async ({ body }) => {
      if (body.token.startsWith("td_"))
        throw new APIError("UNAUTHORIZED", { error: "invalid_token" });
      return {
        ...claims,
        sub: body.token === "oauth_other" ? "user-2" : "user-1",
      };
    });
    vi.mocked(getAuth).mockResolvedValue({
      api: { verifyMcpAccessToken: verifyAccessToken },
    } as never);
    vi.mocked(getDatabase).mockResolvedValue(sqliteD1(sqlite));
  });

  it("passes the early Worker guard and negotiates MCP using the official client", async () => {
    expect(getEarlyWorkerResponse(rpc("ping"))).toBeNull();
    const { client, transport } = await openClient();
    try {
      expect(client.getServerVersion()).toEqual({
        name: "trackdraw",
        version: "1.3.0",
      });
      expect(client.getServerCapabilities()?.tools).toBeDefined();
      expect(transport.sessionId).toBeUndefined();
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name)).toEqual([
        "get_account",
        "get_track_catalog",
      ]);
      expect(tools[0].annotations?.readOnlyHint).toBe(true);
      const result = await client.callTool({
        name: "get_account",
        arguments: {},
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        account: { id: "user-1", name: "Pilot" },
        permissions: { mcp: ["read"] },
        mcp: {
          tools: ["get_account", "get_track_catalog"],
          project_reads: false,
          project_writes: false,
        },
      });
      expect(JSON.stringify(result)).not.toMatch(
        /private@example|oauth_test|referenceId/
      );
      expect(verifyAccessToken.mock.calls.length).toBeGreaterThanOrEqual(4);
    } finally {
      await client.close();
    }
  });

  it("returns the authorized account without key material and never caches it", async () => {
    const response = await POST(
      rpc("tools/call", { name: "get_account", arguments: {} })
    );
    expect(await response.json()).toMatchObject({
      result: {
        structuredContent: {
          type: "api_identity",
          account: { id: "user-1", name: "Pilot" },
          permissions: { mcp: ["read"] },
          mcp: { project_writes: false },
        },
      },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("does not retain one account's identity for another request", async () => {
    const firstResponse = await POST(
      rpc("tools/call", { name: "get_account" })
    );
    const secondResponse = await POST(
      rpc(
        "tools/call",
        { name: "get_account" },
        { headers: { authorization: "Bearer oauth_other" } }
      )
    );
    expect(await firstResponse.json()).toMatchObject({
      result: { structuredContent: { account: { id: "user-1" } } },
    });
    expect(await secondResponse.json()).toMatchObject({
      result: { structuredContent: { account: { id: "user-2" } } },
    });
  });

  it.each([undefined, "", "Basic oauth_test", "Bearer oauth_test extra"])(
    "requires strict bearer auth: %s",
    async (authorization) => {
      const request = rpc("initialize");
      if (authorization === undefined) request.headers.delete("authorization");
      else request.headers.set("authorization", authorization);
      request.headers.set(
        "cookie",
        "better-auth.session_token=browser-session"
      );
      const response = await POST(request);
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain(
        'resource_metadata="https://trackdraw.app/.well-known/oauth-protected-resource/api/mcp"'
      );
      expect(response.headers.get("www-authenticate")).toContain(
        'scope="mcp:read projects:read projects:create projects:update"'
      );
      expect(verifyAccessToken).not.toHaveBeenCalled();
    }
  );

  it.each(["INVALID_API_KEY", "KEY_EXPIRED", "KEY_DISABLED", "KEY_NOT_FOUND"])(
    "rejects %s even after initialization",
    async (code) => {
      const { client } = await openClient();
      try {
        verifyAccessToken.mockRejectedValue(
          new APIError("UNAUTHORIZED", { error: code })
        );
        const response = await POST(rpc("tools/list"));
        expect(response.status).toBe(401);
        const call = await POST(rpc("tools/call", { name: "get_account" }));
        expect(call.status).toBe(401);
      } finally {
        await client.close();
      }
    }
  );

  it("rejects a key whose account no longer exists", async () => {
    sqlite.exec("DELETE FROM users WHERE id = 'user-1'");
    expect((await POST(rpc("tools/list"))).status).toBe(401);
  });

  it("applies the shared per-key request budget and retry timing", async () => {
    sqlite
      .prepare(
        "INSERT INTO mcp_oauth_request_budget (user_id,client_id,window_start_ms,request_count) VALUES (?,?,?,600)"
      )
      .run("user-1", "client-1", Date.now() - 3_598_500);
    const response = await POST(rpc("ping"));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("rejects tokens without the required scope for discovery and calls", async () => {
    verifyAccessToken.mockResolvedValue({ ...claims, scope: "offline_access" });
    for (const method of ["tools/list", "tools/call"]) {
      const response = await POST(rpc(method, { name: "get_account" }));
      expect(response.status).toBe(403);
      expect(response.headers.get("www-authenticate")).toContain(
        'error="insufficient_scope"'
      );
    }
  });

  it.each([
    { aud: "https://other.example/mcp" },
    { iss: "https://other.example/auth" },
    { exp: 1 },
    { exp: NaN },
    { sub: undefined },
    { cnf: { jkt: "sender-bound" } },
  ])(
    "rejects invalid resource/issuer/expiry/subject or sender-bound token: %j",
    async (patch) => {
      verifyAccessToken.mockResolvedValue({ ...claims, ...patch });
      expect((await POST(rpc("tools/list"))).status).toBe(401);
    }
  );

  it("does not accept a REST API key as an OAuth access token", async () => {
    expect(
      (
        await POST(
          rpc("tools/list", undefined, {
            headers: { authorization: "Bearer td_rest_key" },
          })
        )
      ).status
    ).toBe(401);
  });

  it("requires a live consent and an unbanned account", async () => {
    sqlite.exec(
      "UPDATE users SET banned_at = '2026-01-01' WHERE id = 'user-1'"
    );
    expect((await POST(rpc("tools/list"))).status).toBe(401);
    sqlite.exec(
      "UPDATE users SET banned_at = NULL WHERE id = 'user-1'; DELETE FROM oauthConsent WHERE userId = 'user-1'"
    );
    expect((await POST(rpc("tools/list"))).status).toBe(401);
  });

  it.each([
    "create_draft",
    "update_project",
    "delete_project",
    "publish_share",
  ])("does not expose or execute write tool %s", async (name) => {
    const response = await POST(rpc("tools/call", { name, arguments: {} }));
    const body = await response.json();
    expect(body).toMatchObject({ result: { isError: true } });
    expect(JSON.stringify(body)).not.toContain("private@example.com");
  });

  it("rejects unexpected identity arguments instead of accepting a target account", async () => {
    const response = await POST(
      rpc("tools/call", {
        name: "get_account",
        arguments: { accountId: "user-2" },
      })
    );
    expect(await response.json()).toMatchObject({ result: { isError: true } });
  });

  it.each([
    "https://evil.example",
    "null",
    "https://trackdraw.app.evil.example",
    "https://trackdraw.app/path",
    "http://localhost:8787",
  ])("rejects an invalid Origin before auth: %s", async (origin) => {
    const response = await POST(
      rpc("ping", undefined, { headers: { origin } })
    );
    expect(response.status).toBe(403);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("accepts the configured origin and local preview origins outside production", async () => {
    expect(
      (
        await POST(
          rpc("ping", undefined, {
            headers: { origin: "https://trackdraw.app" },
          })
        )
      ).status
    ).toBe(200);
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    expect(
      (
        await POST(
          rpc("ping", undefined, {
            headers: { origin: "http://localhost:8787" },
          })
        )
      ).status
    ).toBe(200);
  });

  it("rejects query-string credentials even if a header is also present", async () => {
    const request = new Request(endpoint + "?key=secret", rpc("ping"));
    expect((await POST(request)).status).toBe(400);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    ["GET", GET],
    ["DELETE", DELETE],
    ["OPTIONS", OPTIONS],
  ] as const)(
    "authenticates unsupported methods and returns 405 without an SSE stream",
    async (method, handler) => {
      expect((await handler(new Request(endpoint, { method }))).status).toBe(
        401
      );
      const response = await handler(
        new Request(endpoint, {
          method,
          headers: { authorization: "Bearer oauth_test" },
        })
      );
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  );

  it("bounds both declared and streamed body size", async () => {
    const declared = rpc("ping");
    declared.headers.set("content-length", String(MCP_MAX_BODY_BYTES + 1));
    expect((await POST(declared)).status).toBe(413);
    const streamed = new Request(endpoint, {
      method: "POST",
      headers: rpc("ping").headers,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(" ".repeat(MCP_MAX_BODY_BYTES))
          );
          controller.enqueue(new TextEncoder().encode("{}"));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit);
    expect((await POST(streamed)).status).toBe(413);
  });

  it.each(["{", "null", "[]", '[{"jsonrpc":"2.0","id":1,"method":"ping"}]'])(
    "rejects malformed or batched messages: %s",
    async (body) => {
      const request = new Request(endpoint, {
        method: "POST",
        headers: rpc("ping").headers,
        body,
      });
      expect((await POST(request)).status).toBe(400);
    }
  );

  it("checks media types and protocol versions", async () => {
    expect(
      (
        await POST(
          rpc("ping", undefined, { headers: { "content-type": "text/plain" } })
        )
      ).status
    ).toBe(415);
    expect(
      (await POST(rpc("ping", undefined, { headers: { accept: "text/html" } })))
        .status
    ).toBe(406);
    expect(
      (
        await POST(
          rpc("ping", undefined, {
            headers: { "mcp-protocol-version": "invalid" },
          })
        )
      ).status
    ).toBe(400);
  });

  it("accepts initialized notifications without creating sessions", async () => {
    const request = new Request(endpoint, {
      method: "POST",
      headers: rpc("ping").headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
    expect(response.headers.has("mcp-session-id")).toBe(false);
  });

  it("returns a sanitized failure and logs only an allowlisted operational record", async () => {
    vi.mocked(getAuth).mockRejectedValue(
      new Error("secret oauth_test private@example.com track contents")
    );
    const response = await POST(rpc("ping"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(
      /oauth_test|private@example|track contents/
    );
    expect(console.info).toHaveBeenCalledWith(expect.any(String));
    const log = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)![0]);
    expect(log).toEqual({
      event: "mcp_request",
      method: "POST",
      status: 500,
      duration_ms: expect.any(Number),
    });
  });
});
