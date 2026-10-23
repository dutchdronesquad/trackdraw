import { beforeEach, afterEach, it, expect, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  user: vi.fn(),
  trusted: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.user,
}));
vi.mock("@/lib/server/csrf", () => ({ isTrustedRequest: mocks.trusted }));
import { GET, POST } from "@/app/api/admin/teams/route";
let db: DatabaseSync;
const get = () => GET(new Request("https://trackdraw.app/api/admin/teams"));
const post = (body: unknown) =>
  POST(
    new Request("https://trackdraw.app/api/admin/teams", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
beforeEach(() => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  mocks.user.mockResolvedValue(null);
  mocks.trusted.mockReturnValue(true);
});
afterEach(() => db.close());
it("requires admin sessions for directory reads and mutations, and rejects untrusted origins", async () => {
  expect((await get()).status).toBe(401);
  expect((await post({})).status).toBe(401);
  mocks.user.mockResolvedValue({ id: "viewer", role: "moderator" });
  expect((await get()).status).toBe(403);
  expect((await post({})).status).toBe(403);
  mocks.user.mockResolvedValue({ id: "admin", role: "admin" });
  mocks.trusted.mockReturnValue(false);
  expect((await post({})).status).toBe(403);
});
it("bounds private directory queries and mutation bodies", async () => {
  mocks.user.mockResolvedValue({ id: "admin", role: "admin" });
  db.exec(
    "INSERT INTO users(id,email,emailVerified,role,createdAt,updatedAt) VALUES('admin','admin@example.invalid',1,'admin','2026-01-01','2026-01-01')"
  );
  const response = await get();
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vary")).toBe("Cookie");
  expect(await response.json()).toEqual({ ok: true, teams: [], next: null });
  expect((await post({ reason: "x".repeat(5000) })).status).toBe(413);
  expect(
    (
      await GET(
        new Request(
          "https://trackdraw.app/api/admin/teams?search=" + "x".repeat(201)
        )
      )
    ).status
  ).toBe(400);
  expect(
    (
      await GET(
        new Request("https://trackdraw.app/api/admin/teams?teamId=missing")
      )
    ).status
  ).toBe(404);
});
