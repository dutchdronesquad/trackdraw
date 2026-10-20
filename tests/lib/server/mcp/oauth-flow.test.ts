import { beforeEach, describe, expect, it, vi } from "vitest";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  getMcpOAuthPlugins,
  getMcpResource,
} from "@/lib/server/mcp/oauth-provider";

vi.mock("server-only", () => ({}));
const secret = "trackdraw-oauth-test-secret-at-least-32-characters";
const origin = "https://trackdraw.app";
let auth: ReturnType<typeof makeAuth>;
let cookie: string;
let database: Record<string, Record<string, unknown>[]>;

function makeAuth() {
  return betterAuth({
    database: memoryAdapter(database),
    baseURL: origin,
    secret,
    rateLimit: { enabled: false },
    plugins: [...getMcpOAuthPlugins()],
    logger: { disabled: true },
  });
}
async function request(
  path: string,
  body?: Record<string, string>,
  session = false
) {
  const headers = new Headers();
  if (session) {
    headers.set("cookie", cookie);
    headers.set("origin", origin);
  }
  if (body) headers.set("content-type", "application/x-www-form-urlencoded");
  return auth.handler(
    new Request(origin + path, {
      method: body ? "POST" : "GET",
      headers,
      ...(body ? { body: new URLSearchParams(body) } : {}),
    })
  );
}
async function register(scope = "mcp:read offline_access") {
  const response = await auth.handler(
    new Request(origin + "/api/auth/oauth2/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Test MCP client",
        redirect_uris: ["http://127.0.0.1:3456/callback"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope,
      }),
    })
  );
  expect(response.status).toBe(201);
  const data = (await response.json()) as {
    client_id: string;
    client_secret?: string;
  };
  expect(data.client_secret).toBeUndefined();
  return data.client_id;
}
async function authorize(clientId: string, patch: Record<string, string> = {}) {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: "http://127.0.0.1:3456/callback",
    response_type: "code",
    scope: "mcp:read offline_access",
    state: "test-state",
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: getMcpResource(),
    ...patch,
  });
  const response = await request(
    "/api/auth/oauth2/authorize?" + params,
    undefined,
    true
  );
  return { response, verifier };
}
async function approve(clientId: string, scope?: string) {
  const { response, verifier } = await authorize(
    clientId,
    scope ? { scope } : {}
  );
  expect(response.status).toBe(302);
  const consent = new URL(response.headers.get("location")!, origin);
  expect(consent.pathname).toBe("/mcp/consent");
  expect(await verifyOAuthQueryParams(consent.search.slice(1), secret)).toBe(
    true
  );
  const consentResponse = await auth.handler(
    new Request(origin + "/api/auth/oauth2/consent", {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify({
        accept: true,
        oauth_query: consent.search.slice(1),
      }),
    })
  );
  expect(consentResponse.status).toBe(200);
  const result = (await consentResponse.json()) as { url: string };
  const callback = new URL(result.url!);
  expect(callback.searchParams.get("state")).toBe("test-state");
  return { code: callback.searchParams.get("code")!, verifier, consent };
}
async function exchange(
  clientId: string,
  code: string,
  verifier: string,
  resource = getMcpResource()
) {
  return request("/api/auth/oauth2/token", {
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    code_verifier: verifier,
    redirect_uri: "http://127.0.0.1:3456/callback",
    resource,
  });
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
  database = Object.fromEntries(
    [
      "user",
      "session",
      "account",
      "verification",
      "oauthClient",
      "oauthResource",
      "oauthClientResource",
      "oauthAccessToken",
      "oauthRefreshToken",
      "oauthConsent",
      "oauthClientAssertion",
    ].map((name) => [name, []])
  );
  auth = makeAuth();
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    {
      name: "Local Pilot",
      email: "pilot@example.invalid",
      emailVerified: true,
    },
    { method: "magic-link" }
  );
  const session = await context.internalAdapter.createSession(user.id);
  const signed =
    session.token +
    "." +
    createHmac("sha256", secret).update(session.token).digest("base64");
  cookie =
    context.authCookies.sessionToken.name + "=" + encodeURIComponent(signed);
});

