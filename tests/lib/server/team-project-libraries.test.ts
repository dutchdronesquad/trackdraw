import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
import {
  createTeamProject,
  listTeamProjects,
  movePersonalProject,
  previewProjectMove,
  readTeamProject,
} from "@/lib/server/team-projects";
import { getProjectForUser, saveProjectForUser } from "@/lib/server/projects";
let db: DatabaseSync;
let design: ReturnType<typeof createDefaultDesign>;
const now = "2026-10-21T10:00:00.000Z";
beforeEach(() => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  for (const id of ["owner", "editor", "viewer", "outsider"])
    db.prepare(
      "INSERT INTO users(id,email,createdAt,updatedAt) VALUES(?,?,?,?)"
    ).run(id, `${id}@example.invalid`, now, now);
  db.exec(
    `INSERT INTO teams(id,name,slug,createdAt) VALUES('club','Club','club','${now}'),('other','Other','other','${now}')`
  );
  for (const role of ["owner", "editor", "viewer"])
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,?,?,?,?)"
    ).run(role, "club", role, role, now);
  design = {
    ...createDefaultDesign(),
    id: "personal",
    title: "Race",
    shapeOrder: ["gate"],
    shapeById: {
      gate: {
        id: "gate",
        kind: "gate",
        x: 3,
        y: 4,
        rotation: 0,
        width: 2,
        height: 2,
        appearance: {
          source: "private",
          templateId: "gate-standard-v1",
          assetId: "original-owner-asset",
        },
      },
    },
  };
  db.prepare(
    "INSERT INTO projects(id,owner_user_id,created_by_user_id,title,design_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)"
  ).run(
    design.id,
    "owner",
    "owner",
    design.title,
    JSON.stringify(serializeDesign(design)),
    now,
    now
  );
});
afterEach(() => db.close());
async function move() {
  const p = await previewProjectMove("owner", "personal");
  return movePersonalProject(
    "owner",
    "club",
    p.projectId,
    p.revision,
    p.publicationVersion
  );
}
function share(token = "published") {
  db.prepare(
    "INSERT INTO shares(id,token,design_json,created_at,updated_at,published_at,owner_user_id,project_id) VALUES(?,?,?,?,?,?,?,?)"
  ).run(token, token, "{}", now, now, now, "owner", "personal");
}
describe("team project libraries", () => {
  it.each(["owner", "editor"])(
    "%s creates a version 2 team project with independent provenance",
    async (user) => {
      const { project, editing } = await createTeamProject(
        user,
        "club",
        "New race"
      );
      expect(project).toMatchObject({
        owner: { kind: "team", teamId: "club" },
        createdByUserId: user,
        design: { version: 2, title: "New race" },
      });
      expect(editing).toBe("unavailable");
      expect(await getProjectForUser(project.id, user)).toBeNull();
      expect(
        (await listTeamProjects("viewer", "club")).projects.map((p) => p.id)
      ).toContain(project.id);
    }
  );
  it.each(["viewer", "outsider"])(
    "%s cannot create, including guessed team IDs",
    async (user) => {
      await expect(
        createTeamProject(user, "club", "Forbidden")
      ).rejects.toMatchObject({ code: "not_found" });
      expect(
        db
          .prepare(
            "SELECT count(*) n FROM projects WHERE owner_team_id IS NOT NULL"
          )
          .get()
      ).toMatchObject({ n: 0 });
    }
  );
  it("shares one private library between members and preserves personal separation", async () => {
    const { project } = await createTeamProject(
      "editor",
      "club",
      "Private race"
    );
    for (const role of ["owner", "editor", "viewer"]) {
      expect((await readTeamProject(role, "club", project.id)).project.id).toBe(
        project.id
      );
      expect((await listTeamProjects(role, "club")).projects).toHaveLength(1);
      await expect(
        readTeamProject(role, "club", "personal")
      ).rejects.toMatchObject({ code: "not_found" });
    }
    await expect(listTeamProjects("outsider", "club")).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      readTeamProject("owner", "other", project.id)
    ).rejects.toMatchObject({ code: "not_found" });
    db.exec("DELETE FROM team_members WHERE userId='editor'");
    await expect(
      readTeamProject("editor", "club", project.id)
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      createTeamProject("editor", "club", "Late save")
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("paginates metadata without loading designs and rejects a foreign cursor", async () => {
    for (let i = 0; i < 52; i++) {
      db.prepare(
        "INSERT INTO projects(id,owner_team_id,title,design_json,created_at,updated_at) VALUES(?,?,?,?,?,?)"
      ).run(
        `race-${String(i).padStart(2, "0")}`,
        "club",
        "Race",
        "NOT JSON",
        now,
        now
      );
    }
    const first = await listTeamProjects("viewer", "club");
    const next = await listTeamProjects("viewer", "club", first.nextCursor!);
    expect(first.projects).toHaveLength(50);
    expect(next.projects).toHaveLength(2);
    expect(next.nextCursor).toBeNull();
    expect(first.projects[0]).not.toHaveProperty("design");
    await expect(
      listTeamProjects("viewer", "club", "personal")
    ).rejects.toMatchObject({ code: "invalid" });
  });
  it("moves atomically, retains the ID, JSON, creator and publication records, and increments revision", async () => {
    share();
    db.prepare(
      "INSERT INTO gallery_entries(id,share_token,owner_user_id,gallery_state,gallery_title,gallery_description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)"
    ).run("gallery", "published", "owner", "listed", "Race", "", now, now);
    const before = db
      .prepare("SELECT design_json FROM projects WHERE id='personal'")
      .get();
    const preview = await previewProjectMove("owner", "personal");
    expect(preview).toMatchObject({ shareCount: 1, galleryCount: 1 });
    expect(JSON.stringify(preview)).not.toContain("published");
    const result = await move();
    expect(result.project).toMatchObject({
      id: "personal",
      revision: 2,
      createdByUserId: "owner",
      owner: { kind: "team", teamId: "club" },
    });
    expect(
      db.prepare("SELECT design_json FROM projects WHERE id='personal'").get()
    ).toEqual(before);
    expect(
      db.prepare("SELECT owner_user_id, project_id FROM shares").get()
    ).toMatchObject({ owner_user_id: "owner", project_id: "personal" });
    expect(
      db.prepare("SELECT gallery_state FROM gallery_entries").get()
    ).toMatchObject({ gallery_state: "listed" });
    expect(result.project.design.shapeById.gate.appearance).toEqual(
      design.shapeById.gate.appearance
    );
    expect(await getProjectForUser("personal", "owner")).toBeNull();
    await expect(
      saveProjectForUser("owner", design, {
        projectId: "personal",
        forceWrite: true,
      })
    ).rejects.toThrow();
    expect(
      (await readTeamProject("viewer", "club", "personal")).project.revision
    ).toBe(2);
  });
  it("rejects stale revision, new/revoked/changed publications and an active lease", async () => {
    let preview = await previewProjectMove("owner", "personal");
    db.exec("UPDATE projects SET title='Changed' WHERE id='personal'");
    await expect(
      movePersonalProject(
        "owner",
        "club",
        "personal",
        preview.revision,
        preview.publicationVersion
      )
    ).rejects.toMatchObject({ code: "conflict" });
    preview = await previewProjectMove("owner", "personal");
    share();
    await expect(
      movePersonalProject(
        "owner",
        "club",
        "personal",
        preview.revision,
        preview.publicationVersion
      )
    ).rejects.toMatchObject({ code: "conflict" });
    preview = await previewProjectMove("owner", "personal");
    db.exec("UPDATE shares SET revoked_at='2026-10-21'");
    await expect(
      movePersonalProject(
        "owner",
        "club",
        "personal",
        preview.revision,
        preview.publicationVersion
      )
    ).rejects.toMatchObject({ code: "conflict" });
    db.prepare("INSERT INTO project_edit_leases VALUES(?,?,?,?)").run(
      "personal",
      "owner",
      "tab",
      "2099-01-01T00:00:00.000Z"
    );
    await expect(move()).rejects.toMatchObject({ code: "conflict" });
    expect(await getProjectForUser("personal", "owner")).not.toBeNull();
    db.exec("UPDATE project_edit_leases SET expires_at='2000-01-01'");
    expect((await move()).project.id).toBe("personal");
  });
  it("rechecks publication changes between preview and the ownership UPDATE", async () => {
    const preview = await previewProjectMove("owner", "personal");
    mocks.db.mockResolvedValue(
      sqliteD1(db, (sql) => {
        if (sql.startsWith("UPDATE projects SET owner_user_id=NULL"))
          share("racing-share");
      })
    );
    await expect(
      movePersonalProject(
        "owner",
        "club",
        "personal",
        preview.revision,
        preview.publicationVersion
      )
    ).rejects.toMatchObject({ code: "conflict" });
    expect(await getProjectForUser("personal", "owner")).not.toBeNull();
  });
  it("requires personal ownership and ownership of the destination team; no reverse or team-to-team move", async () => {
    const p = await previewProjectMove("owner", "personal");
    await expect(
      previewProjectMove("editor", "personal")
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      movePersonalProject(
        "owner",
        "other",
        "personal",
        p.revision,
        p.publicationVersion
      )
    ).rejects.toMatchObject({ code: "conflict" });
    await move();
    await expect(previewProjectMove("owner", "personal")).rejects.toMatchObject(
      { code: "not_found" }
    );
  });
  it("has exactly one winner for duplicate move submissions", async () => {
    const p = await previewProjectMove("owner", "personal");
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        movePersonalProject(
          "owner",
          "club",
          "personal",
          p.revision,
          p.publicationVersion
        )
      )
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      db
        .prepare(
          "SELECT count(*) n, max(revision) revision FROM projects WHERE id='personal'"
        )
        .get()
    ).toMatchObject({ n: 1, revision: 2 });
  });
});
