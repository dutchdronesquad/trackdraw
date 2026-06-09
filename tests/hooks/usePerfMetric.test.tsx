// @vitest-environment happy-dom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { getPerfSnapshot, resetPerfMetrics } from "@/lib/perf";

describe("usePerfMetric", () => {
  afterEach(() => {
    cleanup();
    resetPerfMetrics();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("records a non-production render duration on the next animation frame", () => {
    let frameCallback: FrameRequestCallback = () => undefined;
    let now = 100;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 1;
      })
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    renderHook(() => usePerfMetric("editor:panel"));

    now = 116;
    frameCallback?.(116);

    expect(getPerfSnapshot()["editor:panel"]).toMatchObject({
      count: 1,
      lastMs: 16,
    });
  });

  it("cancels the pending animation frame on unmount", () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 42)
    );
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    const { unmount } = renderHook(() => usePerfMetric("editor:panel"));
    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});
