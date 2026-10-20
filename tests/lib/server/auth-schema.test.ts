import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { createMigratedDatabase } from "../../helpers/sqlite-d1";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/server/mcp/oauth-provider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/mcp/oauth-provider")>();
  return { ...actual, getMcpOAuthPlugins: vi.fn(actual.getMcpOAuthPlugins) };
});
import { getMcpOAuthPlugins } from "@/lib/server/mcp/oauth-provider";
import { getMcpDiscoveryResponse } from "@/lib/server/mcp/oauth-metadata";
import { getAuth } from "@/lib/server/auth";

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
