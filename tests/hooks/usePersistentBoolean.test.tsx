// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "localStorage"
);

function createMapStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

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

function setStorage(impl: Storage) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: impl,
  });
}

function restoreStorage() {
  if (originalLocalStorageDescriptor) {
    Object.defineProperty(
      window,
      "localStorage",
      originalLocalStorageDescriptor
    );
  }
}

const KEY = "test.persistentBoolean";

describe("usePersistentBoolean", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    restoreStorage();
    vi.restoreAllMocks();
  });

  it("initialises to false by default when nothing stored", async () => {
    setStorage(createMapStorage());
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY));
    expect(result.current[0]).toBe(false);
  });

  it("initialises to the provided defaultValue", async () => {
    setStorage(createMapStorage());
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY, true));
    expect(result.current[0]).toBe(true);
  });

  it("reads a stored 'true' value from localStorage", async () => {
    setStorage(createMapStorage({ [KEY]: "true" }));
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY));
    expect(result.current[0]).toBe(true);
  });

  it("reads a stored 'false' value, overriding a true defaultValue", async () => {
    setStorage(createMapStorage({ [KEY]: "false" }));
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY, true));
    expect(result.current[0]).toBe(false);
  });

  it("ignores unrecognised stored strings and falls back to defaultValue", async () => {
    setStorage(createMapStorage({ [KEY]: "yes" }));
    const { usePersistentBoolean } =
      await import("@/hooks/usePersistentBoolean");
    const { result } = renderHook(() => usePersistentBoolean(KEY, true));
    expect(result.current[0]).toBe(true);
  });

  it("persists a true value to localStorage when state changes", async () => {
    const storage = createMapStorage();
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
    const storage = createMapStorage({ [KEY]: "true" });
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
    const storage = createMapStorage();
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
