import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { POST, GET, DELETE, OPTIONS } from "@/app/api/mcp/route";
import { MCP_MAX_BODY_BYTES } from "@/lib/server/mcp/handler";
import { getAuth } from "@/lib/server/auth";
import { getDatabase } from "@/lib/server/db";
import { toApiIdentitySummary } from "@/lib/server/api-identity";
import { getApiIdentityFromBearerKey } from "@/lib/server/api-keys";
import { getEarlyWorkerResponse } from "@/lib/server/request-guards";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ getAuth: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/server/account-activity", () => ({
  recordAuthenticatedAccountActivity: vi.fn(),
}));

const endpoint = "https://trackdraw.app/api/mcp";
const keyRecord = {
  id: "key-1",
  referenceId: "user-1",
  permissions: { tracks: ["read"] },
  expiresAt: new Date("2027-01-20T00:00:00.000Z"),
};
const verifyApiKey = vi.fn();
const first = vi.fn();

function rpc(method: string, params?: unknown, init?: RequestInit) {
  return new Request(endpoint, {
    method: "POST",
    ...init,
    headers: {
      authorization: "Bearer td_test",
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

async function openClient(key = "td_test") {
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
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
    vi.spyOn(console, "info").mockImplementation(() => {});
    verifyApiKey.mockImplementation(async ({ body }) => ({
      valid: true,
      error: null,
      key: {
        ...keyRecord,
        referenceId: body.key === "td_other" ? "user-2" : "user-1",
      },
    }));
    first.mockResolvedValue({
      id: "user-1",
      name: "Pilot",
      email: "private@example.com",
    });
    vi.mocked(getAuth).mockResolvedValue({ api: { verifyApiKey } } as never);
    vi.mocked(getDatabase).mockResolvedValue({
      prepare: () => ({
        bind: (id: string) => ({
          first: () =>
            id === "user-2"
              ? { id, name: "Other pilot", email: "other@example.com" }
              : first(),
        }),
      }),
    } as never);
  });

  it("passes the early Worker guard and negotiates MCP using the official client", async () => {
    expect(getEarlyWorkerResponse(rpc("ping"))).toBeNull();
    const { client, transport } = await openClient();
    try {
      expect(client.getServerVersion()).toEqual({
        name: "trackdraw",
        version: "1.0.0",
      });
      expect(client.getServerCapabilities()?.tools).toBeDefined();
      expect(transport.sessionId).toBeUndefined();
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name)).toEqual(["get_account"]);
      expect(tools[0].annotations?.readOnlyHint).toBe(true);
      const result = await client.callTool({
        name: "get_account",
        arguments: {},
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        account: { id: "user-1", name: "Pilot" },
        permissions: { tracks: ["read"] },
        mcp: {
          tools: ["get_account"],
          project_reads: false,
          project_writes: false,
        },
      });
      expect(JSON.stringify(result)).not.toMatch(
        /private@example|td_test|referenceId/
      );
      expect(verifyApiKey.mock.calls.length).toBeGreaterThanOrEqual(4);
    } finally {
      await client.close();
    }
  });

  it("uses the REST identity summary without exposing account email or key metadata", async () => {
    const auth = await getApiIdentityFromBearerKey({
      headers: new Headers({ authorization: "Bearer td_test" }),
    });
    if (!auth.ok) throw new Error("Expected authenticated test identity");
    const response = await POST(
      rpc("tools/call", { name: "get_account", arguments: {} })
    );
    expect(await response.json()).toMatchObject({
      result: {
        structuredContent: {
          ...toApiIdentitySummary(auth.identity),
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
        { headers: { authorization: "Bearer td_other" } }
      )
    );
    expect(await firstResponse.json()).toMatchObject({
      result: { structuredContent: { account: { id: "user-1" } } },
    });
    expect(await secondResponse.json()).toMatchObject({
      result: { structuredContent: { account: { id: "user-2" } } },
    });
  });

  it.each([undefined, "", "Basic td_test", "Bearer td_test extra"])(
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
      expect(response.headers.get("www-authenticate")).toBe(
        'Bearer realm="TrackDraw MCP"'
      );
      expect(verifyApiKey).not.toHaveBeenCalled();
    }
  );

  it.each(["INVALID_API_KEY", "KEY_EXPIRED", "KEY_DISABLED", "KEY_NOT_FOUND"])(
    "rejects %s even after initialization",
    async (code) => {
      const { client } = await openClient();
      try {
        verifyApiKey.mockResolvedValue({
          valid: false,
          error: { code },
          key: null,
        });
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
    first.mockResolvedValue(null);
    expect((await POST(rpc("tools/list"))).status).toBe(401);
  });

  it("applies the shared per-key request budget and retry timing", async () => {
    verifyApiKey.mockResolvedValue({
      valid: false,
      key: null,
      error: { code: "RATE_LIMITED", details: { tryAgainIn: 1250 } },
    });
    const response = await POST(rpc("ping"));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("2");
  });

  it("permits only the identity check for keys with no project permissions", async () => {
    verifyApiKey.mockResolvedValue({
      valid: true,
      error: null,
      key: { ...keyRecord, permissions: {} },
    });
    const list = await POST(rpc("tools/list"));
    expect(await list.json()).toMatchObject({
      result: { tools: [{ name: "get_account" }] },
    });
    const call = await POST(rpc("tools/call", { name: "get_account" }));
    expect(await call.json()).toMatchObject({
      result: { structuredContent: { permissions: {} } },
    });
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
    expect(verifyApiKey).not.toHaveBeenCalled();
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
    expect(verifyApiKey).not.toHaveBeenCalled();
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
          headers: { authorization: "Bearer td_test" },
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
      new Error("secret td_test private@example.com track contents")
    );
    const response = await POST(rpc("ping"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(
      /td_test|private@example|track contents/
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
