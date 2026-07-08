// @vitest-environment happy-dom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryStorage,
  createThrowingStorage,
  installWindowStorage,
} from "../helpers/storage";

const useSessionMock = vi.fn();
const signOutMock = vi.fn();
const deleteUserMock = vi.fn();
const updateUserMock = vi.fn();
const magicLinkMock = vi.fn();
const magicLinkVerifyMock = vi.fn();
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
    magicLink: {
      verify: magicLinkVerifyMock,
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
    magicLinkVerifyMock.mockResolvedValue({ data: {}, error: null });

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

  it("omits duplicate new-user callback URLs from magic-link sign-in", async () => {
    const { authClient } = await import("@/lib/auth-client");

    await authClient.signIn.magicLink({
      email: "pilot@trackdraw.local",
      callbackURL: "/studio/2/project-1",
      newUserCallbackURL: "/studio/2/project-1",
    });

    expect(magicLinkMock).toHaveBeenCalledWith({
      email: "pilot@trackdraw.local",
      callbackURL: "/studio/2/project-1",
    });
  });

  it("keeps distinct new-user callback URLs for magic-link sign-in", async () => {
    const { authClient } = await import("@/lib/auth-client");

    await authClient.signIn.magicLink({
      email: "pilot@trackdraw.local",
      callbackURL: "/studio",
      newUserCallbackURL: "/studio/2/project-1",
    });

    expect(magicLinkMock).toHaveBeenCalledWith({
      email: "pilot@trackdraw.local",
      callbackURL: "/studio",
      newUserCallbackURL: "/studio/2/project-1",
    });
  });

  it("tracks recent magic-link requests for same-browser handoff", async () => {
    const {
      canAutoVerifyMagicLink,
      clearMagicLinkRequestMarker,
      markMagicLinkRequested,
    } = await import("@/lib/auth-client");

    expect(canAutoVerifyMagicLink("/studio")).toBe(false);

    markMagicLinkRequested("/studio");

    expect(canAutoVerifyMagicLink("/studio")).toBe(true);
    expect(canAutoVerifyMagicLink(null)).toBe(true);
    expect(canAutoVerifyMagicLink("/gallery")).toBe(false);

    clearMagicLinkRequestMarker();

    expect(canAutoVerifyMagicLink("/studio")).toBe(false);
  });

  it("keeps magic-link sign-in usable when browser storage is unavailable", async () => {
    restoreStorage?.();
    restoreStorage = installWindowStorage(createThrowingStorage());
    const {
      canAutoVerifyMagicLink,
      clearMagicLinkRequestMarker,
      markMagicLinkRequested,
    } = await import("@/lib/auth-client");

    expect(() => markMagicLinkRequested("/studio")).not.toThrow();
    expect(canAutoVerifyMagicLink("/studio")).toBe(false);
    expect(() => clearMagicLinkRequestMarker()).not.toThrow();
  });

  it("verifies magic links through Better Auth without forwarding redirect URLs", async () => {
    const { authClient } = await import("@/lib/auth-client");

    await authClient.magicLink.verify({
      token: "token-1",
      callbackURL: "/studio/2/project-1",
      newUserCallbackURL: "/welcome",
      errorCallbackURL: "/login",
    });

    expect(magicLinkVerifyMock).toHaveBeenCalledWith({
      query: {
        token: "token-1",
      },
    });
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
