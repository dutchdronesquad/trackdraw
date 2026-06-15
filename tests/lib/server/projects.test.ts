import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import {
  createD1AllStatement,
  createD1Statement,
  installD1Statements,
} from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({
    prepare: mocks.prepare,
  })),
}));

import {
  ProjectVersionConflictError,
  archiveProjectForUser,
  getProjectForUser,
  listProjectsForUser,
  listProjectSummariesForUser,
  saveProjectForUser,
} from "@/lib/server/projects";
import type { TrackDesign } from "@/lib/types";

function projectRow(design: TrackDesign) {
  return {
    id: "project-1",
    owner_user_id: "user-1",
    title: "Race layout",
    description: "",
    design_json: JSON.stringify(serializeDesign(design)),
    field_width: design.field.width,
    field_height: design.field.height,
    shape_count: design.shapeOrder.length,
    created_at: "2026-04-20T10:00:00.000Z",
    updated_at: "2026-04-20T10:10:00.000Z",
    archived_at: null,
  };
}

describe("project server helpers", () => {
  beforeEach(() => {
    mocks.prepare.mockReset();
  });

  it("rejects stale account project saves before overwriting cloud state", async () => {
    const cloudDesign = createDefaultDesign();
    cloudDesign.updatedAt = "2026-04-20T10:10:00.000Z";
    const localDesign = createDefaultDesign();
    localDesign.updatedAt = "2026-04-20T10:05:00.000Z";
    const selectStatement = createD1Statement({
      first: projectRow(cloudDesign),
    });
    installD1Statements(mocks.prepare, [selectStatement]);

    await expect(
      saveProjectForUser("user-1", localDesign, {
        projectId: "project-1",
        title: "Race layout",
        baseDesignUpdatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).rejects.toMatchObject({
      name: "ProjectVersionConflictError",
      projectId: "project-1",
      localUpdatedAt: "2026-04-20T10:05:00.000Z",
      cloudUpdatedAt: "2026-04-20T10:10:00.000Z",
    } satisfies Partial<ProjectVersionConflictError>);

    expect(mocks.prepare).toHaveBeenCalledTimes(1);
    expect(selectStatement.sql).toContain("where id = ?");
  });

  it("uses the previous project JSON as an atomic update guard", async () => {
    const previousDesign = createDefaultDesign();
    previousDesign.updatedAt = "2026-04-20T10:00:00.000Z";
    const nextDesign = createDefaultDesign();
    nextDesign.updatedAt = "2026-04-20T10:05:00.000Z";
    const selectPreviousStatement = createD1Statement({
      first: projectRow(previousDesign),
    });
    const upsertStatement = createD1Statement({
      first: projectRow(nextDesign),
    });
    installD1Statements(mocks.prepare, [
      selectPreviousStatement,
      upsertStatement,
    ]);

    await saveProjectForUser("user-1", nextDesign, {
      projectId: "project-1",
      title: "Race layout",
      baseDesignUpdatedAt: previousDesign.updatedAt,
    });

    expect(upsertStatement.sql).toContain("projects.design_json = ?");
    expect(upsertStatement.sql).toContain("returning");
    expect(upsertStatement.bind).toHaveBeenCalledWith(
      "project-1",
      "user-1",
      "Race layout",
      "",
      JSON.stringify(serializeDesign(nextDesign)),
      nextDesign.field.width,
      nextDesign.field.height,
      0,
      expect.any(String),
      expect.any(String),
      0,
      JSON.stringify(serializeDesign(previousDesign))
    );
  });

  it("getProjectForUser returns null when no row is found", async () => {
    installD1Statements(mocks.prepare, [createD1Statement({ first: null })]);
    const result = await getProjectForUser("missing", "user-1");
    expect(result).toBeNull();
  });

  it("getProjectForUser returns a parsed project when the row exists", async () => {
    const design = createDefaultDesign();
    installD1Statements(mocks.prepare, [
      createD1Statement({ first: projectRow(design) }),
    ]);
    const result = await getProjectForUser("project-1", "user-1");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("project-1");
    expect(result?.ownerUserId).toBe("user-1");
    expect(result?.design.id).toBe(design.id);
  });

  it("listProjectsForUser returns an empty list when no projects exist", async () => {
    const allStmt = createD1AllStatement([]);
    mocks.prepare.mockReturnValue(allStmt);

    const result = await listProjectsForUser("user-1");
    expect(result).toEqual([]);
  });

  it("listProjectsForUser maps rows to StoredProject objects", async () => {
    const design = createDefaultDesign();
    const allStmt = createD1AllStatement([projectRow(design)]);
    mocks.prepare.mockReturnValue(allStmt);

    const result = await listProjectsForUser("user-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "project-1",
      ownerUserId: "user-1",
      title: "Race layout",
    });
  });

  it("listProjectSummariesForUser returns mapped summaries without design data", async () => {
    const allStmt = createD1AllStatement([
      {
        id: "project-2",
        owner_user_id: "user-1",
        title: "Summary Track",
        field_width: 60,
        field_height: 40,
        shape_count: 5,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
      },
    ]);
    mocks.prepare.mockReturnValue(allStmt);

    const result = await listProjectSummariesForUser("user-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "project-2",
      ownerUserId: "user-1",
      title: "Summary Track",
      fieldWidth: 60,
      fieldHeight: 40,
      shapeCount: 5,
    });
  });

  it("listProjectSummariesForUser handles null field dimensions", async () => {
    const allStmt = createD1AllStatement([
      {
        id: "project-3",
        owner_user_id: "user-1",
        title: "No dims",
        field_width: null,
        field_height: null,
        shape_count: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    mocks.prepare.mockReturnValue(allStmt);

    const result = await listProjectSummariesForUser("user-1");
    expect(result[0]).toMatchObject({ fieldWidth: null, fieldHeight: null });
  });

  it("archiveProjectForUser runs an UPDATE query with the correct bindings", async () => {
    const runStmt = createD1Statement();
    mocks.prepare.mockReturnValue(runStmt);

    await archiveProjectForUser("project-1", "user-1");

    expect(runStmt.run).toHaveBeenCalledOnce();
    expect(runStmt.bind).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      "project-1",
      "user-1"
    );
    expect(mocks.prepare).toHaveBeenCalledWith(
      expect.stringContaining("archived_at")
    );
  });
});
