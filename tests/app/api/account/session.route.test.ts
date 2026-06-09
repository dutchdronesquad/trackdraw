import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

import { GET } from "@/app/api/account/session/route";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { testUser } from "../../../helpers/api-routes";

describe("account session API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the resolved user when a valid browser session exists", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(testUser);

    const response = await GET(
      new Request("http://localhost/api/account/session", {
        headers: { cookie: "better-auth.session_token=signed" },
      })
    );

    expect(getCurrentUserFromHeaders).toHaveBeenCalledWith(expect.any(Headers));
    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: testUser,
    });
  });

  it("returns a null user for anonymous browser sessions", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/account/session")
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: null,
    });
  });

  it("surfaces session resolver failures as a 500 response", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockRejectedValue(
      new Error("D1 unavailable")
    );

    const response = await GET(
      new Request("http://localhost/api/account/session")
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "D1 unavailable",
    });
  });
});
