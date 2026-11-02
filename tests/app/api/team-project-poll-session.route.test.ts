import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
import { GET } from "@/app/api/team-projects/route";
import { createTeamProject } from "@/lib/server/team-projects";

let db: DatabaseSync;
let projectId: string;
const secret = "local-team-poll-session-test-secret";
const cookie = () => {
  const signature = createHmac("sha256", secret)
    .update("viewer-session")
    .digest("base64");
  return `better-auth.session_token=${encodeURIComponent(`viewer-session.${signature}`)}`;
};
const read = (signedCookie = cookie()) =>
  GET(
    new Request(
      `https://trackdraw.app/api/team-projects?teamId=club&projectId=${projectId}&knownRevision=1`,
      { headers: { cookie: signedCookie } }
    )
  );
beforeEach(async () => {
  vi.stubEnv("BETTER_AUTH_SECRET", secret);
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  const now = new Date().toISOString();
  for (const id of ["owner", "viewer"])
    db.prepare(
      "INSERT INTO users(id,name,email,createdAt,updatedAt,last_active_at) VALUES(?,?,?,?,?,?)"
    ).run(id, id, `${id}@example.invalid`, now, now, now);
  db.exec(
    "INSERT INTO teams(id,name,slug,createdAt) VALUES('club','Club','club','2026'); INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES('owner','club','owner','owner','2026'),('viewer','club','viewer','viewer','2026')"
  );
  db.prepare(
    "INSERT INTO sessions(id,token,userId,expiresAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?)"
  ).run(
    "session",
    "viewer-session",
    "viewer",
    "2099-01-01T00:00:00.000Z",
    now,
    now
  );
  projectId = (await createTeamProject("owner", "club", "Race")).project.id;
});
afterEach(() => {
  db.close();
  vi.unstubAllEnvs();
});

it("revalidates an actual signed cookie and stored session for an unchanged revision", async () => {
  const response = await read();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    project: null,
    revision: 1,
    team: { role: "viewer" },
  });
  db.exec("DELETE FROM sessions WHERE id='session'");
  expect((await read()).status).toBe(401);
});

it("rejects a forged cookie, a banned account, and removed membership", async () => {
  expect((await read("better-auth.session_token=forged.invalid")).status).toBe(
    401
  );
  db.exec("UPDATE users SET banned_at='2026' WHERE id='viewer'");
  expect((await read()).status).toBe(401);
  db.exec(
    "UPDATE users SET banned_at=NULL WHERE id='viewer'; DELETE FROM team_members WHERE userId='viewer'"
  );
  expect((await read()).status).toBe(404);
});

it("rejects an expired session before serving conditional metadata", async () => {
  db.exec("UPDATE sessions SET expiresAt='2000-01-01T00:00:00.000Z'");
  expect((await read()).status).toBe(401);
});
