import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
import { GET, POST } from "@/app/api/team-projects/route";
let db: DatabaseSync;
const get = (query = "") =>
  GET(new Request(`https://trackdraw.app/api/team-projects${query}`));
const post = (body: unknown) =>
  POST(
    new Request("https://trackdraw.app/api/team-projects", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
beforeEach(() => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  mocks.user.mockResolvedValue({ id: "owner" });
  mocks.trusted.mockReturnValue(true);
  db.exec(
    "INSERT INTO users(id,email,createdAt,updatedAt) VALUES('owner','owner@example.invalid','2026-10-21','2026-10-21'); INSERT INTO teams(id,name,slug,createdAt) VALUES('club','Club','club','2026-10-21'); INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES('owner','club','owner','owner','2026-10-21')"
  );
});
afterEach(() => db.close());
it("requires a browser session and CSRF; bearer credentials grant no access", async () => {
  mocks.user.mockResolvedValue(null);
  expect((await get("?teamId=club")).status).toBe(401);
  expect(
    (await post({ action: "create", teamId: "club", title: "Race" })).status
  ).toBe(401);
  mocks.trusted.mockReturnValue(false);
  expect(
    (await post({ action: "create", teamId: "club", title: "Race" })).status
  ).toBe(403);
});
it("creates, lists, reads and exports only authorized private content with no-store", async () => {
  const created = await post({
    action: "create",
    teamId: "club",
    title: "Race",
  });
  expect(created.status).toBe(200);
  const body = await created.json();
  const response = await get(`?teamId=club&projectId=${body.project.id}`);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("vary")).toBe("Cookie");
  expect((await response.json()).project.owner).toEqual({
    kind: "team",
    teamId: "club",
  });
  expect((await (await get("?teamId=club")).json()).projects).toHaveLength(1);
});
it("returns indistinguishable unavailable results and never accepts design writes", async () => {
  expect((await get("?teamId=foreign")).status).toBe(404);
  expect((await get("?teamId=club&projectId=unknown")).status).toBe(404);
  expect(
    (
      await post({
        action: "save",
        teamId: "club",
        projectId: "guess",
        design: {},
      })
    ).status
  ).toBe(400);
  expect(
    (
      await post({
        action: "create",
        teamId: "club",
        title: "Race",
        design: {},
      })
    ).status
  ).toBe(400);
});
it("bounds input and rejects malformed commands", async () => {
  expect((await get()).status).toBe(400);
  expect((await post({ junk: "x".repeat(5000) })).status).toBe(413);
  expect(
    (
      await POST(
        new Request("https://trackdraw.app/api/team-projects", {
          method: "POST",
          body: "{",
        })
      )
    ).status
  ).toBe(400);
});
