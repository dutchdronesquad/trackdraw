// @vitest-environment happy-dom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useSessionMock = vi.fn();
const signOutMock = vi.fn();
const deleteUserMock = vi.fn();
const updateUserMock = vi.fn();
const magicLinkMock = vi.fn();
const passkeySignInMock = vi.fn();
const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "localStorage"
);

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => {
      store.clear();
    }),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

vi.mock("@better-auth/passkey/client", () => ({
  passkeyClient: vi.fn(() => ({})),
}));

vi.mock("better-auth/client/plugins", () => ({
  magicLinkClient: vi.fn(() => ({})),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    useSession: useSessionMock,
    signOut: signOutMock,
    deleteUser: deleteUserMock,
    updateUser: updateUserMock,
    signIn: {
      magicLink: magicLinkMock,
      passkey: passkeySignInMock,
    },
  })),
}));

describe("authClient session resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });

    useSessionMock.mockReturnValue({
      data: {
        session: { id: "session-1" },
        user: {
          id: "user-1",
          email: "pilot@trackdraw.local",
          name: "Pilot",
          image: null,
        },
      },
      isPending: false,
      error: null,
    });

    signOutMock.mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue(undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          user: { role: "admin" },
        }),
      }))
    );
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
  });

  it("dedupes role resolution across concurrent useSession calls", async () => {
    const { authClient } = await import("@/lib/auth-client");

    const first = renderHook(() => authClient.useSession());
    const second = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(first.result.current.data?.user.role).toBe("admin");
      expect(second.result.current.data?.user.role).toBe("admin");
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reuses the resolved role cache for later mounts", async () => {
    const { authClient } = await import("@/lib/auth-client");

    const first = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(first.result.current.data?.user.role).toBe("admin");
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    const second = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(second.result.current.data?.user.role).toBe("admin");
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears the resolved role cache on signOut", async () => {
    const { authClient } = await import("@/lib/auth-client");

    const first = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(first.result.current.data?.user.role).toBe("admin");
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await authClient.signOut();

    const second = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(second.result.current.data?.user.role).toBe("admin");
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("clears the resolved role cache on deleteUser", async () => {
    const { authClient } = await import("@/lib/auth-client");

    const first = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(first.result.current.data?.user.role).toBe("admin");
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await authClient.deleteUser();

    const second = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(second.result.current.data?.user.role).toBe("admin");
    });

    expect(deleteUserMock).toHaveBeenCalledWith({
      callbackURL: "/studio",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
