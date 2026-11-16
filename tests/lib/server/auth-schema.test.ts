import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/server/mcp/oauth-provider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/mcp/oauth-provider")>();
  return { ...actual, getMcpOAuthPlugins: vi.fn(actual.getMcpOAuthPlugins) };
});
import { getMcpOAuthPlugins } from "@/lib/server/mcp/oauth-provider";
import {
  getMcpDiscoveryResponse,
  getMcpResource,
} from "@/lib/server/mcp/oauth-metadata";
import { getAuth } from "@/lib/server/auth";
import {
  DESKTOP_CLIENT_ID,
  DESKTOP_RESOURCE,
  DESKTOP_SCOPE,
} from "@/lib/desktop/oauth-contract";
import { GET as desktopSession } from "@/app/api/desktop/session/route";
import { authenticateMcpRequest } from "@/lib/server/mcp/oauth-auth";

let database: DatabaseSync;
let queries: string[];
beforeEach(() => {
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "trackdraw-schema-test-secret-at-least-32-characters"
  );
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");
  const snapshot = process.env.TRACKDRAW_AUTH_SCHEMA_JSON;
  if (snapshot) {
    database = new DatabaseSync(":memory:");
    const result = JSON.parse(readFileSync(snapshot, "utf8")) as Array<{
      success: boolean;
      results: Array<{ sql: string }>;
    }>;
    if (
      result.length !== 1 ||
      !result[0].success ||
      !result[0].results.length
    ) {
      throw new Error("Missing target database schema");
    }
    database.exec(result[0].results.map(({ sql }) => sql + ";").join("\n"));
  } else {
    database = createMigratedDatabase();
  }
  queries = [];
  vi.mocked(getMcpOAuthPlugins).mockClear();
  const prepare = database.prepare.bind(database);
  database.prepare = (query) => {
    queries.push(query);
    return prepare(query);
  };
  mocks.getDatabase.mockResolvedValue(database);
});
afterEach(() => {
  database.close();
  vi.unstubAllEnvs();
});

const metadataQueries = () =>
  queries.filter((sql) =>
    /sqlite_schema|sqlite_master|pragma_table_info/i.test(sql)
  );

