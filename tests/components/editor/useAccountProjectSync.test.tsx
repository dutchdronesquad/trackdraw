// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { createDefaultDesign } from "@/lib/track/design";
import {
  AccountProjectSyncConflictError,
  useAccountProjectSync,
} from "@/components/editor/useAccountProjectSync";
import { saveProject, type ProjectMeta } from "@/lib/projects";
import type { TrackDesign } from "@/lib/types";
import { createMemoryStorage } from "../../helpers/storage";

vi.mock("nanoid", () => ({
  nanoid: () => "local-copy-id",
}));

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

type HookOptions = Parameters<typeof useAccountProjectSync>[0];

function renderAccountProjectSync(overrides: Partial<HookOptions> = {}) {
  const design = overrides.design ?? createDefaultDesign();
  const options: HookOptions = {
    authUserId: null,
    readOnly: false,
    design,
    projectManagerOpen: false,
    historyPaused: false,
    interactionSessionDepth: 0,
    projects: [],
    initialized: true,
    snapshotCurrentDesign: vi.fn(),
    replaceDesign: vi.fn(),
    setProjects: vi.fn(),
    setRestorePoints: vi.fn(),
    setActiveRestorePointId: vi.fn(),
    setSaveStatusLabel: vi.fn(),
    ...overrides,
  };

  return renderHook(() => useAccountProjectSync(options));
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps a local project fallback when account sync fails", async () => {
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";
    design.updatedAt = "2026-04-20T10:30:00.000Z";
    const setProjects = vi.fn();

    const { result } = renderAccountProjectSync({ design, setProjects });

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

  it("keeps account and local copies separate when account sync reports a version conflict", async () => {
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";
    design.updatedAt = "2026-04-20T10:05:00.000Z";
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return Response.json(
            {
              ok: false,
              code: "project_version_conflict",
              error: "Account project changed on another device.",
              conflict: {
                projectId: "project-1",
                title: "Race day layout",
                localUpdatedAt: "2026-04-20T10:05:00.000Z",
                cloudUpdatedAt: "2026-04-20T10:10:00.000Z",
              },
              project: {
                id: "project-1",
                title: "Race day layout",
                updatedAt: "2026-04-20T10:11:00.000Z",
                designUpdatedAt: "2026-04-20T10:10:00.000Z",
                shapeCount: 0,
              },
            },
            { status: 409 }
          );
        }

        return Response.json({
          ok: true,
          projects: [
            {
              id: "project-1",
              title: "Race day layout",
              updatedAt: "2026-04-20T10:11:00.000Z",
              designUpdatedAt: "2026-04-20T10:10:00.000Z",
              shapeCount: 0,
            },
          ],
        });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderAccountProjectSync({
      authUserId: "user-1",
      design,
    });

    await waitFor(() => {
      expect(result.current.accountProjects).toHaveLength(1);
    });

    await act(async () => {
      await expect(result.current.syncDesignToAccount(design)).rejects.toThrow(
        AccountProjectSyncConflictError
      );
    });

    const postCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input) === "/api/projects" && init?.method === "POST"
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      projectId: "project-1",
      baseDesignUpdatedAt: "2026-04-20T10:10:00.000Z",
    });
    expect(localStorage.getItem("trackdraw-project-project-1")).toBeNull();
    expect(result.current.projectVersionConflict).toEqual({
      projectId: "project-1",
      title: "Race day layout",
      localUpdatedAt: "2026-04-20T10:05:00.000Z",
      cloudUpdatedAt: "2026-04-20T10:10:00.000Z",
    });
    expect(result.current.projectSyncMetaById["project-1"]).toMatchObject({
      status: "conflict",
      lastSyncedAt: "2026-04-20T10:11:00.000Z",
    });
  });

  it("opens an account project into the editor and persists it locally", async () => {
    const activeDesign = createDefaultDesign();
    activeDesign.id = "project-1";
    const accountDesign: TrackDesign = {
      ...createDefaultDesign(),
      id: "project-2",
      title: "Cloud race layout",
      updatedAt: "2026-04-20T11:00:00.000Z",
    };
    const snapshotCurrentDesign = vi.fn();
    const replaceDesign = vi.fn();
    const setProjects = vi.fn();
    const setRestorePoints = vi.fn();
    const setActiveRestorePointId = vi.fn();
    const setSaveStatusLabel = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/projects/project-2") {
          return Response.json({
            ok: true,
            project: { design: accountDesign },
          });
        }

        return Response.json({ ok: true, projects: [] });
      })
    );

    const { result } = renderAccountProjectSync({
      authUserId: "user-1",
      design: activeDesign,
      snapshotCurrentDesign,
      replaceDesign,
      setProjects,
      setRestorePoints,
      setActiveRestorePointId,
      setSaveStatusLabel,
    });

    let opened = false;
    await act(async () => {
      opened = await result.current.handleOpenAccountProject("project-2");
    });

    expect(opened).toBe(true);
    expect(snapshotCurrentDesign).toHaveBeenCalled();
    expect(replaceDesign).toHaveBeenCalledWith(accountDesign);
    expect(setProjects).toHaveBeenCalled();
    expect(setRestorePoints).toHaveBeenCalledWith([]);
    expect(setActiveRestorePointId).toHaveBeenCalledWith(null);
    expect(setSaveStatusLabel).toHaveBeenCalledWith(
      "Project opened from account"
    );
    expect(
      JSON.parse(localStorage.getItem("trackdraw-project-project-2") ?? "null")
    ).toMatchObject({
      id: "project-2",
      title: "Cloud race layout",
    });
  });

  it("keeps a conflicted account project as a separate local copy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";
    design.updatedAt = "2026-04-20T10:30:00.000Z";
    saveProject(design);
    const replaceDesign = vi.fn();
    const setProjects = vi.fn();
    const setRestorePoints = vi.fn();
    const setActiveRestorePointId = vi.fn();
    const setSaveStatusLabel = vi.fn();

    const { result } = renderAccountProjectSync({
      authUserId: "user-1",
      design,
      replaceDesign,
      setProjects,
      setRestorePoints,
      setActiveRestorePointId,
      setSaveStatusLabel,
    });

    act(() => {
      result.current.handleKeepLocalConflictCopy();
    });

    expect(replaceDesign).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "local-copy-id",
        title: "Race day layout (local copy)",
        createdAt: "2026-04-20T12:00:00.000Z",
        updatedAt: "2026-04-20T12:00:00.000Z",
      })
    );
    expect(localStorage.getItem("trackdraw-project-project-1")).toBeNull();
    expect(
      JSON.parse(
        localStorage.getItem("trackdraw-project-local-copy-id") ?? "null"
      )
    ).toMatchObject({
      id: "local-copy-id",
      title: "Race day layout (local copy)",
    });
    expect(setProjects).toHaveBeenCalled();
    expect(setRestorePoints).toHaveBeenCalledWith([]);
    expect(setActiveRestorePointId).toHaveBeenCalledWith(null);
    expect(setSaveStatusLabel).toHaveBeenCalledWith("Kept as local copy");
    expect(result.current.projectSyncMetaById["local-copy-id"]).toMatchObject({
      status: "local-only",
      lastSyncedAt: null,
    });
  });

  describe("auto-promote", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.mocked(toast.error).mockClear();
    });

    it("auto-promotes a brand-new signed-in draft with meaningful content", async () => {
      const design = createDefaultDesign();
      design.id = "draft-1";
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, init?: RequestInit) => {
          if (init?.method === "POST") {
            return Response.json({
              ok: true,
              project: {
                id: design.id,
                title: design.title,
                updatedAt: "2026-04-20T10:30:00.000Z",
                designUpdatedAt: design.updatedAt,
                shapeCount: 0,
              },
            });
          }

          return Response.json({ ok: true, projects: [] });
        }
      );
      vi.stubGlobal("fetch", fetchMock);

      const { result } = renderAccountProjectSync({
        authUserId: "user-1",
        design,
        projects: [],
        initialized: true,
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      const postCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input) === "/api/projects" && init?.method === "POST"
      );
      expect(postCall).toBeDefined();
      expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
        projectId: "draft-1",
      });
      expect(result.current.isAccountProject).toBe(true);
    });

    it("does not auto-promote a design that was already a local project before this session", async () => {
      const design = createDefaultDesign();
      design.id = "existing-local-1";
      const existingProject: ProjectMeta = {
        id: design.id,
        title: design.title,
        updatedAt: design.updatedAt,
        createdAt: design.createdAt,
        shapeCount: 0,
      };
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
          Response.json({ ok: true, projects: [] })
      );
      vi.stubGlobal("fetch", fetchMock);

      renderAccountProjectSync({
        authUserId: "user-1",
        design,
        projects: [existingProject],
        initialized: true,
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      const postCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "POST"
      );
      expect(postCall).toBeUndefined();
    });

    it("does not auto-promote while an interaction is in progress", async () => {
      const design = createDefaultDesign();
      design.id = "draft-2";
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
          Response.json({ ok: true, projects: [] })
      );
      vi.stubGlobal("fetch", fetchMock);

      renderAccountProjectSync({
        authUserId: "user-1",
        design,
        projects: [],
        initialized: true,
        interactionSessionDepth: 1,
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      const postCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "POST"
      );
      expect(postCall).toBeUndefined();
    });

    it("degrades gracefully and only attempts once when auto-promote fails", async () => {
      const design = createDefaultDesign();
      design.id = "draft-3";
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, init?: RequestInit) => {
          if (init?.method === "POST") {
            return Response.json(
              { ok: false, error: "Network unavailable" },
              { status: 500 }
            );
          }

          return Response.json({ ok: true, projects: [] });
        }
      );
      vi.stubGlobal("fetch", fetchMock);

      const baseOptions: HookOptions = {
        authUserId: "user-1",
        readOnly: false,
        design,
        projectManagerOpen: false,
        historyPaused: false,
        interactionSessionDepth: 0,
        projects: [],
        initialized: true,
        snapshotCurrentDesign: vi.fn(),
        replaceDesign: vi.fn(),
        setProjects: vi.fn(),
        setRestorePoints: vi.fn(),
        setActiveRestorePointId: vi.fn(),
        setSaveStatusLabel: vi.fn(),
      };

      const { result, rerender } = renderHook(
        (currentDesign: TrackDesign) =>
          useAccountProjectSync({ ...baseOptions, design: currentDesign }),
        { initialProps: design }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
      ).toHaveLength(1);
      expect(
        JSON.parse(
          localStorage.getItem(`trackdraw-project-${design.id}`) ?? "null"
        )
      ).toMatchObject({ id: design.id });
      expect(toast.error).toHaveBeenCalledWith(
        "Account sync failed",
        expect.objectContaining({
          action: expect.objectContaining({ label: "Retry" }),
        })
      );
      expect(result.current.projectSyncMetaById[design.id]).toMatchObject({
        status: "failed",
      });

      const editedDesign: TrackDesign = {
        ...design,
        updatedAt: "2026-04-20T11:00:00.000Z",
      };
      rerender(editedDesign);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
      ).toHaveLength(1);
    });
  });
});
