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
import { POST } from "@/app/api/team-projects/editing/route";
import { createTeamProject } from "@/lib/server/team-projects";
let db: DatabaseSync;
let projectId: string;
const post = (body: unknown) =>
  POST(
    new Request("https://trackdraw.app/api/team-projects/editing", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
beforeEach(async () => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  mocks.user.mockResolvedValue({ id: "owner" });
  mocks.trusted.mockReturnValue(true);
  db.exec(
    "INSERT INTO users(id,email,createdAt,updatedAt) VALUES('owner','owner@example.invalid','2026','2026'); INSERT INTO teams(id,name,slug,createdAt) VALUES('club','Club','club','2026'); INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES('owner','club','owner','owner','2026')"
  );
  projectId = (await createTeamProject("owner", "club", "Race")).project.id;
});
afterEach(() => db.close());
it("requires trusted cookie authentication and validates bounded commands", async () => {
  mocks.user.mockResolvedValue(null);
  expect(
    (await post({ action: "acquire", teamId: "club", projectId })).status
  ).toBe(401);
  mocks.trusted.mockReturnValue(false);
  expect(
    (await post({ action: "acquire", teamId: "club", projectId })).status
  ).toBe(403);
  mocks.user.mockResolvedValue({ id: "owner" });
  mocks.trusted.mockReturnValue(true);
  expect(
    (
      await post({
        action: "acquire",
        teamId: "club",
        projectId,
        sessionId: crypto.randomUUID(),
      })
    ).status
  ).toBe(400);
  expect(
    (
      await post({
        action: "save",
        teamId: "club",
        projectId,
        forceWrite: true,
      })
    ).status
  ).toBe(400);
  expect((await post({ junk: "x".repeat(2 * 1024 * 1024) })).status).toBe(413);
  expect(
    (
      await POST(
        new Request("https://trackdraw.app/api/team-projects/editing", {
          method: "POST",
          body: "{",
        })
      )
    ).status
  ).toBe(400);
});
it("round-trips acquire, save, renewal and release without caching or unchecked overwrite", async () => {
  const response = await post({ action: "acquire", teamId: "club", projectId });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("vary")).toBe("Cookie");
  const { lease, project } = await response.json();
  const command = {
    action: "save",
    teamId: "club",
    projectId,
    sessionId: lease.sessionId,
    revision: project.revision,
    design: { ...project.design, title: "Edited" },
  };
  const result = await post(command);
  expect(result.status).toBe(200);
  expect((await result.json()).revision).toBe(project.revision + 1);
  const stale = await post(command);
  expect(stale.status).toBe(409);
  expect((await stale.json()).code).toBe("conflict");
  expect((await post({ ...command, design: { version: 999 } })).status).toBe(
    400
  );
  expect(
    (
      await post({
        action: "renew",
        teamId: "club",
        projectId,
        sessionId: lease.sessionId,
      })
    ).status
  ).toBe(200);
  expect(
    (
      await post({
        action: "release",
        teamId: "club",
        projectId,
        sessionId: lease.sessionId,
      })
    ).status
  ).toBe(200);
  const late = await post(command);
  expect(late.status).toBe(409);
  expect((await late.json()).code).toBe("lease_lost");
});
