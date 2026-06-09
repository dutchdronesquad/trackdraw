// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRestorePoint,
  deleteProjects,
  listRestorePoints,
  listRestorePointsForProject,
  listProjects,
  loadProject,
  loadRestorePoint,
  renameProject,
  saveProjectWithResult,
} from "@/lib/projects";
import { createDefaultDesign } from "@/lib/track/design";
import { createMemoryStorage } from "../helpers/storage";

describe("local project persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not add a project-list entry when the project payload write fails", () => {
    vi.stubGlobal(
      "localStorage",
      createMemoryStorage({}, { failSetKey: "trackdraw-project-project-1" })
    );
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";

    const result = saveProjectWithResult(design);

    expect(result).toMatchObject({ ok: false });
    expect(listProjects()).toEqual([]);
    expect(loadProject("project-1")).toBeNull();
  });

  it("updates the project list after the full payload exists", () => {
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";

    const result = saveProjectWithResult(design);

    expect(result).toMatchObject({
      ok: true,
      meta: expect.objectContaining({
        id: "project-1",
        title: "Race day layout",
      }),
    });
    expect(listProjects()).toEqual([
      expect.objectContaining({ id: "project-1", title: "Race day layout" }),
    ]);
    expect(loadProject("project-1")).toMatchObject({
      id: "project-1",
      title: "Race day layout",
    });
  });

  it("keeps project metadata and stored design titles in sync when renaming", () => {
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Draft layout";
    saveProjectWithResult(design);

    renameProject("project-1", "Race day layout");

    expect(listProjects()).toEqual([
      expect.objectContaining({ id: "project-1", title: "Race day layout" }),
    ]);
    expect(loadProject("project-1")).toMatchObject({
      id: "project-1",
      title: "Race day layout",
    });
  });

  it("deletes projects and only their restore points", () => {
    const firstDesign = createDefaultDesign();
    firstDesign.id = "project-1";
    firstDesign.title = "First layout";
    const secondDesign = createDefaultDesign();
    secondDesign.id = "project-2";
    secondDesign.title = "Second layout";
    saveProjectWithResult(firstDesign);
    saveProjectWithResult(secondDesign);
    const firstRestorePoint = createRestorePoint(firstDesign);
    const secondRestorePoint = createRestorePoint(secondDesign);

    deleteProjects(["project-1"]);

    expect(loadProject("project-1")).toBeNull();
    expect(loadRestorePoint(firstRestorePoint.id)).toBeNull();
    expect(loadProject("project-2")).toMatchObject({ id: "project-2" });
    expect(loadRestorePoint(secondRestorePoint.id)).toMatchObject({
      id: "project-2",
    });
    expect(listRestorePoints()).toEqual([
      expect.objectContaining({ id: secondRestorePoint.id }),
    ]);
  });

  it("prunes restore points per design instead of globally", () => {
    const activeDesign = createDefaultDesign();
    activeDesign.id = "project-1";
    activeDesign.title = "Race day layout";
    const otherDesign = createDefaultDesign();
    otherDesign.id = "project-2";
    otherDesign.title = "Other layout";
    const otherRestorePoint = createRestorePoint(otherDesign);
    const activeRestorePoints = Array.from({ length: 11 }, () =>
      createRestorePoint(activeDesign)
    );
    const droppedRestorePoint = activeRestorePoints[0];

    expect(listRestorePointsForProject("project-1")).toHaveLength(10);
    expect(loadRestorePoint(droppedRestorePoint.id)).toBeNull();
    expect(loadRestorePoint(otherRestorePoint.id)).toMatchObject({
      id: "project-2",
    });
  });
});
