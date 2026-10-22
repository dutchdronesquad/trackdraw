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
vi.mock("@/lib/server/team-mail", () => ({ sendTeamInvitationEmail: vi.fn() }));
import { GET, POST } from "@/app/api/teams/route";
let db: DatabaseSync;
const get = (query = "") =>
  GET(new Request(`https://trackdraw.app/api/teams${query}`));
const post = (body: unknown) =>
  POST(
    new Request("https://trackdraw.app/api/teams", {
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
    "INSERT INTO users(id,email,emailVerified,createdAt,updatedAt) VALUES('owner','owner@example.invalid',1,'2026-10-21','2026-10-21')"
  );
});
afterEach(() => {
  db.close();
});
it("requires cookie authentication and trusted origins", async () => {
  mocks.user.mockResolvedValue(null);
  expect((await get()).status).toBe(401);
  expect((await post({ action: "create", name: "Team" })).status).toBe(401);
  mocks.trusted.mockReturnValue(false);
  expect((await post({ action: "create", name: "Team" })).status).toBe(403);
});
it("provides team management directly to signed-in users", async () => {
  expect(await (await get()).json()).toEqual({
    ok: true,
    teams: [],
    invitations: [],
  });
  const created = await post({ action: "create", name: "Club" });
  expect(created.status).toBe(200);
  const { teamId } = await created.json();
  expect(await (await get()).json()).toEqual({
    ok: true,
    teams: [
      {
        id: teamId,
        name: "Club",
        role: "owner",
        projectCount: 0,
        memberPreview: { total: 1, names: ["owner@example.invalid"] },
      },
    ],
    invitations: [],
  });
});
it("returns no-store private responses and safe errors without request data", async () => {
  const response = await post({ action: "create", name: "Club" });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("vary")).toBe("Cookie");
  const { teamId } = await response.json();
  const details = await get(`?teamId=${teamId}`);
  expect((await details.json()).team).toMatchObject({
    id: teamId,
    name: "Club",
    role: "owner",
  });
  expect((await get("?teamId=unknown")).status).toBe(404);
  const invalid = await post({
    action: "invite",
    teamId,
    email: "private@example.invalid",
    role: "owner",
  });
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ ok: false, code: "invalid" });
});
it("bounds streamed and malformed JSON before parsing a command", async () => {
  expect((await post({ junk: "x".repeat(5000) })).status).toBe(413);
  const malformed = await POST(
    new Request("https://trackdraw.app/api/teams", {
      method: "POST",
      body: "{",
    })
  );
  expect(malformed.status).toBe(400);
});