describe("full auth configuration and database schema", () => {
  it("validates all configured auth and plugin tables before deployment", async () => {
    const auth = await getAuth({ validateSchema: true });
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
    expect(metadataQueries().length).toBeGreaterThan(0);
  });

  it("rejects a target schema missing an auth column", async () => {
    database.exec("ALTER TABLE users DROP COLUMN image");
    const auth = await getAuth({ validateSchema: true });
    await expect(
      auth.api.getSession({ headers: new Headers() })
    ).rejects.toThrow(/image/);
  });

  it("still reads live sessions and rejects a revoked session", async () => {
    const now = new Date().toISOString();
    database
      .prepare(
        "INSERT INTO users(id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)"
      )
      .run("schema-user", "Schema test", "schema@example.invalid", now, now);
    database
      .prepare(
        "INSERT INTO sessions(id, userId, token, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        "schema-session",
        "schema-user",
        "schema-token",
        new Date(Date.now() + 3600000).toISOString(),
        now,
        now
      );
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update("schema-token")
      .digest("base64");
    const headers = new Headers({
      cookie:
        "__Secure-better-auth.session_token=" +
        encodeURIComponent("schema-token." + signature),
    });
    const auth = await getAuth();
    expect((await auth.api.getSession({ headers }))?.user.id).toBe(
      "schema-user"
    );
    database.exec("DELETE FROM sessions WHERE id = 'schema-session'");
    expect(await (await getAuth()).api.getSession({ headers })).toBeNull();
    expect(metadataQueries()).toHaveLength(0);
  });

  it.skipIf(!!process.env.TRACKDRAW_AUTH_SCHEMA_JSON)(
    "exchanges a native code against the seeded client and rotates and revokes its desktop session",
    async () => {
      const origin = "https://trackdraw.app";
      const auth = await getAuth();
      const context = await auth.$context;
      const user = await context.internalAdapter.createUser(
        {
          name: "Desktop tester",
          email: "desktop@example.invalid",
          emailVerified: true,
        },
        { method: "magic-link" }
      );
      const session = await context.internalAdapter.createSession(user.id);
      const cookie =
        context.authCookies.sessionToken.name +
        "=" +
        encodeURIComponent(
          session.token +
            "." +
            createHmac("sha256", context.secret)
              .update(session.token)
              .digest("base64")
        );
      // Keep the real provider adapter on SQLite and emulate the D1 read used by this route.
      const prepare = database.prepare.bind(database);
      const d1 = sqliteD1({ prepare } as DatabaseSync);
      database.prepare = (sql) =>
        /^SELECT u.id, u.name, u.email FROM users/.test(sql)
          ? (d1.prepare(sql) as unknown as ReturnType<typeof prepare>)
          : prepare(sql);

      const redirect = "http://127.0.0.1:52972/callback";
      const verifier = randomBytes(32).toString("base64url");
      const authorize = new URLSearchParams({
        client_id: DESKTOP_CLIENT_ID,
        redirect_uri: redirect,
        response_type: "code",
        prompt: "consent",
        scope: DESKTOP_SCOPE + " offline_access",
        state: "desktop-test-state",
        code_challenge: createHash("sha256")
          .update(verifier)
          .digest("base64url"),
        code_challenge_method: "S256",
        resource: DESKTOP_RESOURCE,
      });
      const authorizeResponse = await auth.handler(
        new Request(origin + "/api/auth/oauth2/authorize?" + authorize, {
          headers: { cookie },
        })
      );
      expect(authorizeResponse.status).toBe(302);
      const consent = new URL(
        authorizeResponse.headers.get("location")!,
        origin
      );
      expect(consent.pathname).toBe("/mcp/consent");
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
      const callback = new URL(
        ((await consentResponse.json()) as { url: string }).url
      );
      expect(callback.origin + callback.pathname).toBe(redirect);
      expect(callback.searchParams.get("state")).toBe("desktop-test-state");
      expect(callback.searchParams.get("iss")).toBe(origin + "/api/auth");
      function oauthForm(endpoint: string, body: Record<string, string>) {
        return auth.handler(
          new Request(origin + "/api/auth/oauth2/" + endpoint, {
            method: "POST",
            body: new URLSearchParams({
              client_id: DESKTOP_CLIENT_ID,
              ...body,
            }),
          })
        );
      }
      const tokenResponse = await oauthForm("token", {
        grant_type: "authorization_code",
        code: callback.searchParams.get("code")!,
        redirect_uri: redirect,
        resource: DESKTOP_RESOURCE,
        code_verifier: verifier,
      });
      expect(tokenResponse.status).toBe(200);
      type Tokens = { access_token: string; refresh_token: string };
      const first = (await tokenResponse.json()) as Tokens;
      const account = (token: string) =>
        desktopSession(
          new Request(origin + "/api/desktop/session", {
            headers: { authorization: "Bearer " + token },
          })
        );
      expect((await account("not-a-token")).status).toBe(401);
      expect(
        await authenticateMcpRequest(
          new Request(getMcpResource(), {
            headers: { authorization: "Bearer " + first.access_token },
          })
        )
      ).toMatchObject({ ok: false, status: 401 });
      const profile = await account(first.access_token);
      expect(profile.status).toBe(200);
      expect(profile.headers.get("Cache-Control")).toBe("no-store");
      expect(await profile.json()).toEqual({
        account: { id: user.id, name: user.name, email: user.email },
      });

      const refresh = {
        grant_type: "refresh_token",
        refresh_token: first.refresh_token,
      };
      expect(
        (await oauthForm("token", { ...refresh, resource: getMcpResource() }))
          .status
      ).toBe(400);
      const refreshResponse = await oauthForm("token", {
        ...refresh,
        resource: DESKTOP_RESOURCE,
      });
      expect(refreshResponse.status).toBe(200);
      const next = (await refreshResponse.json()) as Tokens;
      expect(next.refresh_token).not.toBe(first.refresh_token);
      expect((await account(next.access_token)).status).toBe(200);
      expect(
        (
          await oauthForm("revoke", {
            token: next.refresh_token,
            token_type_hint: "refresh_token",
          })
        ).status
      ).toBe(200);
      expect((await account(next.access_token)).status).toBe(401);
    }
  );

  it("initializes auth plugins once across repeated real discovery requests", async () => {
    for (let index = 0; index < 3; index++) {
      const auth = await getAuth();
      const response = await auth.handler(
        new Request(
          "https://trackdraw.app/.well-known/oauth-protected-resource/api/mcp"
        )
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        resource: "https://trackdraw.app/api/mcp",
      });
    }
    expect(getMcpOAuthPlugins).toHaveBeenCalledTimes(1);
  });

  it("reinitializes when the configured OAuth origin changes", async () => {
    await (
      await getAuth()
    ).$context;
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.trackdraw.app");
    const response = await (
      await getAuth()
    ).handler(
      new Request(
        "https://dev.trackdraw.app/.well-known/oauth-protected-resource/api/mcp"
      )
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      resource: "https://dev.trackdraw.app/api/mcp",
    });
    expect(getMcpOAuthPlugins).toHaveBeenCalledTimes(2);
  });

  it.each(["https://trackdraw.app", "https://dev.trackdraw.app"])(
    "keeps lightweight discovery identical to the provider on %s",
    async (origin) => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
      const auth = await getAuth();
      for (const path of [
        "/.well-known/oauth-authorization-server",
        "/.well-known/oauth-authorization-server/api/auth",
        "/.well-known/oauth-protected-resource",
        "/.well-known/oauth-protected-resource/api/mcp",
      ]) {
        const request = new Request(origin + path);
        const expected = await auth.handler(request);
        const actual = getMcpDiscoveryResponse(request, origin)!;
        if (expected.status === 200) {
          expect(actual).not.toBeNull();
          expect(await actual.json()).toEqual(await expected.json());
        } else {
          expect(actual).toBeNull();
        }
      }
    }
  );

  it("isolates initialized auth engines by database binding", async () => {
    const first = await getAuth();
    const secondDatabase = createMigratedDatabase();
    try {
      mocks.getDatabase.mockResolvedValue(secondDatabase);
      const second = await getAuth();
      expect(second.options.database).toBe(secondDatabase);
      expect(first.options.database).toBe(database);
      expect(second).not.toBe(first);
      mocks.getDatabase.mockResolvedValue(database);
      expect(await getAuth()).toBe(first);
    } finally {
      secondDatabase.close();
    }
  });

  it("refreshes initialized configuration after secret rotation", async () => {
    const first = await getAuth();
    vi.stubEnv(
      "BETTER_AUTH_SECRET",
      "rotated-auth-schema-test-secret-at-least-32-characters"
    );
    const second = await getAuth();
    expect(second).not.toBe(first);
    expect(second.options.secret).toBe(process.env.BETTER_AUTH_SECRET);
  });

  it("does not introspect the database on ordinary auth requests", async () => {
    for (let index = 0; index < 2; index++) {
      const auth = await getAuth();
      expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
    }
    expect(metadataQueries()).toHaveLength(0);
  });
});
