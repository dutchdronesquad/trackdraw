// @vitest-environment happy-dom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage, installWindowStorage } from "../helpers/storage";

const useSessionMock = vi.fn();
const signOutMock = vi.fn();
const deleteUserMock = vi.fn();
const updateUserMock = vi.fn();
const magicLinkMock = vi.fn();
const passkeySignInMock = vi.fn();
let restoreStorage: (() => void) | null = null;

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
    restoreStorage = installWindowStorage(createMemoryStorage());

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
    restoreStorage?.();
    restoreStorage = null;
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

  it("normalizes unexpected account roles from the session endpoint", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        user: { role: "owner" },
      }),
    } as Response);
    const { authClient } = await import("@/lib/auth-client");

    const session = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(session.result.current.data?.user.role).toBe("user");
    });
  });

  it("keeps the browser session visible when account role resolution fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        error: "Session lookup failed",
      }),
    } as Response);
    const { authClient } = await import("@/lib/auth-client");

    const session = renderHook(() => authClient.useSession());

    await waitFor(() => {
      expect(session.result.current.isPending).toBe(false);
      expect(session.result.current.error?.message).toBe(
        "Session lookup failed"
      );
    });
    expect(session.result.current.data).toMatchObject({
      session: { id: "session-1" },
      user: {
        id: "user-1",
        email: "pilot@trackdraw.local",
      },
    });
    expect(session.result.current.data?.user.role).toBeUndefined();
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

  it("trims profile names before updating the Better Auth user", async () => {
    const { authClient } = await import("@/lib/auth-client");

    await authClient.updateProfileName("  Race Director  ");

    expect(updateUserMock).toHaveBeenCalledWith({ name: "Race Director" });
  });

  it("posts normalized email changes with the default studio callback", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { authClient } = await import("@/lib/auth-client");

    await authClient.changeEmail({ newEmail: "  PILOT@EXAMPLE.COM " });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/auth/change-email", window.location.origin),
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEmail: "pilot@example.com",
          callbackURL: "/studio",
        }),
      }
    );
  });
});
