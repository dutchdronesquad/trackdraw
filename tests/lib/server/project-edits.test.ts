import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import { getDatabase } from "@/lib/server/db";
import {
  previewProjectEdit,
  applyProjectEdit,
  listProjectVersions,
} from "@/lib/server/project-edits";
import {
  getProjectForUser,
  saveProjectForUser,
  archiveProjectForUser,
} from "@/lib/server/projects";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/server/shares", () => ({ revokeSharesForProject: vi.fn() }));
let sqlite: ReturnType<typeof createMigratedDatabase>;
const changes = [{ shape_id: "gate", patch: { x: 15, rotation: 90 } }];
async function preview(revision = 1) {
  return previewProjectEdit("owner", "track", revision, { changes });
}
beforeEach(() => {
  sqlite = createMigratedDatabase();
  sqlite.exec(
    "INSERT INTO users(id,name,email,createdAt,updatedAt) VALUES('owner','Pilot','o@example.invalid','2026','2026'),('other','Other','x@example.invalid','2026','2026')"
  );
  const design = createDefaultDesign();
  design.id = "track";
  design.updatedAt = "2026-01-01T00:00:00.000Z";
  design.shapeOrder = ["gate", "untouched", "route"];
  design.shapeById = {
    gate: {
      id: "gate",
      kind: "gate",
      x: 10,
      y: 10,
      rotation: 0,
      width: 3,
      height: 2,
    },
    untouched: {
      id: "untouched",
      kind: "cone",
      x: 20,
      y: 20,
      rotation: 0,
      radius: 0.5,
    },
    route: {
      id: "route",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 5, y: 5 },
        { x: 10, y: 10 },
      ],
    },
  };
  sqlite
    .prepare(
      "INSERT INTO projects(id,owner_user_id,title,description,design_json,field_width,field_height,shape_count,created_at,updated_at) VALUES('track','owner','Original','Notes',?,60,40,3,'2026','2026')"
    )
    .run(JSON.stringify(serializeDesign(design)));
  vi.mocked(getDatabase).mockResolvedValue(sqliteD1(sqlite));
});
afterEach(() => {
  sqlite.close();
  vi.restoreAllMocks();
});
describe("reviewed remote project edits", () => {
  it("previews exact item changes without modifying the saved project", async () => {
    const original = await getProjectForUser("track", "owner");
    const proposal = await preview();
    expect(proposal).toMatchObject({
      base_revision: 1,
      changes: [
        {
          shape_id: "gate",
          before: { x: 10, rotation: 0 },
          after: { x: 15, rotation: 90 },
        },
      ],
    });
    expect(await getProjectForUser("track", "owner")).toEqual(original);
  });
  it("applies once, preserves untouched content and retains a recoverable prior version", async () => {
    const before = await getProjectForUser("track", "owner");
    const proposal = await preview();
    const result = await applyProjectEdit(
      "owner",
      "track",
      proposal.proposal_id,
      1
    );
    expect(result).toMatchObject({
      revision: 2,
      replayed: false,
      previous_version_id: proposal.proposal_id,
    });
    const next = await getProjectForUser("track", "owner");
    expect(next?.design.shapeById.gate.x).toBe(15);
    expect(next?.design.shapeById.untouched).toEqual(
      before?.design.shapeById.untouched
    );
    expect(next?.description).toBe("Notes");
    expect(await listProjectVersions("owner", "track")).toMatchObject({
      versions: [
        {
          version_id: proposal.proposal_id,
          revision: 1,
          replaced_by_revision: 2,
        },
      ],
    });
    const restore = await previewProjectEdit("owner", "track", 2, {
      restoreVersionId: proposal.proposal_id,
    });
    expect((await getProjectForUser("track", "owner"))?.revision).toBe(2);
    await applyProjectEdit("owner", "track", restore.proposal_id, 2);
    const restored = await getProjectForUser("track", "owner");
    expect(restored?.revision).toBe(3);
    expect(restored?.design.shapeById).toEqual(before?.design.shapeById);
    expect((await listProjectVersions("owner", "track")).versions).toHaveLength(
      2
    );
  });
  it("is idempotent under concurrent apply and later Studio saves", async () => {
    const proposal = await preview();
    const applied = await Promise.all(
      [1, 2, 3].map(() =>
        applyProjectEdit("owner", "track", proposal.proposal_id, 1)
      )
    );
    expect(applied.filter((result) => !result.replayed)).toHaveLength(1);
    expect((await getProjectForUser("track", "owner"))?.revision).toBe(2);
    const current = (await getProjectForUser("track", "owner"))!;
    current.design.shapeById.gate.x = 25;
    current.design.updatedAt = new Date().toISOString();
    await saveProjectForUser("owner", current.design, {
      projectId: "track",
      baseRevision: 2,
    });
    expect(
      await applyProjectEdit("owner", "track", proposal.proposal_id, 1)
    ).toMatchObject({ revision: 2, current_revision: 3, replayed: true });
    expect(
      (await getProjectForUser("track", "owner"))?.design.shapeById.gate.x
    ).toBe(25);
  });
  it.each(["title", "description", "design_json"])(
    "rejects stale proposals after a %s write even with unchanged timestamps",
    async (column) => {
      const proposal = await preview();
      sqlite
        .prepare(`UPDATE projects SET ${column}=${column} WHERE id='track'`)
        .run();
      await expect(
        applyProjectEdit("owner", "track", proposal.proposal_id, 1)
      ).rejects.toMatchObject({ code: "revision_conflict" });
      expect((await listProjectVersions("owner", "track")).versions).toEqual(
        []
      );
    }
  );
  it("rejects a Studio save based on the pre-apply revision, including force writes", async () => {
    const original = (await getProjectForUser("track", "owner"))!;
    const proposal = await preview();
    await applyProjectEdit("owner", "track", proposal.proposal_id, 1);
    for (const forceWrite of [false, true])
      await expect(
        saveProjectForUser("owner", original.design, {
          projectId: "track",
          baseRevision: 1,
          forceWrite,
        })
      ).rejects.toMatchObject({ name: "ProjectVersionConflictError" });
  });
  it("rejects a concurrent metadata write during a forced Studio save", async () => {
    const current = (await getProjectForUser("track", "owner"))!;
    let raced = false;
    vi.mocked(getDatabase).mockResolvedValue(
      sqliteD1(sqlite, (query) => {
        if (!raced && query.includes("insert into projects")) {
          raced = true;
          sqlite.exec(
            "UPDATE projects SET title='Concurrent title' WHERE id='track'"
          );
        }
      })
    );
    current.design.title = "Local change";
    await expect(
      saveProjectForUser("owner", current.design, {
        projectId: "track",
        baseRevision: 1,
        forceWrite: true,
      })
    ).rejects.toMatchObject({ name: "ProjectVersionConflictError" });
    expect((await getProjectForUser("track", "owner"))?.title).toBe(
      "Concurrent title"
    );
  });

  it("uses the Studio polyline anchor mutation semantics", async () => {
    const proposal = await previewProjectEdit("owner", "track", 1, {
      changes: [{ shape_id: "route", patch: { x: 20 } }],
    });
    await applyProjectEdit("owner", "track", proposal.proposal_id, 1);
    const route = (await getProjectForUser("track", "owner"))!.design.shapeById
      .route;
    expect(route).toMatchObject({
      x: 0,
      y: 0,
      points: [
        { x: 17.5, y: 5 },
        { x: 22.5, y: 10 },
      ],
    });
  });
  it.each([
    { changes: [{ shape_id: "missing", patch: { x: 5 } }] },
    { changes: [{ shape_id: "gate", patch: { x: -5 } }] },
    { changes: [{ shape_id: "gate", patch: { x: Infinity } }] },
    { changes: [{ shape_id: "gate", patch: { width: 4 } }] },
    {
      changes: [
        { shape_id: "gate", patch: { x: 5 } },
        { shape_id: "gate", patch: { y: 7 } },
      ],
    },
    { changes: [{ shape_id: "route", patch: { rotation: 90 } }] },
  ])("rejects malformed or unsupported edits $changes", async ({ changes }) => {
    await expect(
      previewProjectEdit("owner", "track", 1, { changes })
    ).rejects.toMatchObject({ code: "validation_failed" });
  });
  it("rejects locked items and expired proposals", async () => {
    const proposal = await preview();
    sqlite
      .prepare("UPDATE mcp_project_edits SET expires_at='2000' WHERE id=?")
      .run(proposal.proposal_id);
    await expect(
      applyProjectEdit("owner", "track", proposal.proposal_id, 1)
    ).rejects.toMatchObject({ code: "proposal_expired" });
    const current = (await getProjectForUser("track", "owner"))!;
    current.design.shapeById.gate.locked = true;
    await saveProjectForUser("owner", current.design, {
      projectId: "track",
      baseRevision: 1,
    });
    await expect(preview(2)).rejects.toMatchObject({
      code: "validation_failed",
    });
  });
  it("binds proposals, recovery and expected revisions to the owning project/account", async () => {
    const proposal = await preview();
    await expect(
      applyProjectEdit("owner", "track", proposal.proposal_id, 2)
    ).rejects.toMatchObject({ code: "revision_conflict" });
    await expect(
      previewProjectEdit("other", "track", 1, { changes })
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      applyProjectEdit("other", "track", proposal.proposal_id, 1)
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(listProjectVersions("other", "track")).rejects.toMatchObject({
      code: "not_found",
    });
    await archiveProjectForUser("track", "owner");
    await expect(
      applyProjectEdit("owner", "track", proposal.proposal_id, 1)
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("rolls back project changes if receipt persistence fails", async () => {
    const proposal = await preview();
    sqlite.exec(
      "CREATE TRIGGER fail_apply BEFORE UPDATE ON mcp_project_edits BEGIN SELECT RAISE(ABORT,'test receipt failure'); END;"
    );
    await expect(
      applyProjectEdit("owner", "track", proposal.proposal_id, 1)
    ).rejects.toThrow();
    expect((await getProjectForUser("track", "owner"))?.revision).toBe(1);
  });
});
