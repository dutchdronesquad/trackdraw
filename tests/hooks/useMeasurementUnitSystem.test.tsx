// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryStorage,
  createThrowingStorage,
  installWindowStorage,
} from "../helpers/storage";

let restoreStorage: (() => void) | null = null;

describe("useMeasurementUnitSystem", () => {
  beforeEach(() => {
    vi.resetModules();
    restoreStorage = installWindowStorage(createThrowingStorage());
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["nl-NL"],
    });
  });

  afterEach(() => {
    cleanup();
    restoreStorage?.();
    restoreStorage = null;
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

  it("ignores the removed legacy raw-string format on first load", async () => {
    restoreStorage?.();
    restoreStorage = installWindowStorage(
      createMemoryStorage({ "trackdraw.measurementUnitSystem": "imperial" })
    );

    const { useMeasurementUnitStore } =
      await import("@/store/measurement-unit");
    await useMeasurementUnitStore.persist.rehydrate();

    expect(useMeasurementUnitStore.getState().unitSystem).toBe("metric");
  });
});
