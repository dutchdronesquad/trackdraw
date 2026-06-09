// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryStorage,
  createThrowingStorage,
  installWindowStorage,
} from "../helpers/storage";

let restoreStorage: (() => void) | null = null;
function setStorage(impl: Storage) {
  restoreStorage = installWindowStorage(impl);
}

const KEY = "test.persistentBoolean";

describe("usePersistentBoolean", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    restoreStorage?.();
    restoreStorage = null;
    vi.restoreAllMocks();
  });

  it("initialises to false by default when nothing stored", async () => {
    setStorage(createMemoryStorage());
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY));
    expect(result.current[0]).toBe(false);
  });

  it("initialises to the provided defaultValue", async () => {
    setStorage(createMemoryStorage());
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY, true));
    expect(result.current[0]).toBe(true);
  });

  it("reads a stored 'true' value from localStorage", async () => {
    setStorage(createMemoryStorage({ [KEY]: "true" }));
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY));
    expect(result.current[0]).toBe(true);
  });

  it("reads a stored 'false' value, overriding a true defaultValue", async () => {
    setStorage(createMemoryStorage({ [KEY]: "false" }));
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY, true));
    expect(result.current[0]).toBe(false);
  });

  it("ignores unrecognised stored strings and falls back to defaultValue", async () => {
    setStorage(createMemoryStorage({ [KEY]: "yes" }));
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY, true));
    expect(result.current[0]).toBe(true);
  });

  it("persists a true value to localStorage when state changes", async () => {
    const storage = createMemoryStorage();
    setStorage(storage);
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY));

    await act(async () => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(storage.getItem(KEY)).toBe("true");
  });

  it("persists a false value to localStorage when state changes", async () => {
    const storage = createMemoryStorage({ [KEY]: "true" });
    setStorage(storage);
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY));

    await act(async () => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(storage.getItem(KEY)).toBe("false");
  });

  it("keeps in-memory state working when localStorage.setItem throws", async () => {
    const storage = createMemoryStorage();
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });
    setStorage(storage);
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY));

    await act(async () => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
  });

  it("returns the defaultValue when localStorage.getItem throws", async () => {
    setStorage(createThrowingStorage());
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY, true));
    expect(result.current[0]).toBe(true);
  });
});
