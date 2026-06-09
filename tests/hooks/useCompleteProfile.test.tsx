// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCompleteProfile } from "@/hooks/useCompleteProfile";
import type { AuthUser } from "@/lib/auth-client";

const mocks = vi.hoisted(() => ({
  updateProfileName: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    updateProfileName: mocks.updateProfileName,
  },
}));

const namelessUser: AuthUser = {
  id: "user-1",
  email: "pilot@example.com",
  name: "",
  image: null,
};

describe("useCompleteProfile", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens for signed-in users without a display name and stays dismissed after closing", () => {
    const { result, rerender } = renderHook(
      ({ authUser }) => useCompleteProfile({ readOnly: false, authUser }),
      { initialProps: { authUser: namelessUser } }
    );

    expect(result.current.completeProfileOpen).toBe(true);

    act(() => {
      result.current.handleCompleteProfileOpenChange(false);
    });
    rerender({ authUser: namelessUser });

    expect(result.current.completeProfileOpen).toBe(false);
  });

  it("does not prompt in read-only mode or when the profile already has a name", () => {
    const namedUser = { ...namelessUser, name: "Race Director" };

    const readOnly = renderHook(() =>
      useCompleteProfile({ readOnly: true, authUser: namelessUser })
    );
    const named = renderHook(() =>
      useCompleteProfile({ readOnly: false, authUser: namedUser })
    );

    expect(readOnly.result.current.completeProfileOpen).toBe(false);
    expect(named.result.current.completeProfileOpen).toBe(false);
  });

  it("saves the submitted profile name through the auth client", async () => {
    const { result } = renderHook(() =>
      useCompleteProfile({ readOnly: false, authUser: namelessUser })
    );

    await act(async () => {
      await result.current.handleCompleteProfileSave("Race Director");
    });

    expect(mocks.updateProfileName).toHaveBeenCalledWith("Race Director");
  });
});
