import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
import { pollTeamProject } from "@/lib/server/team-project-poll";
import { createTeamProject, readTeamProject } from "@/lib/server/team-projects";
import {
  acquireProjectLease,
  releaseProjectLease,
  saveTeamProject,
} from "@/lib/server/team-project-leases";
let db: DatabaseSync;
let projectId: string;
let queries: string[];
beforeEach(async () => {
  db = createMigratedDatabase();
  queries = [];
  mocks.db.mockResolvedValue(sqliteD1(db, (sql) => queries.push(sql)));
  for (const id of ["owner", "editor", "viewer", "outsider"])
    db.prepare(
      "INSERT INTO users(id,name,email,createdAt,updatedAt) VALUES(?,?,?,?,?)"
    ).run(id, id, `${id}@example.invalid`, "2026", "2026");
  db.exec(
    "INSERT INTO teams(id,name,slug,createdAt) VALUES('club','Club','club','2026'),('other','Other','other','2026')"
  );
  for (const role of ["owner", "editor", "viewer"])
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,?,?,?,?)"
    ).run(role, "club", role, role, "2026");
  projectId = (await createTeamProject("owner", "club", "Race")).project.id;
  queries.length = 0;
});
afterEach(() => db.close());

it.each([1, 999])(
  "uses one statement for revision %s, projecting geometry only when changed",
  async (known) => {
    const result = await pollTeamProject("viewer", "club", projectId, known);
    expect(queries).toHaveLength(1);
    expect(result.revision).toBe(1);
    expect(result.project === null).toBe(known === 1);
    if (result.project) {
      const full = await readTeamProject("viewer", "club", projectId);
      expect(result.project.design).toEqual(full.project.design);
    }
  }
);

it("does not parse or return stored geometry for an unchanged revision", async () => {
  db.prepare("UPDATE projects SET design_json='invalid-json' WHERE id=?").run(
    projectId
  );
  const revision = db
    .prepare("SELECT revision FROM projects WHERE id=?")
    .get(projectId) as { revision: number };
  const result = await pollTeamProject(
    "viewer",
    "club",
    projectId,
    revision.revision
  );
  expect(result.project).toBeNull();
  expect(queries).toHaveLength(1);
  expect(JSON.stringify(result)).not.toContain("invalid-json");
});

it("refreshes team name, role, recovery and editor status without a design revision", async () => {
  const acquired = await acquireProjectLease("editor", "club", projectId);
  db.exec(
    "UPDATE teams SET name='Renamed club' WHERE id='club'; UPDATE team_members SET role='editor' WHERE userId='viewer'"
  );
  const result = await pollTeamProject(
    "viewer",
    "club",
    projectId,
    acquired.project.revision
  );
  expect(result.project).toBeNull();
  expect(result.team).toEqual({
    id: "club",
    name: "Renamed club",
    role: "editor",
  });
  expect(result.editing).toMatchObject({ userId: "editor", name: "editor" });
  expect(JSON.stringify(result)).not.toContain(acquired.lease.sessionId);
  await releaseProjectLease("editor", projectId, acquired.lease.sessionId);
  db.exec(
    "INSERT INTO team_succession_cases(id,team_id,owner_id,activity_at,removal_at,state,opened_at) VALUES('recovery','club','owner','2026','2026','recovery','2026')"
  );
  expect(
    (await pollTeamProject("viewer", "club", projectId, result.revision)).team
      .recovery
  ).toBe(true);
  expect(
    (await pollTeamProject("viewer", "club", projectId, result.revision))
      .editing
  ).toBeNull();
});

it("returns a saved design on the next poll and omits it after acknowledgement", async () => {
  const { lease, project } = await acquireProjectLease(
    "owner",
    "club",
    projectId
  );
  const design = { ...project.design, title: "Changed" };
  const saved = await saveTeamProject(
    "owner",
    "club",
    projectId,
    lease.sessionId,
    project.revision,
    design
  );
  queries.length = 0;
  const result = await pollTeamProject(
    "viewer",
    "club",
    projectId,
    project.revision
  );
  expect(queries).toHaveLength(1);
  expect(result.project?.design.title).toBe("Changed");
  expect(result.revision).toBe(saved.revision);
  expect(
    (await pollTeamProject("viewer", "club", projectId, saved.revision)).project
  ).toBeNull();
});

it("ignores expired or invalidated editors", async () => {
  const { project } = await acquireProjectLease("editor", "club", projectId);
  db.exec("UPDATE project_edit_leases SET expires_at='2000-01-01'");
  expect(
    (await pollTeamProject("viewer", "club", projectId, project.revision))
      .editing
  ).toBeNull();
});

it("rechecks membership even for a matching revision, and isolates teams and missing projects", async () => {
  await expect(
    pollTeamProject("outsider", "club", projectId, 1)
  ).rejects.toMatchObject({ code: "not_found" });
  await expect(
    pollTeamProject("viewer", "other", projectId, 1)
  ).rejects.toMatchObject({ code: "not_found" });
  await expect(
    pollTeamProject("viewer", "club", "missing", 1)
  ).rejects.toMatchObject({ code: "not_found" });
  db.exec("DELETE FROM team_members WHERE userId='viewer'");
  await expect(
    pollTeamProject("viewer", "club", projectId, 1)
  ).rejects.toMatchObject({ code: "not_found" });
});

it("does not return archived or personal projects", async () => {
  db.prepare("UPDATE projects SET archived_at='2026-11-02' WHERE id=?").run(
    projectId
  );
  await expect(
    pollTeamProject("viewer", "club", projectId, 1)
  ).rejects.toMatchObject({ code: "not_found" });
  db.prepare(
    "UPDATE projects SET archived_at=NULL,owner_team_id=NULL,owner_user_id='owner' WHERE id=?"
  ).run(projectId);
  await expect(
    pollTeamProject("viewer", "club", projectId, 1)
  ).rejects.toMatchObject({ code: "not_found" });
});
