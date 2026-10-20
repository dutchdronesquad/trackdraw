import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/[...all]/route";
import { getAuth } from "@/lib/server/auth";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ getAuth: vi.fn() }));
const handler = vi.fn(async (request: Request) =>
  Response.json({ body: await request.text() })
);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuth).mockResolvedValue({ handler } as never);
});
describe("OAuth HTTP request boundaries", () => {
  it("passes a bounded form body unchanged to the provider", async () => {
    const response = await POST(
      new Request("https://trackdraw.app/api/auth/oauth2/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "grant_type=authorization_code&code=fixture",
      })
    );
    expect(await response.json()).toEqual({
      body: "grant_type=authorization_code&code=fixture",
    });
  });
  it("rejects an oversized registration before instantiating the provider", async () => {
    const response = await POST(
      new Request("https://trackdraw.app/api/auth/oauth2/register", {
        method: "POST",
        body: "x".repeat(16385),
      })
    );
    expect(response.status).toBe(413);
    expect(getAuth).not.toHaveBeenCalled();
  });
  it("does not expose OAuth exceptions containing credentials", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    handler.mockRejectedValueOnce(new Error("private-refresh-token"));
    const response = await POST(
      new Request("https://trackdraw.app/api/auth/oauth2/token", {
        method: "POST",
        body: "grant_type=refresh_token",
      })
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private-refresh-token");
    expect(log).toHaveBeenCalledWith(
      "[TrackDraw OAuth] Authentication request failed"
    );
  });
});
