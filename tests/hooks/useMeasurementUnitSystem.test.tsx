// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "localStorage"
);

function createThrowingStorage(): Storage {
  return {
    get length() {
      return 0;
    },
    clear: vi.fn(),
    getItem: vi.fn(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    }),
    key: vi.fn(() => null),
    removeItem: vi.fn(),
    setItem: vi.fn(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    }),
  };
}

describe("useMeasurementUnitSystem", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createThrowingStorage(),
    });
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["nl-NL"],
    });
  });

  afterEach(() => {
    cleanup();
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        window,
        "localStorage",
        originalLocalStorageDescriptor
      );
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps unit changes responsive when localStorage is unavailable", async () => {
    const { useMeasurementUnitSystem } =
      await import("@/hooks/useMeasurementUnitSystem");
    const { result } = renderHook(() => useMeasurementUnitSystem());

    expect(result.current.unitSystem).toBe("metric");

    act(() => {
      result.current.setUnitSystem("imperial");
    });

    expect(result.current.unitSystem).toBe("imperial");
  });
});
