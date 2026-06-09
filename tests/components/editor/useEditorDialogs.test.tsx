// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEditorDialogs } from "@/components/editor/useEditorDialogs";

describe("useEditorDialogs", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("opens the new project dialog immediately on desktop", () => {
    const setMobileToolsOpen = vi.fn();
    const { result } = renderHook(() =>
      useEditorDialogs({ isMobile: false, setMobileToolsOpen })
    );

    act(() => {
      result.current.openNewProjectDialog();
    });

    expect(result.current.newProjectOpen).toBe(true);
    expect(setMobileToolsOpen).not.toHaveBeenCalled();
  });

  it("closes mobile tools before opening the new project dialog after the drawer delay", () => {
    vi.useFakeTimers();
    const setMobileToolsOpen = vi.fn();
    const { result } = renderHook(() =>
      useEditorDialogs({ isMobile: true, setMobileToolsOpen })
    );

    act(() => {
      result.current.openNewProjectDialog();
    });

    expect(setMobileToolsOpen).toHaveBeenCalledWith(false);
    expect(result.current.newProjectOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(result.current.newProjectOpen).toBe(true);
  });

  it("cancels pending mobile new-project timers on unmount", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { result, unmount } = renderHook(() =>
      useEditorDialogs({ isMobile: true, setMobileToolsOpen: vi.fn() })
    );

    act(() => {
      result.current.openNewProjectDialog();
    });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