describe("MCP OAuth authorization flow with the real Better Auth provider", () => {
  it("publishes resource and authorization-server discovery", async () => {
    const resource = await request(
      "/.well-known/oauth-protected-resource/api/mcp"
    );
    expect(resource.status).toBe(200);
    expect(await resource.json()).toMatchObject({
      resource: getMcpResource(),
      authorization_servers: [origin + "/api/auth"],
      scopes_supported: ["mcp:read", "projects:read"],
    });
    const issuer = await request(
      "/.well-known/oauth-authorization-server/api/auth"
    );
    expect(issuer.status).toBe(200);
    expect(await issuer.json()).toMatchObject({
      issuer: origin + "/api/auth",
      code_challenge_methods_supported: ["S256"],
      registration_endpoint: origin + "/api/auth/oauth2/register",
    });
  });

  it("requires login and consent before issuing a resource-bound token", async () => {
    const id = await register();
    const { response } = await authorize(id);
    expect(response.status).toBe(302);
    expect(database.oauthAccessToken ?? []).toHaveLength(0);
    const { code, verifier } = await approve(id);
    const tokenResponse = await exchange(id, code, verifier);
    expect(tokenResponse.status).toBe(200);
    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
    };
    expect(tokens.refresh_token).toBeTruthy();
    expect(database.oauthAccessToken[0].token).not.toBe(tokens.access_token);
    expect(database.oauthRefreshToken[0].token).not.toBe(tokens.refresh_token);
    expect(
      await auth.api.verifyMcpAccessToken({
        body: { token: tokens.access_token },
      })
    ).toMatchObject({
      active: true,
      aud: getMcpResource(),
      scope: "mcp:read offline_access",
      client_id: id,
    });
    expect((await exchange(id, code, verifier)).status).toBe(400);
  });

  it("requires explicit project-read consent and never upgrades an old token", async () => {
    const oldId = await register();
    // Simulate a registration persisted by the account-only foundation.
    const oldClient = database.oauthClient.find(
      (client) => client.clientId === oldId
    )!;
    oldClient.scopes =
      typeof oldClient.scopes === "string"
        ? JSON.stringify(["mcp:read", "offline_access"])
        : ["mcp:read", "offline_access"];
    const oldGrant = await approve(oldId);
    const oldTokens = (await (
      await exchange(oldId, oldGrant.code, oldGrant.verifier)
    ).json()) as { access_token: string };
    const oldStepUp = (
      await authorize(oldId, { scope: "mcp:read projects:read" })
    ).response;
    expect(oldStepUp.status).toBe(302);
    expect(
      new URL(oldStepUp.headers.get("location")!, origin).searchParams.get(
        "error"
      )
    ).toBe("invalid_scope");
    // The old registration cannot request the added scope without re-registration.
    const id = await register("mcp:read projects:read offline_access");
    const grant = await approve(id, "mcp:read projects:read offline_access");
    expect(grant.consent.searchParams.get("scope")).toContain("projects:read");
    const response = await exchange(id, grant.code, grant.verifier);
    expect(response.status).toBe(200);
    const tokens = (await response.json()) as { access_token: string };
    expect(
      await auth.api.verifyMcpAccessToken({
        body: { token: tokens.access_token },
      })
    ).toMatchObject({ scope: "mcp:read projects:read offline_access" });
    expect(
      await auth.api.verifyMcpAccessToken({
        body: { token: oldTokens.access_token },
      })
    ).toMatchObject({ scope: "mcp:read offline_access" });
  });

  it("rejects a wrong PKCE verifier", async () => {
    const id = await register();
    const { code } = await approve(id);
    expect(
      (
        await exchange(
          id,
          code,
          "wrong-verifier-that-is-long-enough-to-validate-its-length"
        )
      ).status
    ).toBe(400);
    expect(database.oauthAccessToken ?? []).toHaveLength(0);
  });

  it("rejects missing/plain PKCE, unregistered redirects, write scopes and other resources", async () => {
    const id = await register();
    const invalidRequests: Record<string, string>[] = [
      { code_challenge: "", code_challenge_method: "" },
      { code_challenge_method: "plain" },
      { redirect_uri: "https://evil.example/callback" },
      { scope: "mcp:write" },
      { resource: "https://evil.example/mcp" },
    ];
    for (const patch of invalidRequests) {
      const { response } = await authorize(id, patch);
      const location = response.headers.get("location");
      expect(
        response.status >= 400 ||
          Boolean(location && new URL(location).searchParams.has("error"))
      ).toBe(true);
    }
    expect(database.oauthAccessToken ?? []).toHaveLength(0);
  });

  it("does not grant access when consent is declined", async () => {
    const id = await register();
    const { response } = await authorize(id);
    const consent = new URL(response.headers.get("location")!, origin);
    const decision = await auth.handler(
      new Request(origin + "/api/auth/oauth2/consent", {
        method: "POST",
        headers: { cookie, origin, "content-type": "application/json" },
        body: JSON.stringify({
          accept: false,
          oauth_query: consent.search.slice(1),
        }),
      })
    );
    const result = (await decision.json()) as { url: string };
    expect(new URL(result.url!).searchParams.get("error")).toBe(
      "access_denied"
    );
    expect(database.oauthAccessToken ?? []).toHaveLength(0);
    expect(database.oauthConsent ?? []).toHaveLength(0);
  });

  it("rejects modified signed consent queries", async () => {
    const id = await register();
    const { response } = await authorize(id);
    const consent = new URL(response.headers.get("location")!, origin);
    consent.searchParams.set("scope", "mcp:write");
    expect(await verifyOAuthQueryParams(consent.search.slice(1), secret)).toBe(
      false
    );
    const decision = await auth.handler(
      new Request(origin + "/api/auth/oauth2/consent", {
        method: "POST",
        headers: { cookie, origin, "content-type": "application/json" },
        body: JSON.stringify({
          accept: true,
          oauth_query: consent.search.slice(1),
        }),
      })
    );
    expect(decision.status).toBe(400);
    expect(database.oauthAccessToken ?? []).toHaveLength(0);
  });

  it("rotates refresh tokens and rejects replay and scope escalation", async () => {
    const id = await register();
    const { code, verifier } = await approve(id);
    const tokens = (await (await exchange(id, code, verifier)).json()) as {
      access_token: string;
      refresh_token: string;
    };
    const bad = await request("/api/auth/oauth2/token", {
      grant_type: "refresh_token",
      client_id: id,
      refresh_token: tokens.refresh_token,
      resource: getMcpResource(),
      scope: "mcp:write",
    });
    expect(bad.status).toBe(400);
    const refreshed = await request("/api/auth/oauth2/token", {
      grant_type: "refresh_token",
      client_id: id,
      refresh_token: tokens.refresh_token,
      resource: getMcpResource(),
    });
    expect(refreshed.status).toBe(200);
    const next = (await refreshed.json()) as {
      access_token: string;
      refresh_token: string;
    };
    expect(next.refresh_token).toBeTruthy();
    expect(next.refresh_token).not.toBe(tokens.refresh_token);
    expect(
      await auth.api.verifyMcpAccessToken({
        body: { token: next.access_token },
      })
    ).toMatchObject({ active: true, client_id: id });
    expect(
      (
        await request("/api/auth/oauth2/token", {
          grant_type: "refresh_token",
          client_id: id,
          refresh_token: tokens.refresh_token,
          resource: getMcpResource(),
        })
      ).status
    ).toBe(400);
  });

  it("rejects expired and revoked tokens and keeps server-only verification off HTTP", async () => {
    const id = await register();
    const { code, verifier } = await approve(id);
    const tokens = (await (await exchange(id, code, verifier)).json()) as {
      access_token: string;
      refresh_token: string;
    };
    const row = database.oauthAccessToken[0];
    row.expiresAt = new Date(0);
    await expect(
      auth.api.verifyMcpAccessToken({ body: { token: tokens.access_token } })
    ).rejects.toMatchObject({ statusCode: 401 });
    row.expiresAt = new Date(Date.now() + 60000);
    const revoked = await request("/api/auth/oauth2/revoke", {
      client_id: id,
      token: tokens.refresh_token,
      token_type_hint: "refresh_token",
    });
    expect(revoked.status).toBe(200);
    await expect(
      auth.api.verifyMcpAccessToken({ body: { token: tokens.access_token } })
    ).rejects.toMatchObject({ statusCode: 401 });
    const exposed = await request("/api/auth/verify-mcp-access-token", {
      token: tokens.access_token,
    });
    expect(exposed.status).toBe(404);
  });
});
