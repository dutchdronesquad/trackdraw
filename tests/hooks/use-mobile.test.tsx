// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile, useIsTouchDevice } from "@/hooks/use-mobile";

type MediaQueryListMock = {
  matches: boolean;
  media: string;
  addEventListener: (
    type: "change",
    listener: (event: { matches: boolean }) => void
  ) => void;
  removeEventListener: (
    type: "change",
    listener: (event: { matches: boolean }) => void
  ) => void;
  fireChange: (matches: boolean) => void;
};

function createMql(media: string, initialMatches: boolean): MediaQueryListMock {
  let matches = initialMatches;
  let listener: ((event: { matches: boolean }) => void) | null = null;

  return {
    get matches() {
      return matches;
    },
    media,
    addEventListener: (_type, cb) => {
      listener = cb;
    },
    removeEventListener: () => {
      listener = null;
    },
    fireChange: (nextMatches: boolean) => {
      matches = nextMatches;
      listener?.({ matches: nextMatches });
    },
  };
}

function stubMatchMedia(initialMatches: boolean) {
  const mql = createMql("(pointer: coarse)", initialMatches);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql)
  );
  return mql;
}

function stubMatchMediaByQuery(mqlsByQuery: Record<string, MediaQueryListMock>) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => mqlsByQuery[query])
  );
}

describe("useIsTouchDevice", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("reflects the initial pointer:coarse match", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useIsTouchDevice());
    expect(result.current).toBe(true);
  });

  it("stays true across a rotation that flips useIsMobile's width-based result", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 400,
    });
    const widthMql = createMql("(max-width: 767px)", true);
    const pointerMql = createMql("(pointer: coarse)", true);
    stubMatchMediaByQuery({
      "(max-width: 767px)": widthMql,
      "(pointer: coarse)": pointerMql,
    });

    const { result } = renderHook(() => ({
      isMobile: useIsMobile(),
      isTouchDevice: useIsTouchDevice(),
    }));
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTouchDevice).toBe(true);

    // Simulate rotating a phone into landscape: it's now wider than the
    // breakpoint (useIsMobile flips), but it's still a touch device.
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 800,
      });
      widthMql.fireChange(false);
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTouchDevice).toBe(true);
  });

  it("updates when the pointer capability actually changes", () => {
    const mql = stubMatchMedia(false);
    const { result } = renderHook(() => useIsTouchDevice());
    expect(result.current).toBe(false);

    act(() => {
      mql.fireChange(true);
    });

    expect(result.current).toBe(true);
  });
});
