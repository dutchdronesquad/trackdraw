// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEditorHints } from "@/hooks/editor/useEditorHints";
import { useEditorHintsStore } from "@/store/editor-hints";
import { createMemoryStorage, installWindowStorage } from "../helpers/storage";

const STORAGE_KEY = "trackdraw.editorHints";

let restoreStorage: (() => void) | null = null;

describe("useEditorHints", () => {
  beforeEach(() => {
    restoreStorage = installWindowStorage(createMemoryStorage());
    useEditorHintsStore.setState({
      gateHintDismissed: false,
      desktopPathHintDismissed: false,
      desktopPreviewHintDismissed: false,
      review3DHintDismissed: false,
      postPathNudgeDismissed: false,
    });
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
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      state?: { gateHintDismissed?: boolean };
    };
    expect(stored.state?.gateHintDismissed).toBe(true);

    act(() => {
      result.current.resetGuidedHints();
    });

    expect(result.current.gateHintDismissed).toBe(false);
    expect(result.current.desktopPathHintDismissed).toBe(false);
    expect(result.current.review3DHintDismissed).toBe(false);
    const storedAfterReset = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}"
    ) as { state?: { gateHintDismissed?: boolean } };
    expect(storedAfterReset.state?.gateHintDismissed).toBe(false);
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
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      state?: { postPathNudgeDismissed?: boolean };
    };
    expect(stored.state?.postPathNudgeDismissed).toBe(true);
  });
});
