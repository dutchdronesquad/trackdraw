import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import { createGalleryEntryFixture } from "../../helpers/api-routes";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  resolveShareView: vi.fn(),
  getGalleryEntry: vi.fn(),
}));
vi.mock("@/lib/server/share-resolution", () => ({
  resolveShareView: mocks.resolveShareView,
}));
vi.mock("@/lib/server/gallery", () => ({
  getGalleryEntryByShareToken: mocks.getGalleryEntry,
}));

import { getSharePageData } from "@/lib/server/share-page-data";

beforeEach(() => vi.resetAllMocks());

describe("share page data", () => {
  it("supplies the same track and gallery information to metadata and content", async () => {
    const resolvedShare = {
      source: "stored",
      status: "available",
      design: createDefaultDesign(),
      studioSeedToken: "seed",
      title: "Track",
      description: "Track description",
    };
    const galleryEntry = createGalleryEntryFixture();
    mocks.resolveShareView.mockResolvedValue(resolvedShare);
    mocks.getGalleryEntry.mockResolvedValue(galleryEntry);
    await expect(getSharePageData("share")).resolves.toEqual({
      resolvedShare,
      galleryEntry,
    });
    expect(mocks.resolveShareView).toHaveBeenCalledWith("share");
    expect(mocks.getGalleryEntry).toHaveBeenCalledWith("share");
  });

  it.each(["expired", "revoked", "retired", "invalid"])(
    "skips the gallery query for %s shares",
    async (status) => {
      mocks.resolveShareView.mockResolvedValue({
        source:
          status === "expired" || status === "revoked" ? "stored" : "legacy",
        status,
      });
      expect((await getSharePageData("share")).galleryEntry).toBeNull();
      expect(mocks.getGalleryEntry).not.toHaveBeenCalled();
    }
  );
});
