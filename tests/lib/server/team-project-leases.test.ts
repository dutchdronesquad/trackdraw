import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign } from "@/lib/track/design";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
import {
  acquireProjectLease,
  renewProjectLease,
  releaseProjectLease,
  saveTeamProject,
} from "@/lib/server/team-project-leases";
import { createTeamProject, readTeamProject } from "@/lib/server/team-projects";
import {
  archiveProjectForUser,
  saveProjectForUser,
} from "@/lib/server/projects";
let db: DatabaseSync;
let projectId: string;
beforeEach(async () => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  for (const id of ["owner", "editor", "viewer", "outsider"])
    db.prepare(
      "INSERT INTO users(id,name,email,createdAt,updatedAt) VALUES(?,?,?,?,?)"
    ).run(id, id, `${id}@example.invalid`, "2026", "2026");
  db.exec(
    "INSERT INTO teams(id,name,slug,createdAt) VALUES('club','Club','club','2026')"
  );
  for (const role of ["owner", "editor", "viewer"])
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,?,?,?,?)"
    ).run(role, "club", role, role, "2026");
  projectId = (await createTeamProject("owner", "club", "Race")).project.id;
});
afterEach(() => db.close());
const acquire = (user = "owner") =>
  acquireProjectLease(user, "club", projectId);
const expire = () =>
  db.exec(
    "UPDATE project_edit_leases SET expires_at='2000-01-01T00:00:00.000Z'"
  );
