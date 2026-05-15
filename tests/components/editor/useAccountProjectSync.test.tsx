// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import { useAccountProjectSync } from "@/components/editor/useAccountProjectSync";

vi.mock("@/lib/auth-client", () => ({
  isDevAuthShimEnabled: () => false,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
  },
}));

function createMemoryStorage(): Storage {
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
      store.set(key, value);
    }),
  };
}

describe("useAccountProjectSync", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { ok: false, error: "Network unavailable" },
          { status: 500 }
        )
      )
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps a local project fallback when account sync fails", async () => {
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";
    design.updatedAt = "2026-04-20T10:30:00.000Z";
    const setProjects = vi.fn();

    const { result } = renderHook(() =>
      useAccountProjectSync({
        authUserId: null,
        readOnly: false,
        design,
        projectManagerOpen: false,
        historyPaused: false,
        interactionSessionDepth: 0,
        snapshotCurrentDesign: vi.fn(),
        replaceDesign: vi.fn(),
        setProjects,
        setRestorePoints: vi.fn(),
        setActiveRestorePointId: vi.fn(),
        setSaveStatusLabel: vi.fn(),
      })
    );

    await act(async () => {
      await expect(result.current.syncDesignToAccount(design)).rejects.toThrow(
        "Network unavailable"
      );
    });

    const projectList = JSON.parse(
      localStorage.getItem("trackdraw-project-list") ?? "[]"
    ) as Array<{ id: string; title: string }>;
    const storedProject = JSON.parse(
      localStorage.getItem("trackdraw-project-project-1") ?? "null"
    ) as { id?: string; title?: string } | null;

    expect(projectList).toEqual([
      expect.objectContaining({ id: "project-1", title: "Race day layout" }),
    ]);
    expect(storedProject).toMatchObject({
      id: "project-1",
      title: "Race day layout",
    });
    expect(setProjects).toHaveBeenCalled();
    expect(result.current.projectSyncMetaById["project-1"]).toMatchObject({
      status: "failed",
      fallbackSavedAt: expect.any(String),
      error: "Network unavailable",
    });
  });
});
