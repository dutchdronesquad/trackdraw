import "server-only";

export function buildGalleryPreviewImageKey(galleryEntryId: string) {
  return `gallery/previews/${galleryEntryId}.webp`;
}