describe("exclusive team project editing", () => {
  it.each([
    ["owner", "editor"],
    ["owner", "owner"],
  ])("only one simultaneous session wins (%s / %s)", async (a, b) => {
    const results = await Promise.allSettled([acquire(a), acquire(b)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const view = await readTeamProject("viewer", "club", projectId);
    expect(view.editing?.name).toBe(a);
    expect(view.editing).not.toHaveProperty("sessionId");
  });
  it.each(["viewer", "outsider"])(
    "%s cannot acquire, renew or save",
    async (user) => {
      await expect(acquire(user)).rejects.toMatchObject({
        code: "lease_unavailable",
      });
      const { lease, project } = await acquire();
      await expect(
        renewProjectLease(user, "club", projectId, lease.sessionId)
      ).rejects.toMatchObject({ code: "lease_lost" });
      await expect(
        saveTeamProject(
          user,
          "club",
          projectId,
          lease.sessionId,
          project.revision,
          project.design
        )
      ).rejects.toMatchObject({ code: "lease_lost" });
      await releaseProjectLease(user, projectId, lease.sessionId);
      await expect(acquire("editor")).rejects.toMatchObject({
        code: "lease_unavailable",
      });
    }
  );
  it("refreshes server state on handoff and fences old saves, renewals and unload releases", async () => {
    const first = await acquire();
    const changed = { ...first.project.design, title: "Saved by first" };
    const saved = await saveTeamProject(
      "owner",
      "club",
      projectId,
      first.lease.sessionId,
      first.project.revision,
      changed
    );
    expect(saved.revision).toBe(first.project.revision + 1);
    await releaseProjectLease("owner", projectId, first.lease.sessionId);
    const second = await acquire("editor");
    expect(second.project.design.title).toBe("Saved by first");
    await expect(
      renewProjectLease("owner", "club", projectId, first.lease.sessionId)
    ).rejects.toMatchObject({ code: "lease_lost" });
    await expect(
      saveTeamProject(
        "owner",
        "club",
        projectId,
        first.lease.sessionId,
        saved.revision,
        { ...changed, title: "Late first" }
      )
    ).rejects.toMatchObject({ code: "lease_lost" });
    await releaseProjectLease("owner", projectId, first.lease.sessionId);
    await expect(acquire()).rejects.toMatchObject({
      code: "lease_unavailable",
    });
    expect(
      (await readTeamProject("viewer", "club", projectId)).project.design.title
    ).toBe("Saved by first");
  });
  it("expiry cannot be revived even before a successor acquires", async () => {
    const first = await acquire();
    expire();
    await expect(
      renewProjectLease("owner", "club", projectId, first.lease.sessionId)
    ).rejects.toMatchObject({ code: "lease_lost" });
    await expect(
      saveTeamProject(
        "owner",
        "club",
        projectId,
        first.lease.sessionId,
        first.project.revision,
        first.project.design
      )
    ).rejects.toMatchObject({ code: "lease_lost" });
    const next = await acquire();
    expect(next.lease.sessionId).not.toBe(first.lease.sessionId);
    await releaseProjectLease("owner", projectId, first.lease.sessionId);
    await expect(acquire()).rejects.toMatchObject({
      code: "lease_unavailable",
    });
  });
  it("rejects a stale revision without changing the server design or published snapshot", async () => {
    const first = await acquire();
    db.prepare(
      "INSERT INTO shares(id,token,design_json,created_at,updated_at,published_at,owner_user_id,project_id) VALUES('share','token','snapshot','2026','2026','2026','owner',?)"
    ).run(projectId);
    await saveTeamProject(
      "owner",
      "club",
      projectId,
      first.lease.sessionId,
      first.project.revision,
      { ...first.project.design, title: "Current" }
    );
    await expect(
      saveTeamProject(
        "owner",
        "club",
        projectId,
        first.lease.sessionId,
        first.project.revision,
        { ...first.project.design, title: "Stale" }
      )
    ).rejects.toMatchObject({ code: "conflict" });
    expect(
      (await readTeamProject("viewer", "club", projectId)).project.design.title
    ).toBe("Current");
    expect(db.prepare("SELECT design_json FROM shares").get()).toMatchObject({
      design_json: "snapshot",
    });
  });
  it.each(["remove", "downgrade"])(
    "%s immediately blocks renewal and saving, including a race at the write",
    async (action) => {
      const first = await acquire("editor");
      mocks.db.mockResolvedValue(
        sqliteD1(db, (sql) => {
          if (sql.startsWith("UPDATE projects SET title=")) {
            if (action === "remove")
              db.exec("DELETE FROM team_members WHERE userId='editor'");
            else
              db.exec(
                "UPDATE team_members SET role='viewer' WHERE userId='editor'"
              );
          }
        })
      );
      await expect(
        saveTeamProject(
          "editor",
          "club",
          projectId,
          first.lease.sessionId,
          first.project.revision,
          { ...first.project.design, title: "Forbidden" }
        )
      ).rejects.toMatchObject({ code: "lease_lost" });
      await expect(
        renewProjectLease("editor", "club", projectId, first.lease.sessionId)
      ).rejects.toMatchObject({ code: "lease_lost" });
      expect(
        (await readTeamProject("owner", "club", projectId)).project.design.title
      ).toBe("Race");
    }
  );
  it("fences an in-flight old save when a different session takes over at execution", async () => {
    const first = await acquire();
    expire();
    const second = await acquire("editor");
    await saveTeamProject(
      "editor",
      "club",
      projectId,
      second.lease.sessionId,
      second.project.revision,
      { ...second.project.design, title: "Successor" }
    );
    await expect(
      saveTeamProject(
        "owner",
        "club",
        projectId,
        first.lease.sessionId,
        second.project.revision + 1,
        { ...first.project.design, title: "Old" }
      )
    ).rejects.toMatchObject({ code: "lease_lost" });
    expect(
      (await readTeamProject("viewer", "club", projectId)).project.design.title
    ).toBe("Successor");
  });
  it("personal API/MCP writes and archive cannot bypass a team lease", async () => {
    const first = await acquire();
    await expect(
      saveProjectForUser("owner", first.project.design, {
        projectId,
        forceWrite: true,
      })
    ).rejects.toThrow();
    await archiveProjectForUser(projectId, "owner");
    expect(
      (await readTeamProject("owner", "club", projectId)).project.archivedAt
    ).toBeNull();
    await expect(
      acquireProjectLease("owner", "wrong-team", projectId)
    ).rejects.toMatchObject({ code: "lease_unavailable" });
    await expect(
      saveTeamProject(
        "owner",
        "wrong-team",
        projectId,
        first.lease.sessionId,
        first.project.revision,
        first.project.design
      )
    ).rejects.toMatchObject({ code: "lease_lost" });
    await expect(
      saveTeamProject(
        "owner",
        "club",
        projectId,
        first.lease.sessionId,
        first.project.revision,
        createDefaultDesign()
      )
    ).rejects.toMatchObject({ code: "invalid" });
  });
});
it("role restoration cannot revive an invalidated token; a fresh lease is required", async () => {
  const first = await acquire("editor");
  db.exec(
    "UPDATE team_members SET role='viewer' WHERE userId='editor'; UPDATE team_members SET role='editor' WHERE userId='editor'"
  );
  await expect(
    renewProjectLease("editor", "club", projectId, first.lease.sessionId)
  ).rejects.toMatchObject({ code: "lease_lost" });
  const next = await acquire("editor");
  expect(next.lease.sessionId).not.toBe(first.lease.sessionId);
});
it("archive and ownership mutations cannot bypass an active editing session", async () => {
  const first = await acquire();
  expect(() =>
    db
      .prepare("UPDATE projects SET archived_at='2026' WHERE id=?")
      .run(projectId)
  ).toThrow("project_edit_session_active");
  expect(() =>
    db
      .prepare(
        "UPDATE projects SET owner_team_id=NULL, owner_user_id='owner' WHERE id=?"
      )
      .run(projectId)
  ).toThrow("project_edit_session_active");
  await releaseProjectLease("owner", projectId, first.lease.sessionId);
  expect(() =>
    db
      .prepare("UPDATE projects SET archived_at='2026' WHERE id=?")
      .run(projectId)
  ).not.toThrow();
});
