import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/gallery", () => ({
  listPublicGalleryEntries: vi.fn(),
}));

import sitemap from "@/app/sitemap";
import { listPublicGalleryEntries } from "@/lib/server/gallery";

describe("sitemap metadata", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.test");
    vi.mocked(listPublicGalleryEntries).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("includes core public routes and canonical gallery share links", async () => {
    vi.mocked(listPublicGalleryEntries).mockResolvedValue([
      {
        id: "entry-1",
        shareToken: "share token",
        ownerUserId: "user-1",
        galleryState: "featured",
        galleryTitle: "Featured track",
        galleryDescription: "Description",
        galleryPreviewImage: null,
        galleryPublishedAt: "2026-06-08T10:00:00.000Z",
        moderationHiddenAt: null,
        createdAt: "2026-06-07T10:00:00.000Z",
        updatedAt: "2026-06-08T11:00:00.000Z",
        ownerName: "Pilot",
        shareTitle: "Featured share",
        fieldWidth: 60,
        fieldHeight: 40,
        shapeCount: 12,
      },
    ]);

    const entries = await sitemap();

    expect(listPublicGalleryEntries).toHaveBeenCalledWith(100);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "https://trackdraw.test",
          priority: 1,
        }),
        expect.objectContaining({
          url: "https://trackdraw.test/gallery",
          changeFrequency: "daily",
        }),
        expect.objectContaining({
          url: "https://trackdraw.test/share/share%20token",
          lastModified: new Date("2026-06-08T10:00:00.000Z"),
          priority: 0.75,
        }),
      ])
    );
  });

  it("still returns core routes when gallery lookup fails", async () => {
    vi.mocked(listPublicGalleryEntries).mockRejectedValue(new Error("D1 down"));

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://trackdraw.test",
      "https://trackdraw.test/gallery",
      "https://trackdraw.test/studio",
      "https://trackdraw.test/privacy",
      "https://trackdraw.test/terms",
    ]);
  });
});
