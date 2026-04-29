import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/api-keys", () => ({
  getApiIdentityFromBearerKey: vi.fn(),
}));

import {
  apiListSuccess,
  apiProblem,
  apiSuccess,
  authenticateApiRequest,
} from "@/lib/server/api-v1";
import { getApiIdentityFromBearerKey } from "@/lib/server/api-keys";

describe("v1 API response helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("wraps successful responses with API metadata", async () => {
    const response = apiSuccess({ type: "example" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { type: "example" },
      meta: { api_version: "v1" },
    });
  });

  it("wraps list responses with pagination and API metadata", async () => {
    const response = apiListSuccess([{ id: "project-1" }], {
      limit: 50,
      next_cursor: null,
      has_more: false,
    });

    await expect(response.json()).resolves.toEqual({
      data: [{ id: "project-1" }],
      pagination: {
        limit: 50,
        next_cursor: null,
        has_more: false,
      },
      meta: { api_version: "v1" },
    });
  });

  it("returns compact problem details without request ids or problem URLs", async () => {
    const response = apiProblem({
      status: 401,
      code: "unauthorized",
      title: "Unauthorized",
      detail: "A valid API bearer key is required.",
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json"
    );
    await expect(response.json()).resolves.toEqual({
      title: "Unauthorized",
      status: 401,
      detail: "A valid API bearer key is required.",
      code: "unauthorized",
    });
  });

  it("passes permissions into bearer-key verification", async () => {
    const identity = {
      user: { id: "user-1", email: null, name: "Race Director" },
      key: {},
    };
    vi.mocked(getApiIdentityFromBearerKey).mockResolvedValue({
      ok: true,
      identity,
    } as never);

    const result = await authenticateApiRequest(
      new Request("http://localhost/api/v1/projects", {
        headers: { authorization: "Bearer td_test" },
      }),
      { tracks: ["read"] }
    );

    expect(result).toEqual({ ok: true, identity });
    expect(getApiIdentityFromBearerKey).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      permissions: { tracks: ["read"] },
    });
  });

  it("returns stable 429 errors for throttled API keys", async () => {
    vi.mocked(getApiIdentityFromBearerKey).mockResolvedValue({
      ok: false,
      status: 429,
      code: "rate_limited",
      detail: "Too many requests for this API key. Try again later.",
      retryAfterSeconds: 2,
    });

    const result = await authenticateApiRequest(
      new Request("http://localhost/api/v1/projects")
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected authentication to fail");
    }

    expect(result.response.status).toBe(429);
    expect(result.response.headers.get("retry-after")).toBe("2");
    await expect(result.response.json()).resolves.toEqual({
      title: "Too Many Requests",
      status: 429,
      detail: "Too many requests for this API key. Try again later.",
      code: "rate_limited",
    });
  });
});
