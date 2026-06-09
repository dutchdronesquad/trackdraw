import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/csrf", () => ({ isTrustedRequest: vi.fn(() => true) }));

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/authorization", () => ({
  isResourceOwner: vi.fn(),
}));

vi.mock("@/lib/server/gallery-media", () => ({
  uploadGalleryPreviewImage: vi.fn(),
}));

vi.mock("@/lib/server/gallery", () => ({
  deleteGalleryEntry: vi.fn(),
  getGalleryEntryByShareToken: vi.fn(),
  moveGalleryEntryToListed: vi.fn(),
  setGalleryEntryPreviewImage: vi.fn(),
  updateGalleryEntryMetadata: vi.fn(),
}));

vi.mock("@/lib/server/shares", () => ({
  getOrCreateGalleryEntryForShare: vi.fn(),
  resolveStoredShare: vi.fn(),
  revokeShare: vi.fn(),
}));

import { DELETE, PATCH } from "@/app/api/shares/[token]/route";
import { uploadGalleryPreviewImage } from "@/lib/server/gallery-media";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { isResourceOwner } from "@/lib/server/authorization";
import {
  deleteGalleryEntry,
  getGalleryEntryByShareToken,
  moveGalleryEntryToListed,
  setGalleryEntryPreviewImage,
  updateGalleryEntryMetadata,
} from "@/lib/server/gallery";
import {
  getOrCreateGalleryEntryForShare,
  resolveStoredShare,
  revokeShare,
} from "@/lib/server/shares";
import {
  createGalleryEntryFixture,
  createStoredShareFixture,
  jsonRequest,
  routeContext,
  testUser,
} from "../../helpers/api-routes";

const share = createStoredShareFixture({
  ownerUserId: testUser.id,
  projectId: "project-1",
  shareType: "published",
});

const entry = createGalleryEntryFixture({
  shareToken: share.token,
  ownerUserId: testUser.id,
  galleryState: "unlisted",
  galleryDescription: "Description",
  galleryPreviewImage: null,
  galleryPublishedAt: null,
  createdAt: "2026-04-20T10:00:00.000Z",
});

function patchRequest(body: unknown) {
  return jsonRequest(
    `http://localhost/api/shares/${share.token}`,
    "PATCH",
    body
  );
}

function context() {
  return routeContext({ token: share.token });
}

