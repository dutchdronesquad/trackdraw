import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDatabase } from "@/lib/server/db";
import { cleanupAccountDeletionMedia } from "@/lib/server/account-deletion";
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

  const db = await getDatabase();
  const entry = await db
    .prepare("SELECT id FROM gallery_entries WHERE id = ?")
    .bind(params.galleryEntryId)
    .first<{ id: string }>();
  if (!entry) {
    // An upload can finish after concurrent account deletion. Keep its key
    // durable even if the earlier media work list was already drained.
    await db
      .prepare(
        "INSERT OR IGNORE INTO account_deletion_media (object_key) VALUES (?)"
      )
      .bind(key)
      .run();
    await flushAccountDeletionMedia();
    return null;
  }
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

// Database deletion is already final. R2 failure must not pretend it can be
// undone; the durable work list is retried by the scheduled owner.
export async function flushAccountDeletionMedia() {
  try {
    await cleanupAccountDeletionMedia(
      await getDatabase(),
      await getMediaBucket()
    );
  } catch {
    console.error("[TrackDraw] Account media cleanup pending");
  }
}
