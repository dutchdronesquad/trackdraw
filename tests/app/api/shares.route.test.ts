import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import type { UserShare } from "@/lib/server/shares";
import {
  createStoredProjectFixture,
  createStoredShareFixture,
  jsonRequest,
  testUser,
} from "../../helpers/api-routes";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/csrf", () => ({ isTrustedRequest: vi.fn(() => true) }));

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/projects", () => ({
  getProjectForUser: vi.fn(),
}));

vi.mock("@/lib/server/shares", () => ({
  createShare: vi.fn(),
  getShareByProjectIdForUser: vi.fn(),
  getSharesByUserId: vi.fn(),
}));

import { GET, POST } from "@/app/api/shares/route";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getProjectForUser } from "@/lib/server/projects";
import {
  createShare,
  getShareByProjectIdForUser,
  getSharesByUserId,
} from "@/lib/server/shares";

function postRequest(body: unknown) {
  return jsonRequest("http://localhost/api/shares", "POST", body);
}

describe("shares API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates anonymous temporary shares with requested expiry", async () => {
    const design = createDefaultDesign();
    const share = createStoredShareFixture({
      expiresAt: "2026-05-02T12:00:00.000Z",
    });
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
    vi.mocked(createShare).mockResolvedValue(share);

    const response = await POST(
      postRequest({ design, view: "3d", expiresInDays: 7 })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      share: {
        token: "share-token",
        path: "/share/share-token?view=3d",
        expiresAt: "2026-05-02T12:00:00.000Z",
        ownerUserId: null,
        projectId: null,
        shareType: "temporary",
      },
    });
    expect(createShare).toHaveBeenCalledWith(
      expect.objectContaining({ id: design.id }),
      {
        expiresInDays: 7,
        ownerUserId: null,
        projectId: null,
      }
    );
  });

  it("creates authenticated project shares as published links and ignores expiry input", async () => {
    const design = createDefaultDesign();
    const share = createStoredShareFixture({
      expiresAt: null,
      ownerUserId: testUser.id,
      projectId: "project-1",
      shareType: "published",
    });
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(testUser);
    vi.mocked(getProjectForUser).mockResolvedValue(
      createStoredProjectFixture({
        title: "Project",
        design,
      })
    );
    vi.mocked(createShare).mockResolvedValue(share);

    const response = await POST(
      postRequest({
        design,
        view: "2d",
        projectId: "project-1",
        expiresInDays: 7,
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      share: {
        token: "share-token",
        path: "/share/share-token?view=2d",
        expiresAt: null,
        ownerUserId: testUser.id,
        projectId: "project-1",
        shareType: "published",
      },
    });
    expect(createShare).toHaveBeenCalledWith(
      expect.objectContaining({ id: design.id }),
      {
        expiresInDays: undefined,
        ownerUserId: testUser.id,
        projectId: "project-1",
      }
    );
  });

  it("rejects project-linked publish for anonymous users", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await POST(
      postRequest({
        design: createDefaultDesign(),
        projectId: "project-1",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Project-linked publish requires an authenticated user",
    });
    expect(createShare).not.toHaveBeenCalled();
  });

  it("returns a recoverable publish failure when share creation fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
    vi.mocked(createShare).mockRejectedValue(new Error("D1 unavailable"));

    const response = await POST(postRequest({ design: createDefaultDesign() }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Failed to publish share",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[TrackDraw] Failed to publish share",
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it("returns a user's active project share", async () => {
    const share: UserShare = {
      token: "share-token",
      title: "Project share",
      shapeCount: 3,
      createdAt: "2026-04-20T10:00:00.000Z",
      expiresAt: null,
      projectId: "project-1",
      shareType: "published",
      galleryState: "unlisted",
      galleryTitle: null,
      galleryDescription: null,
    };
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(testUser);
    vi.mocked(getShareByProjectIdForUser).mockResolvedValue(share);

    const response = await GET(
      new Request("http://localhost/api/shares?projectId=project-1")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, share });
    expect(getShareByProjectIdForUser).toHaveBeenCalledWith(
      testUser.id,
      "project-1"
    );
    expect(getSharesByUserId).not.toHaveBeenCalled();
  });
});
