// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEditorHints } from "@/hooks/editor/useEditorHints";
import { createMemoryStorage, installWindowStorage } from "../helpers/storage";

let restoreStorage: (() => void) | null = null;

describe("useEditorHints", () => {
  beforeEach(() => {
    restoreStorage = installWindowStorage(createMemoryStorage());
  });

  afterEach(() => {
    cleanup();
    restoreStorage?.();
    restoreStorage = null;
  });

  it("persists dismissed hints and can reset guided hints", () => {
    const { result } = renderHook(() =>
      useEditorHints({ readOnly: false, hasPath: false })
    );

    act(() => {
      result.current.dismissGateHint();
      result.current.dismissDesktopPathHint();
      result.current.dismissReview3DHint();
    });

    expect(result.current.gateHintDismissed).toBe(true);
    expect(result.current.desktopPathHintDismissed).toBe(true);
    expect(result.current.review3DHintDismissed).toBe(true);
    expect(localStorage.getItem("trackdraw-hint-gate-dismissed")).toBe("true");

    act(() => {
      result.current.resetGuidedHints();
    });

    expect(result.current.gateHintDismissed).toBe(false);
    expect(result.current.desktopPathHintDismissed).toBe(false);
    expect(result.current.review3DHintDismissed).toBe(false);
    expect(localStorage.getItem("trackdraw-hint-gate-dismissed")).toBeNull();
  });

  it("shows the post-path nudge only when editing completes a path", () => {
    const { result, rerender } = renderHook(
      ({ readOnly, hasPath }) => useEditorHints({ readOnly, hasPath }),
      { initialProps: { readOnly: false, hasPath: false } }
    );

    expect(result.current.showPostPathNudge).toBe(false);

    rerender({ readOnly: false, hasPath: true });

    expect(result.current.showPostPathNudge).toBe(true);

    act(() => {
      result.current.dismissPostPathNudge();
    });

    expect(result.current.postPathNudgeDismissed).toBe(true);
    expect(localStorage.getItem("trackdraw-hint-post-path-dismissed")).toBe(
      "true"
    );
  });
});
