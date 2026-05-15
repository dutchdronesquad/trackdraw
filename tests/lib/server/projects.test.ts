import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";

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
  saveProjectForUser,
} from "@/lib/server/projects";
import type { TrackDesign } from "@/lib/types";

type Statement = {
  sql: string;
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
};

function createStatement(result?: { first?: unknown; run?: unknown }) {
  const statement: Statement = {
    sql: "",
    bind: vi.fn(() => statement),
    first: vi.fn(async () => result?.first ?? null),
    run: vi.fn(async () => result?.run ?? {}),
  };

  return statement;
}

function installStatements(statements: Statement[]) {
  mocks.prepare.mockImplementation((sql: string) => {
    const statement = statements.shift();
    if (!statement) {
      throw new Error(`Unexpected SQL: ${sql}`);
    }

    statement.sql = sql;
    return statement;
  });
}

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
    const selectStatement = createStatement({ first: projectRow(cloudDesign) });
    installStatements([selectStatement]);

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
    const selectPreviousStatement = createStatement({
      first: projectRow(previousDesign),
    });
    const upsertStatement = createStatement();
    const selectSavedStatement = createStatement({
      first: projectRow(nextDesign),
    });
    installStatements([
      selectPreviousStatement,
      upsertStatement,
      selectSavedStatement,
    ]);

    await saveProjectForUser("user-1", nextDesign, {
      projectId: "project-1",
      title: "Race layout",
      baseDesignUpdatedAt: previousDesign.updatedAt,
    });

    expect(upsertStatement.sql).toContain("projects.design_json = ?");
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
});
