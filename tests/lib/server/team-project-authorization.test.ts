import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.getDatabase }));
import {
  getAuthorizedTeam,
  projectActions,
  projectAuthorizationPredicate,
  type ProjectAction,
  type ProjectActor,
} from "@/lib/server/project-authorization";
import {
  archiveProjectForUser,
  getProjectForActor,
  getProjectForUser,
  listProjectSummariesForActor,
  listProjectSummariesForUser,
  listProjectsForUser,
  saveProjectForUser,
  createMcpProjectForUser,
} from "@/lib/server/projects";

import {
  listProjectVersions,
  previewProjectEdit,
  applyProjectEdit,
} from "@/lib/server/project-edits";

let db: DatabaseSync;
const now = "2026-10-21T10:00:00.000Z";
const teamActor = (userId: string, teamId = "team-a"): ProjectActor => ({
  userId,
  scope: { kind: "team", teamId },
});
function seedProject(
  id: string,
  user: string | null,
  team: string | null,
  creator = "creator"
) {
  db.prepare(
    `INSERT INTO projects(id, owner_user_id, owner_team_id, created_by_user_id,
    title, design_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    user,
    team,
    creator,
    id,
    JSON.stringify(serializeDesign(createDefaultDesign())),
    now,
    now
  );
}
beforeEach(() => {
  db = createMigratedDatabase();
  mocks.getDatabase.mockResolvedValue(sqliteD1(db));
  for (const id of ["owner", "editor", "viewer", "outsider", "creator"]) {
    db.prepare(
      "INSERT INTO users(id, email, createdAt, updatedAt) VALUES (?, ?, ?, ?)"
    ).run(id, `${id}@example.invalid`, now, now);
  }
  db.exec(`INSERT INTO teams(id,name,slug,createdAt) VALUES
    ('team-a','Team A','team-a','${now}'), ('team-b','Team B','team-b','${now}');`);
  for (const role of ["owner", "editor", "viewer"]) {
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES (?,?,?,?,?)"
    ).run(role, "team-a", role, role, now);
  }
  seedProject("team-project", null, "team-a");
  seedProject("other-team-project", null, "team-b");
  seedProject("personal-project", "owner", null);
  seedProject("archived-project", null, "team-a");
  db.exec(
    "UPDATE projects SET archived_at='2026-10-21' WHERE id='archived-project'"
  );
});
afterEach(() => db.close());

describe("team project access", () => {
  const permissions: Record<string, readonly ProjectAction[]> = {
    owner: projectActions,
    editor: ["list", "read", "export", "create", "update", "archive"],
    viewer: ["list", "read", "export"],
    outsider: [],
    creator: [],
  };
  for (const [user, allowed] of Object.entries(permissions)) {
    for (const action of projectActions) {
      it(`${user}: ${action} ${allowed.includes(action) ? "allowed" : "denied"}`, async () => {
        const project = await getProjectForActor(
          "team-project",
          teamActor(user),
          action
        );
        expect(project !== null).toBe(allowed.includes(action));
      });
    }
  }

  it("requires explicit matching team context and excludes guessed IDs, archives and personal projects", async () => {
    for (const id of [
      "other-team-project",
      "personal-project",
      "archived-project",
      "missing",
    ]) {
      expect(await getProjectForActor(id, teamActor("owner"))).toBeNull();
    }
    expect(
      await getProjectForActor("team-project", teamActor("owner", "team-b"))
    ).toBeNull();
    expect(
      await getProjectForActor("team-project", {
        userId: "owner",
        scope: { kind: "personal" },
      })
    ).toBeNull();
    expect(
      await getProjectForActor("personal-project", {
        userId: "owner",
        scope: { kind: "personal" },
      })
    ).toMatchObject({
      owner: { kind: "personal", userId: "owner" },
      createdByUserId: "creator",
    });
  });

  it("lists authorized metadata only and keeps legacy credentials personal-only", async () => {
    const rows = await listProjectSummariesForActor(teamActor("viewer"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "team-project",
      owner: { kind: "team", teamId: "team-a" },
    });
    expect(rows[0]).not.toHaveProperty("design");
    expect(rows[0]).not.toHaveProperty("ownerUserId");
    expect(await listProjectSummariesForActor(teamActor("outsider"))).toEqual(
      []
    );
    expect((await listProjectsForUser("owner")).map((p) => p.id)).toEqual([
      "personal-project",
    ]);
    expect(
      (await listProjectSummariesForUser("owner", { mode: "all" })).map(
        (p) => p.id
      )
    ).toEqual(["personal-project"]);
    expect(
      await getProjectForUser("team-project", "owner", {
        mode: "selected",
        projectIds: ["team-project"],
      })
    ).toBeNull();
  });

  it("rechecks live membership for metadata, full designs and team-level actions", async () => {
    expect(
      await getAuthorizedTeam(teamActor("editor"), "create")
    ).toMatchObject({ id: "team-a" });
    expect(
      await getAuthorizedTeam(teamActor("editor"), "manage-members")
    ).toBeNull();
    expect(
      await getAuthorizedTeam(teamActor("owner"), "manage-members")
    ).not.toBeNull();
    db.exec("UPDATE team_members SET role='viewer' WHERE userId='editor'");
    expect(
      await getProjectForActor("team-project", teamActor("editor"), "update")
    ).toBeNull();
    db.exec("DELETE FROM team_members WHERE userId='viewer'");
    expect(
      await getProjectForActor("team-project", teamActor("viewer"))
    ).toBeNull();
    expect(await listProjectSummariesForActor(teamActor("viewer"))).toEqual([]);
    expect(await getAuthorizedTeam(teamActor("viewer"), "read")).toBeNull();
  });

  it("checks membership inside a mutation rather than trusting an earlier read", async () => {
    expect(
      await getProjectForActor("team-project", teamActor("editor"), "update")
    ).not.toBeNull();
    const access = projectAuthorizationPredicate(teamActor("editor"), "update");
    db.exec("DELETE FROM team_members WHERE userId='editor'");
    const result = db
      .prepare(
        `UPDATE projects SET title='unauthorized' WHERE id=? AND ${access.sql}`
      )
      .run("team-project", ...access.bindings);
    expect(result.changes).toBe(0);
    expect(
      db.prepare("SELECT title FROM projects WHERE id='team-project'").get()
    ).toMatchObject({ title: "team-project" });
  });

  it("cannot overwrite/archive a team project through personal save helpers", async () => {
    const before = db
      .prepare("SELECT * FROM projects WHERE id='team-project'")
      .get();
    await expect(
      saveProjectForUser("creator", createDefaultDesign(), {
        projectId: "team-project",
        forceWrite: true,
      })
    ).rejects.toThrow();
    expect(await archiveProjectForUser("team-project", "owner")).toBe(false);
    expect(
      db.prepare("SELECT * FROM projects WHERE id='team-project'").get()
    ).toEqual(before);
  });

  it("does not expose saved versions or proposals to a former personal owner", async () => {
    db.exec(`INSERT INTO mcp_project_edits(id,user_id,project_id,base_revision,before_json,after_json,changes_json,created_at,expires_at,applied_at,applied_revision)
      VALUES('old-version','creator','team-project',1,'{}','{}','[]','2026-10-20','2026-10-22','2026-10-20',2)`);
    await expect(
      listProjectVersions("creator", "team-project")
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      previewProjectEdit("creator", "team-project", 1, {
        restoreVersionId: "old-version",
      })
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      applyProjectEdit("creator", "team-project", "old-version", 1)
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("records creator independently for new personal and MCP projects", async () => {
    const personal = await saveProjectForUser("owner", createDefaultDesign());
    const mcp = await createMcpProjectForUser(
      "owner",
      createDefaultDesign(),
      "request",
      "hash"
    );
    for (const id of [personal.id, mcp.project.id]) {
      expect(
        db
          .prepare(
            "SELECT owner_user_id,created_by_user_id,revision FROM projects WHERE id=?"
          )
          .get(id)
      ).toMatchObject({
        owner_user_id: "owner",
        created_by_user_id: "owner",
        revision: 1,
      });
    }
  });

  it("keeps team ownership and content when only its creator is deleted", () => {
    db.exec("DELETE FROM users WHERE id='creator'");
    expect(
      db
        .prepare(
          "SELECT owner_team_id,created_by_user_id FROM projects WHERE id='team-project'"
        )
        .get()
    ).toMatchObject({ owner_team_id: "team-a", created_by_user_id: null });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("enforces exclusive valid ownership and unique membership/owner roles", () => {
    expect(() => seedProject("both", "owner", "team-a")).toThrow();
    expect(() => seedProject("neither", null, null)).toThrow();
    expect(() => seedProject("bad-team", null, "missing")).toThrow();
    expect(() =>
      db.exec("UPDATE team_members SET role='admin' WHERE userId='editor'")
    ).toThrow();
    expect(() =>
      db.exec("UPDATE team_members SET role='owner' WHERE userId='editor'")
    ).toThrow();
    expect(() =>
      db.exec(
        `INSERT INTO team_members SELECT 'duplicate',organizationId,userId,role,createdAt FROM team_members WHERE userId='viewer'`
      )
    ).toThrow();
    expect(() => db.exec("DELETE FROM teams WHERE id='team-a'")).toThrow();
  });
});
