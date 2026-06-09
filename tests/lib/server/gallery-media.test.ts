import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockMediaBucket,
  installCloudflareMediaBucket,
} from "../../helpers/cloudflare";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import {
  deleteGalleryPreviewImage,
  uploadGalleryPreviewImage,
} from "@/lib/server/gallery-media";

describe("gallery media storage", () => {
  beforeEach(() => {
    mocks.getCloudflareContext.mockReset();
  });

  it("returns null when no media bucket is configured", async () => {
    installCloudflareMediaBucket(mocks.getCloudflareContext, null);

    const key = await uploadGalleryPreviewImage({
      galleryEntryId: "entry-1",
      previewDataUrl: "data:image/webp;base64,not-used",
    });

    expect(key).toBeNull();
  });

  it("uploads webp previews with immutable cache metadata", async () => {
    const bucket = createMockMediaBucket();
    installCloudflareMediaBucket(mocks.getCloudflareContext, bucket);

    const key = await uploadGalleryPreviewImage({
      galleryEntryId: "entry-1",
      previewDataUrl: `data:image/webp;base64,${Buffer.from("webp").toString(
        "base64"
      )}`,
    });

    expect(key).toBe("gallery/previews/entry-1.webp");
    expect(bucket.put).toHaveBeenCalledWith(
      "gallery/previews/entry-1.webp",
      expect.any(Uint8Array),
      {
        httpMetadata: {
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        },
      }
    );
  });

  it("rejects non-webp preview payloads before upload", async () => {
    const bucket = createMockMediaBucket();
    installCloudflareMediaBucket(mocks.getCloudflareContext, bucket);

    await expect(
      uploadGalleryPreviewImage({
        galleryEntryId: "entry-1",
        previewDataUrl: "data:image/png;base64,abc=",
      })
    ).rejects.toThrow("Invalid gallery preview payload");
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("deletes configured preview keys and ignores missing buckets or keys", async () => {
    const bucket = createMockMediaBucket();
    installCloudflareMediaBucket(mocks.getCloudflareContext, bucket);

    await deleteGalleryPreviewImage(null);
    await deleteGalleryPreviewImage("gallery/previews/entry-1.webp");

    expect(bucket.delete).toHaveBeenCalledTimes(1);
    expect(bucket.delete).toHaveBeenCalledWith("gallery/previews/entry-1.webp");

    installCloudflareMediaBucket(mocks.getCloudflareContext, null);
    await expect(
      deleteGalleryPreviewImage("gallery/previews/missing.webp")
    ).resolves.toBeUndefined();
  });
});
