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
import { GET, POST } from "@/app/api/teams/succession/route";
let db: DatabaseSync;
const get = (query = "") =>
  GET(new Request(`https://trackdraw.app/api/teams/succession${query}`));
const post = (body: unknown) =>
  POST(
    new Request("https://trackdraw.app/api/teams/succession", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
beforeEach(() => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  mocks.user.mockResolvedValue({ id: "outsider", role: "user" });
  mocks.trusted.mockReturnValue(true);
});
afterEach(() => db.close());
it("requires authentication and trusted origins, and keeps admin reads restricted", async () => {
  mocks.user.mockResolvedValue(null);
  expect((await get()).status).toBe(401);
  expect((await post({})).status).toBe(401);
  mocks.user.mockResolvedValue({ id: "outsider", role: "moderator" });
  expect((await get("?admin=1")).status).toBe(403);
  mocks.trusted.mockReturnValue(false);
  expect((await post({})).status).toBe(403);
});
it("uses private no-store responses and never exposes cases to nonmembers", async () => {
  const response = await get();
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("vary")).toBe("Cookie");
  expect(await response.json()).toEqual({ ok: true, cases: [] });
});
it("bounds malformed commands and rejects unprivileged administrative actions", async () => {
  expect((await post({ junk: "x".repeat(5000) })).status).toBe(413);
  expect(
    (await post({ caseId: "case", action: "approve", reason: "Take over" }))
      .status
  ).toBe(409);
  expect((await post({ caseId: "case", action: "advance" })).status).toBe(409);
  expect(
    (
      await POST(
        new Request("https://trackdraw.app/api/teams/succession", {
          method: "POST",
          body: "{",
        })
      )
    ).status
  ).toBe(400);
});
