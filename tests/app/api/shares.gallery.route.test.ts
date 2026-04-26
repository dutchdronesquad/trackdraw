import { beforeEach, describe, expect, it, vi } from "vitest";

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
  getShareExpiresAtByToken: vi.fn(),
  resolveStoredShare: vi.fn(),
  revokeShare: vi.fn(),
}));

import { PATCH } from "@/app/api/shares/[token]/route";
import { uploadGalleryPreviewImage } from "@/lib/server/gallery-media";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
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
  getShareExpiresAtByToken,
  resolveStoredShare,
} from "@/lib/server/shares";
import type { StoredShare } from "@/lib/server/shares";

const owner = {
  id: "user-1",
  email: "owner@trackdraw.local",
  name: "Owner",
  image: null,
  role: "user" as const,
};

const share = {
  id: "share-id-1",
  token: "share-token",
  design: {
    title: "Track",
    description: "Description",
    field: { width: 30, height: 20, gridStep: 5 },
    shapes: [],
  },
  title: "Track",
  description: "Description",
  shapeCount: 0,
  fieldWidth: 30,
  fieldHeight: 20,
  createdAt: "2026-04-20T10:00:00.000Z",
  updatedAt: "2026-04-20T10:00:00.000Z",
  publishedAt: "2026-04-20T10:00:00.000Z",
  expiresAt: "2026-05-20T10:00:00.000Z",
  revokedAt: null,
  ownerUserId: owner.id,
  projectId: "project-1",
} as unknown as StoredShare;

const entry = {
  id: "entry-1",
  shareToken: share.token,
  ownerUserId: owner.id,
  galleryState: "unlisted" as const,
  galleryTitle: "Track",
  galleryDescription: "Description",
  galleryPreviewImage: null,
  galleryPublishedAt: null,
  moderationHiddenAt: null,
  createdAt: "2026-04-20T10:00:00.000Z",
  updatedAt: "2026-04-20T10:00:00.000Z",
};

function patchRequest(body: unknown) {
  return new Request(`http://localhost/api/shares/${share.token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context() {
  return { params: Promise.resolve({ token: share.token }) };
}

describe("owner share gallery API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "available",
      share,
    });
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(owner);
    vi.mocked(isResourceOwner).mockReturnValue(true);
    vi.mocked(getOrCreateGalleryEntryForShare).mockResolvedValue(entry);
    vi.mocked(getShareExpiresAtByToken).mockResolvedValue(null);
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
        expiresAt: null,
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

  it("removes a gallery entry without revoking the share", async () => {
    const response = (await PATCH(
      patchRequest({ action: "unlist" }),
      context()
    )) as Response;

    expect(response.status).toBe(200);
    expect(deleteGalleryEntry).toHaveBeenCalledWith(share.token);
  });
});
