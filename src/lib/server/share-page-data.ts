import "server-only";

import { cache } from "react";
import { getGalleryEntryByShareToken } from "@/lib/server/gallery";
import { resolveShareView } from "@/lib/server/share-resolution";

// Metadata and the page render use the same database reads and serialization.
// React expires this memoization after each server render request, so a later
// request still sees revocation, expiry, moderation and updated track content.
export const getSharePageData = cache(async (token: string) => {
  const resolvedShare = await resolveShareView(token);
  const galleryEntry =
    resolvedShare.status === "available" && resolvedShare.source === "stored"
      ? await getGalleryEntryByShareToken(token)
      : null;
  return { resolvedShare, galleryEntry };
});
