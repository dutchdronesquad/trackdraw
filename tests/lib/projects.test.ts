// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listProjects,
  loadProject,
  saveProjectWithResult,
} from "@/lib/projects";
import { createDefaultDesign } from "@/lib/track/design";

function createMemoryStorage(options?: { failSetKey?: string }) {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (key === options?.failSetKey) {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      store.set(key, value);
    }),
  } satisfies Storage;
}

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
      createMemoryStorage({ failSetKey: "trackdraw-project-project-1" })
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
});
