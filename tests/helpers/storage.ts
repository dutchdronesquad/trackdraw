import { vi } from "vitest";

type MemoryStorageOptions = {
  failSetKey?: string;
};

export function createMemoryStorageController(
  initial: Record<string, string> = {},
  options: MemoryStorageOptions = {}
) {
  const store = new Map<string, string>(Object.entries(initial));
  let failWrites = false;

  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (failWrites || key === options.failSetKey) {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      store.set(key, value);
    }),
  };

  return {
    storage,
    setFailWrites(value: boolean) {
      failWrites = value;
    },
  };
}

export function createMemoryStorage(
  initial: Record<string, string> = {},
  options: MemoryStorageOptions = {}
) {
  return createMemoryStorageController(initial, options).storage;
}

export function createThrowingStorage(): Storage {
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

export function installWindowStorage(storage: Storage) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "localStorage"
  );

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window, "localStorage", originalDescriptor);
    } else {
      Reflect.deleteProperty(window, "localStorage");
    }
  };
}