describe("owner share gallery API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "available",
      share,
    });
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(testUser);
    vi.mocked(isResourceOwner).mockReturnValue(true);
    vi.mocked(getOrCreateGalleryEntryForShare).mockResolvedValue(entry);
    vi.mocked(getGalleryEntryByShareToken).mockResolvedValue({
      ...entry,
      galleryState: "listed",
      galleryTitle: "Public title",
      galleryDescription: "Public description",
    });
  });

  it("lists an owned active share and uploads the generated preview", async () => {
    vi.mocked(uploadGalleryPreviewImage).mockResolvedValue(
      "gallery/previews/entry-1.webp"
    );

    const response = (await PATCH(
      patchRequest({
        action: "list",
        title: "Public title",
        description: "Public description",
        previewDataUrl: "data:image/webp;base64,AAAA",
      }),
      context()
    )) as Response;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      share: {
        token: share.token,
        expiresAt: share.expiresAt,
        shareType: "published",
        galleryState: "listed",
        galleryTitle: "Public title",
        galleryDescription: "Public description",
      },
    });
    expect(updateGalleryEntryMetadata).toHaveBeenCalledWith({
      shareToken: share.token,
      title: "Public title",
      description: "Public description",
    });
    expect(uploadGalleryPreviewImage).toHaveBeenCalledWith({
      galleryEntryId: entry.id,
      previewDataUrl: "data:image/webp;base64,AAAA",
    });
    expect(setGalleryEntryPreviewImage).toHaveBeenCalledWith({
      shareToken: share.token,
      previewImage: "gallery/previews/entry-1.webp",
    });
    expect(moveGalleryEntryToListed).toHaveBeenCalledWith(share.token);
  });

  it("blocks share revocation before ownership checks when the request is not trusted", async () => {
    vi.mocked(isTrustedRequest).mockReturnValue(false);

    const response = (await DELETE(
      new Request(`http://localhost/api/shares/${share.token}`, {
        method: "DELETE",
      }),
      context()
    )) as Response;

    expect(response.status).toBe(403);
    expect(resolveStoredShare).not.toHaveBeenCalled();
    expect(revokeShare).not.toHaveBeenCalled();
  });

  it("revokes an owned share without touching gallery metadata", async () => {
    const response = (await DELETE(
      new Request(`http://localhost/api/shares/${share.token}`, {
        method: "DELETE",
      }),
      context()
    )) as Response;

    expect(response.status).toBe(200);
    expect(revokeShare).toHaveBeenCalledWith(share.token);
    expect(updateGalleryEntryMetadata).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("blocks gallery changes for expired or revoked shares", async () => {
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "expired",
      share,
    });

    const response = (await PATCH(
      patchRequest({
        action: "list",
        title: "Public title",
        description: "Public description",
      }),
      context()
    )) as Response;

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Only active shares can change gallery state",
    });
    expect(getOrCreateGalleryEntryForShare).not.toHaveBeenCalled();
  });

  it("blocks owners from changing a hidden gallery entry", async () => {
    vi.mocked(getOrCreateGalleryEntryForShare).mockResolvedValue({
      ...entry,
      galleryState: "hidden",
    });

    const response = (await PATCH(
      patchRequest({
        action: "list",
        title: "Public title",
        description: "Public description",
      }),
      context()
    )) as Response;

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error:
        "This track is hidden from the gallery and cannot be changed by the owner",
    });
    expect(moveGalleryEntryToListed).not.toHaveBeenCalled();
  });

  it("requires an account display name before listing in the gallery", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue({
      ...testUser,
      name: "  ",
    });

    const response = (await PATCH(
      patchRequest({
        action: "list",
        title: "Public title",
        description: "Public description",
      }),
      context()
    )) as Response;

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Set a display name on your account before listing in the gallery",
    });
    expect(updateGalleryEntryMetadata).not.toHaveBeenCalled();
    expect(moveGalleryEntryToListed).not.toHaveBeenCalled();
  });

  it("updates metadata only for listed or featured entries", async () => {
    vi.mocked(getOrCreateGalleryEntryForShare).mockResolvedValue({
      ...entry,
      galleryState: "listed",
    });

    const response = (await PATCH(
      patchRequest({
        action: "update",
        title: "Updated title",
        description: "Updated public description",
      }),
      context()
    )) as Response;

    expect(response.status).toBe(200);
    expect(updateGalleryEntryMetadata).toHaveBeenCalledWith({
      shareToken: share.token,
      title: "Updated title",
      description: "Updated public description",
    });
    expect(moveGalleryEntryToListed).not.toHaveBeenCalled();
  });

  it("rejects metadata updates while an entry is still unlisted", async () => {
    vi.mocked(getOrCreateGalleryEntryForShare).mockResolvedValue({
      ...entry,
      galleryState: "unlisted",
    });

    const response = (await PATCH(
      patchRequest({
        action: "update",
        title: "Updated title",
        description: "Updated public description",
      }),
      context()
    )) as Response;

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Only listed gallery items can update their metadata",
    });
    expect(updateGalleryEntryMetadata).not.toHaveBeenCalled();
  });

  it("removes a gallery entry without revoking the share", async () => {
    const response = (await PATCH(
      patchRequest({ action: "unlist" }),
      context()
    )) as Response;

    expect(response.status).toBe(200);
    expect(deleteGalleryEntry).toHaveBeenCalledWith(share.token);
  });
});
