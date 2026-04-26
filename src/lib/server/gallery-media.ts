import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildGalleryPreviewImageKey } from "@/lib/server/gallery-preview";

type R2Bucket = {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    }
  ): Promise<unknown>;
  delete(key: string): Promise<unknown>;
};

type CloudflareContextWithMediaBucket = {
  env: {
    MEDIA_BUCKET?: R2Bucket;
  };
};

async function getMediaBucket() {
  const { env } = (await getCloudflareContext({
    async: true,
  })) as CloudflareContextWithMediaBucket;

  return env.MEDIA_BUCKET ?? null;
}

function decodeWebpDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error("Invalid gallery preview payload");
  }

  return Uint8Array.from(Buffer.from(match[1], "base64"));
}

export async function uploadGalleryPreviewImage(params: {
  galleryEntryId: string;
  previewDataUrl: string;
}) {
  const bucket = await getMediaBucket();
  if (!bucket) {
    return null;
  }

  const key = buildGalleryPreviewImageKey(params.galleryEntryId);
  const body = decodeWebpDataUrl(params.previewDataUrl);

  await bucket.put(key, body, {
    httpMetadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return key;
}

export async function deleteGalleryPreviewImage(key: string | null) {
  if (!key) return;

  const bucket = await getMediaBucket();
  if (!bucket) {
    return;
  }

  await bucket.delete(key);
}
