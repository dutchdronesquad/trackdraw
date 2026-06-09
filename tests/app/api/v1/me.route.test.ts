import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/api-v1", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/server/api-v1")>();
  return {
    ...actual,
    authenticateApiRequest: vi.fn(),
  };
});

import { GET } from "@/app/api/v1/me/route";
import { authenticateApiRequest } from "@/lib/server/api-v1";

describe("v1 me API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("passes through API authentication failures", async () => {
    const response = NextResponse.json(
      {
        title: "Unauthorized",
        status: 401,
        detail: "Missing bearer token.",
        code: "unauthorized",
      },
      { status: 401 }
    );
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      ok: false,
      response,
    });

    const result = await GET(new Request("http://localhost/api/v1/me"));

    expect(result).toBe(response);
  });

  it("returns the authenticated API identity with normalized permissions", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      ok: true,
      identity: {
        user: {
          id: "user-1",
          email: "pilot@example.com",
          name: "Race Director",
        },
        key: {
          permissions: {
            tracks: ["read", 123],
            admin: "invalid",
          },
          expiresAt: new Date("2026-06-09T12:00:00.000Z"),
        },
      },
    } as never);

    const response = await GET(new Request("http://localhost/api/v1/me"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        type: "api_identity",
        account: {
          id: "user-1",
          name: "Race Director",
        },
        permissions: {
          tracks: ["read"],
        },
        expires_at: "2026-06-09T12:00:00.000Z",
      },
      meta: { api_version: "v1" },
    });
  });
});
