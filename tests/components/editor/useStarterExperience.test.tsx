// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import * as en from "@lang/en";
import { useStarterExperience } from "@/components/editor/useStarterExperience";
import { AccountProjectSyncConflictError } from "@/components/editor/useAccountProjectSync";
import { createDefaultDesign } from "@/lib/track/design";
import {
  createMemoryStorage,
  installWindowStorage,
} from "../../helpers/storage";

let restoreStorage: (() => void) | null = null;

function renderStarterExperience(
  overrides: Partial<Parameters<typeof useStarterExperience>[0]> = {}
) {
  const design = createDefaultDesign();
  const blankDesign = createDefaultDesign();
  blankDesign.id = "blank-design";

  const options = {
    readOnly: false,
    authUserId: null,
    cloudProjectsAvailable: true,
    design,
    designShapeCount: 0,
    hasPath: false,
    syncDesignToAccount: vi.fn(async () => undefined),
    markProjectSyncFailed: vi.fn(),
    setSaveStatusLabel: vi.fn(),
    replaceDesign: vi.fn(),
    handleTabChange: vi.fn(),
    resetSelectionState: vi.fn(),
    setActiveTool: vi.fn(),
    fitCanvas: vi.fn(),
    closeProjectAndToolSurfaces: vi.fn(),
    createBlankDesign: vi.fn(() => blankDesign),
    ...overrides,
  };

  return {
    options,
    blankDesign,
    ...renderHook(() => useStarterExperience(options), {
      wrapper: ({ children }) => (
        <NextIntlClientProvider locale="en" messages={en}>
          {children}
        </NextIntlClientProvider>
      ),
    }),
  };
}

describe("useStarterExperience", () => {
  beforeEach(() => {
    restoreStorage = installWindowStorage(createMemoryStorage());
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      })
    );
  });

  afterEach(() => {
    cleanup();
    restoreStorage?.();
    restoreStorage = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("applies a guided blank design and prepares gate placement", () => {
    const { result, options, blankDesign } = renderStarterExperience();

    act(() => {
      result.current.applyStarterDesign("gate");
    });

    expect(options.replaceDesign).toHaveBeenCalledWith(blankDesign);
    expect(options.handleTabChange).toHaveBeenCalledWith("2d");
    expect(options.setActiveTool).toHaveBeenCalledWith("gate");
    expect(options.fitCanvas).toHaveBeenCalledOnce();
    expect(result.current.starterDismissed).toBe(true);
    expect(result.current.starterMode).toBe("guided");
  });

  it("applies a starter layout and closes project/tool surfaces", () => {
    const { result, options } = renderStarterExperience();

    act(() => {
      result.current.applyStarterLayout("open-practice");
    });

    expect(options.replaceDesign).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.any(String) })
    );
    expect(options.resetSelectionState).toHaveBeenCalledOnce();
    expect(options.closeProjectAndToolSurfaces).toHaveBeenCalledOnce();
    expect(options.setActiveTool).toHaveBeenCalledWith("select");
    expect(result.current.starterDismissed).toBe(true);
  });

  it("syncs starter designs for signed-in users and reports cloud failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { result, options, blankDesign } = renderStarterExperience({
      authUserId: "user-1",
      syncDesignToAccount: vi.fn(async () => {
        throw new Error("Cloud unavailable");
      }),
    });

    act(() => {
      result.current.applyStarterDesign("blank");
    });
    await Promise.resolve();

    expect(options.syncDesignToAccount).toHaveBeenCalledWith(blankDesign, {
      updateStatusLabel: true,
    });
    expect(options.markProjectSyncFailed).toHaveBeenCalledWith(
      "blank-design",
      "Cloud unavailable"
    );
    expect(options.setSaveStatusLabel).toHaveBeenCalledWith(
      "Account sync failed; saved locally"
    );
    expect(consoleError).toHaveBeenCalledWith(
      "[TrackDraw new-project sync]",
      expect.any(Error)
    );
  });

  it("sets review status when starter sync hits a project version conflict", async () => {
    const { result, options } = renderStarterExperience({
      authUserId: "user-1",
      syncDesignToAccount: vi.fn(async () => {
        throw new AccountProjectSyncConflictError({
          projectId: "blank-design",
          title: "Race layout",
          localUpdatedAt: "2026-06-09T10:00:00.000Z",
          cloudUpdatedAt: "2026-06-09T10:05:00.000Z",
        });
      }),
    });

    act(() => {
      result.current.applyStarterDesign("blank");
    });
    await Promise.resolve();

    expect(options.setSaveStatusLabel).toHaveBeenCalledWith(
      "Review project version"
    );
    expect(options.markProjectSyncFailed).not.toHaveBeenCalled();
  });
});
