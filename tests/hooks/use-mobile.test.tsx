// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsTouchDevice } from "@/hooks/use-mobile";

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

function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  let listener: ((event: { matches: boolean }) => void) | null = null;

  const mql: MediaQueryListMock = {
    get matches() {
      return matches;
    },
    media: "(pointer: coarse)",
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

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql)
  );

  return mql;
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

  it("stays true across a width change that would flip useIsMobile (e.g. rotation)", () => {
    const mql = stubMatchMedia(true);
    const { result } = renderHook(() => useIsTouchDevice());

    act(() => {
      mql.fireChange(true);
    });

    expect(result.current).toBe(true);
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
