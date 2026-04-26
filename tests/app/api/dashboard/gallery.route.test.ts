import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/audit", () => ({
  createAuditEvent: vi.fn(),
}));

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/authorization", () => ({
  hasCapability: vi.fn(),
}));

vi.mock("@/lib/server/gallery", () => ({
  deleteGalleryEntry: vi.fn(),
  getGalleryEntryByShareToken: vi.fn(),
  moveGalleryEntryToFeatured: vi.fn(),
  moveGalleryEntryToHidden: vi.fn(),
  moveGalleryEntryToListed: vi.fn(),
}));

vi.mock("@/lib/server/shares", () => ({
  resolveStoredShare: vi.fn(),
}));

import { DELETE, PATCH } from "@/app/api/dashboard/gallery/[shareToken]/route";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import {
  deleteGalleryEntry,
  getGalleryEntryByShareToken,
  moveGalleryEntryToFeatured,
  moveGalleryEntryToHidden,
  moveGalleryEntryToListed,
} from "@/lib/server/gallery";
import { resolveStoredShare } from "@/lib/server/shares";
import type { StoredShare } from "@/lib/server/shares";

const actor = {
  id: "mod-1",
  email: "mod@trackdraw.local",
  name: "Moderator",
  image: null,
  role: "moderator" as const,
};

const entry = {
  id: "entry-1",
  shareToken: "share-token",
  ownerUserId: "owner-1",
  galleryState: "listed" as const,
  galleryTitle: "Track",
  galleryDescription: "Public description",
  galleryPreviewImage: "gallery/previews/entry-1.webp",
  galleryPublishedAt: "2026-04-20T10:00:00.000Z",
  moderationHiddenAt: null,
  createdAt: "2026-04-20T09:00:00.000Z",
  updatedAt: "2026-04-20T10:00:00.000Z",
};

const storedShare = {
  id: "share-id",
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
  expiresAt: null,
  revokedAt: null,
  ownerUserId: "owner-1",
  projectId: "project-1",
  shareType: "published",
} as unknown as StoredShare;

function patchRequest(action: string) {
  return new Request("http://localhost/api/dashboard/gallery/share-token", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

function deleteRequest() {
  return new Request("http://localhost/api/dashboard/gallery/share-token", {
    method: "DELETE",
  });
}

function context() {
  return { params: Promise.resolve({ shareToken: "share-token" }) };
}

describe("dashboard gallery API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(actor);
    vi.mocked(hasCapability).mockReturnValue(true);
    vi.mocked(getGalleryEntryByShareToken)
      .mockResolvedValueOnce(entry)
      .mockResolvedValue({ ...entry, galleryState: "featured" });
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "available",
      share: storedShare,
    });
  });

  it("returns 401 when the actor is missing", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await PATCH(patchRequest("feature"), context());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Authentication required",
    });
  });

  it("returns 403 when the actor cannot update gallery entries", async () => {
    vi.mocked(hasCapability).mockReturnValue(false);

    const response = await PATCH(patchRequest("feature"), context());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Only moderators and admins can update gallery entries.",
    });
  });

  it("features an active share and writes an audit event", async () => {
    const response = await PATCH(patchRequest("feature"), context());

    expect(response.status).toBe(200);
    expect(resolveStoredShare).toHaveBeenCalledWith("share-token");
    expect(moveGalleryEntryToFeatured).toHaveBeenCalledWith("share-token");
    expect(createAuditEvent).toHaveBeenCalledWith({
      actorUserId: actor.id,
      targetUserId: entry.ownerUserId,
      eventType: "gallery.entry.featured",
      entityType: "gallery_entry",
      entityId: entry.id,
      metadata: {
        shareToken: "share-token",
        previousState: "listed",
        nextState: "featured",
      },
    });
  });

  it("hides without resolving the share payload and writes an audit event", async () => {
    vi.mocked(getGalleryEntryByShareToken).mockReset();
    vi.mocked(getGalleryEntryByShareToken)
      .mockResolvedValueOnce(entry)
      .mockResolvedValue({ ...entry, galleryState: "hidden" });

    const response = await PATCH(patchRequest("hide"), context());

    expect(response.status).toBe(200);
    expect(resolveStoredShare).not.toHaveBeenCalled();
    expect(moveGalleryEntryToHidden).toHaveBeenCalledWith("share-token");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "gallery.entry.hidden",
        metadata: {
          shareToken: "share-token",
          previousState: "listed",
          nextState: "hidden",
        },
      })
    );
  });

  it("restores hidden entries to listed state", async () => {
    vi.mocked(getGalleryEntryByShareToken).mockReset();
    vi.mocked(getGalleryEntryByShareToken)
      .mockResolvedValueOnce({ ...entry, galleryState: "hidden" })
      .mockResolvedValue({ ...entry, galleryState: "listed" });

    const response = await PATCH(patchRequest("restore"), context());

    expect(response.status).toBe(200);
    expect(resolveStoredShare).not.toHaveBeenCalled();
    expect(moveGalleryEntryToListed).toHaveBeenCalledWith("share-token");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "gallery.entry.restored",
      })
    );
  });

  it("deletes gallery entries for moderators and admins", async () => {
    vi.mocked(getGalleryEntryByShareToken).mockResolvedValue(entry);

    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteGalleryEntry).toHaveBeenCalledWith("share-token");
    expect(createAuditEvent).toHaveBeenCalledWith({
      actorUserId: actor.id,
      targetUserId: entry.ownerUserId,
      eventType: "gallery.entry.deleted",
      entityType: "gallery_entry",
      entityId: entry.id,
      metadata: {
        shareToken: "share-token",
        previousState: "listed",
      },
    });
  });
});
