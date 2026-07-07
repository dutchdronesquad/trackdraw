// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useManualProjectSave } from "@/components/editor/useManualProjectSave";
import { AccountProjectSyncConflictError } from "@/components/editor/useAccountProjectSync";
import { createDefaultDesign } from "@/lib/track/design";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

function renderManualSave(
  overrides: Partial<Parameters<typeof useManualProjectSave>[0]> = {}
) {
  const design = createDefaultDesign();
  design.id = "project-1";

  const options = {
    readOnly: false,
    design,
    isAccountProject: true,
    currentProjectSyncMeta: { status: "synced" as const },
    handleSaveSnapshot: vi.fn(),
    syncDesignToAccount: vi.fn(async () => undefined),
    markProjectSyncFailed: vi.fn(),
    setSaveStatusLabel: vi.fn(),
    ...overrides,
  };

  return {
    options,
    ...renderHook(() => useManualProjectSave(options)),
  };
}

describe("useManualProjectSave", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("snapshots and syncs account projects on manual save", async () => {
    const { result, options } = renderManualSave();

    await act(async () => {
      await result.current.handleManualSave();
    });

    expect(options.handleSaveSnapshot).toHaveBeenCalledOnce();
    expect(options.syncDesignToAccount).toHaveBeenCalledWith(options.design, {
      updateStatusLabel: true,
    });
  });

  it("only snapshots read-only, local-only, or conflicted projects", async () => {
    const { result, options } = renderManualSave({
      currentProjectSyncMeta: { status: "conflict" },
    });

    await act(async () => {
      await result.current.handleManualSave();
    });

    expect(options.handleSaveSnapshot).toHaveBeenCalledOnce();
    expect(options.syncDesignToAccount).not.toHaveBeenCalled();
  });

  it("marks cloud sync failures after saving a snapshot", async () => {
    const syncError = new Error("D1 unavailable");
    const { result, options } = renderManualSave({
      syncDesignToAccount: vi.fn(async () => {
        throw syncError;
      }),
    });

    await act(async () => {
      await result.current.handleManualSave();
    });

    expect(options.markProjectSyncFailed).toHaveBeenCalledWith(
      "project-1",
      "D1 unavailable"
    );
    expect(options.setSaveStatusLabel).toHaveBeenCalledWith(
      "Account sync failed; snapshot saved"
    );
    expect(toast.error).toHaveBeenCalledWith("Account sync failed", {
      description:
        "TrackDraw saved a snapshot on this device, but could not update the account copy. Retry sync, or export JSON if you need a manual backup.",
    });
  });

  it("uses the review status for version conflicts", async () => {
    const { result, options } = renderManualSave({
      syncDesignToAccount: vi.fn(async () => {
        throw new AccountProjectSyncConflictError({
          projectId: "project-1",
          title: "Race layout",
          localUpdatedAt: "2026-06-09T10:00:00.000Z",
          cloudUpdatedAt: "2026-06-09T10:05:00.000Z",
        });
      }),
    });

    await act(async () => {
      await result.current.handleManualSave();
    });

    expect(options.setSaveStatusLabel).toHaveBeenCalledWith(
      "Review project version"
    );
    expect(options.markProjectSyncFailed).not.toHaveBeenCalled();
  });

  it("handles keyboard save shortcuts outside text inputs", () => {
    const { options } = renderManualSave();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "s",
          metaKey: true,
        })
      );
    });

    expect(options.handleSaveSnapshot).toHaveBeenCalledOnce();

    const input = document.createElement("input");
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "s",
          metaKey: true,
          bubbles: true,
        })
      );
    });

    expect(options.handleSaveSnapshot).toHaveBeenCalledOnce();
    input.remove();
  });
});
