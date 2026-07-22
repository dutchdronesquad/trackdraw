// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import * as en from "@lang/en";
import { useEditorProjects } from "@/hooks/editor/useEditorProjects";
import { createDefaultDesign } from "@/lib/track/design";
import { encodeDesign } from "@/lib/share";
import {
  createRestorePoint,
  listRestorePointsForProject,
  saveProject,
} from "@/lib/projects";
import { useEditor } from "@/store/editor";
import {
  createMemoryStorage,
  createMemoryStorageController,
} from "../helpers/storage";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const render = (callback: () => ReturnType<typeof useEditorProjects>) =>
  renderHook(callback, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={en}>
        {children}
      </NextIntlClientProvider>
    ),
  });

describe("useEditorProjects", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:30:00.000Z"));
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("surfaces local autosave failures and lets the user retry", () => {
    const localStorageMock = createMemoryStorageController();
    localStorageMock.setFailWrites(true);
    vi.stubGlobal("localStorage", localStorageMock.storage);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";

    const { result } = render(() =>
      useEditorProjects({
        readOnly: false,
        design,
        historyPaused: false,
        interactionSessionDepth: 0,
        replaceDesign: vi.fn(),
      })
    );

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.saveStatusLabel).toBe("Local autosave failed");
    expect(toast.error).toHaveBeenCalledWith(
      "Local autosave failed",
      expect.objectContaining({
        description:
          "The latest edits are still on the canvas, but TrackDraw could not save a local copy. Retry now, or export a JSON backup before leaving this browser.",
        action: expect.objectContaining({ label: "Retry" }),
      })
    );

    const saveFailureToast = vi
      .mocked(toast.error)
      .mock.calls.find(([message]) => message === "Local autosave failed");
    const retryAction = (
      saveFailureToast?.[1] as { action?: { onClick?: () => void } } | undefined
    )?.action;

    const latestDesign = createDefaultDesign();
    latestDesign.id = "project-1";
    latestDesign.title = "Updated race layout";
    useEditor.getState().replaceDesign(latestDesign);

    localStorageMock.setFailWrites(false);
    act(() => {
      retryAction?.onClick?.();
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Local autosave recovered",
      expect.any(Object)
    );
    expect(result.current.saveStatusLabel).toContain("Saved locally at");
    expect(localStorage.getItem("trackdraw-project-project-1")).toContain(
      "Updated race layout"
    );
  });

  it("opens shared links as a new editable local copy", () => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    const sharedDesign = createDefaultDesign();
    sharedDesign.id = "account-project-1";
    sharedDesign.title = "Shared race layout";
    sharedDesign.createdAt = "2026-05-10T10:00:00.000Z";
    sharedDesign.updatedAt = "2026-05-10T10:30:00.000Z";
    const replaceDesign = vi.fn();
    const onSeedTokenImported = vi.fn();

    const { result } = render(() =>
      useEditorProjects({
        readOnly: false,
        seedToken: encodeDesign(sharedDesign),
        design: createDefaultDesign(),
        historyPaused: false,
        interactionSessionDepth: 0,
        replaceDesign,
        onSeedTokenImported,
      })
    );

    expect(replaceDesign).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Copy of Shared race layout",
        createdAt: "2026-05-17T12:30:00.000Z",
        updatedAt: "2026-05-17T12:30:00.000Z",
      })
    );
    const copiedDesign = replaceDesign.mock.calls[0]?.[0];
    expect(copiedDesign?.id).not.toBe("account-project-1");
    expect(onSeedTokenImported).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("trackdraw-design")).toContain(
      "Copy of Shared race layout"
    );
    expect(
      localStorage.getItem(`trackdraw-project-${copiedDesign?.id}`)
    ).toContain("Copy of Shared race layout");
    expect(result.current.saveStatusLabel).toBe("Editable copy created");
    expect(result.current.restorePoints).toEqual([]);
  });

  it("opens a saved project after snapshotting the current meaningful design", () => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    const activeDesign = createDefaultDesign();
    activeDesign.id = "active-project";
    activeDesign.title = "Active race layout";
    const savedDesign = createDefaultDesign();
    savedDesign.id = "saved-project";
    savedDesign.title = "Saved race layout";
    saveProject(savedDesign);
    const replaceDesign = vi.fn();

    const { result } = render(() =>
      useEditorProjects({
        readOnly: false,
        design: activeDesign,
        historyPaused: false,
        interactionSessionDepth: 0,
        replaceDesign,
      })
    );

    act(() => {
      result.current.handleOpenProject("saved-project");
    });

    expect(replaceDesign).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "saved-project",
        title: "Saved race layout",
      })
    );
    expect(localStorage.getItem("trackdraw-project-active-project")).toContain(
      "Active race layout"
    );
    expect(listRestorePointsForProject("active-project")).toHaveLength(1);
    expect(result.current.restorePoints).toEqual([]);
    expect(result.current.activeRestorePointId).toBeNull();
    expect(result.current.saveStatusLabel).toBe("Project opened");
  });

  it("restores a snapshot and marks it as the active restore point", () => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";
    const restorePoint = createRestorePoint(design);
    const replaceDesign = vi.fn();

    const { result } = render(() =>
      useEditorProjects({
        readOnly: false,
        design,
        historyPaused: false,
        interactionSessionDepth: 0,
        replaceDesign,
      })
    );

    act(() => {
      result.current.handleRestorePoint(restorePoint.id);
    });

    expect(replaceDesign).toHaveBeenCalledWith(
      expect.objectContaining({ id: "project-1", title: "Race day layout" })
    );
    expect(result.current.restorePoints).toEqual([
      expect.objectContaining({ id: restorePoint.id }),
    ]);
    expect(result.current.activeRestorePointId).toBe(restorePoint.id);
    expect(result.current.saveStatusLabel).toBe("Restored from snapshot");
  });

  it("renames the active project through the editor store and clears restore points when deleting it", () => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Original title";
    saveProject(design);
    createRestorePoint(design);
    useEditor.getState().replaceDesign(design);

    const { result } = render(() =>
      useEditorProjects({
        readOnly: false,
        design,
        historyPaused: false,
        interactionSessionDepth: 0,
        replaceDesign: vi.fn(),
      })
    );

    act(() => {
      result.current.handleRenameProject("project-1", "Renamed layout");
    });

    expect(useEditor.getState().track.design.title).toBe("Renamed layout");
    expect(localStorage.getItem("trackdraw-project-project-1")).toContain(
      "Renamed layout"
    );

    act(() => {
      result.current.handleDeleteProject("project-1");
    });

    expect(localStorage.getItem("trackdraw-project-project-1")).toBeNull();
    expect(result.current.restorePoints).toEqual([]);
  });
});
