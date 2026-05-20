// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useEditorProjects } from "@/hooks/useEditorProjects";
import { createDefaultDesign } from "@/lib/track/design";
import { encodeDesign } from "@/lib/share";
import { useEditor } from "@/store/editor";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function createMemoryStorage() {
  const store = new Map<string, string>();
  let failWrites = false;

  const storage: Storage = {
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
      if (failWrites) {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      store.set(key, value);
    }),
  };

  return {
    storage,
    setFailWrites(value: boolean) {
      failWrites = value;
    },
  };
}

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
    const localStorageMock = createMemoryStorage();
    localStorageMock.setFailWrites(true);
    vi.stubGlobal("localStorage", localStorageMock.storage);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const design = createDefaultDesign();
    design.id = "project-1";
    design.title = "Race day layout";

    const { result } = renderHook(() =>
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

    expect(result.current.saveStatusLabel).toBe("Local save failed");
    expect(toast.error).toHaveBeenCalledWith(
      "Local save failed",
      expect.objectContaining({
        action: expect.objectContaining({ label: "Retry" }),
      })
    );

    const saveFailureToast = vi
      .mocked(toast.error)
      .mock.calls.find(([message]) => message === "Local save failed");
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
      "Local save recovered",
      expect.any(Object)
    );
    expect(result.current.saveStatusLabel).toContain("Saved locally at");
    expect(localStorage.getItem("trackdraw-project-project-1")).toContain(
      "Updated race layout"
    );
  });

  it("opens shared links as a new editable local copy", () => {
    vi.stubGlobal("localStorage", createMemoryStorage().storage);
    const sharedDesign = createDefaultDesign();
    sharedDesign.id = "account-project-1";
    sharedDesign.title = "Shared race layout";
    sharedDesign.createdAt = "2026-05-10T10:00:00.000Z";
    sharedDesign.updatedAt = "2026-05-10T10:30:00.000Z";
    const replaceDesign = vi.fn();
    const onSeedTokenImported = vi.fn();

    const { result } = renderHook(() =>
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
});
