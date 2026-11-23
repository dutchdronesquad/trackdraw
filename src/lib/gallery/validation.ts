export const GALLERY_DESCRIPTION_MAX_LENGTH = 500;

export function getGalleryDescriptionLength(description: string) {
  return description.trim().length;
}

export function isGalleryTitleValid(title: string) {
  return title.trim().length > 0 && title.trim().length <= 120;
}

export function isGalleryDescriptionValid(description: string) {
  const length = getGalleryDescriptionLength(description);

  return length <= GALLERY_DESCRIPTION_MAX_LENGTH;
}

export function canSubmitGalleryListing(input: {
  title: string;
  description: string;
  displayNameValid: boolean;
  previewReady: boolean;
}) {
  return (
    isGalleryTitleValid(input.title) &&
    isGalleryDescriptionValid(input.description) &&
    input.displayNameValid &&
    input.previewReady
  );
}

export function canSubmitGalleryMetadataUpdate(input: {
  title: string;
  description: string;
  hasShare: boolean;
  hasMetadataChanges: boolean;
}) {
  return (
    input.hasShare &&
    isGalleryTitleValid(input.title) &&
    isGalleryDescriptionValid(input.description) &&
    input.hasMetadataChanges
  );
}
