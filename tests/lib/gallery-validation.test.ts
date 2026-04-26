import { describe, expect, it } from "vitest";
import {
  GALLERY_DESCRIPTION_MAX_LENGTH,
  canSubmitGalleryListing,
  canSubmitGalleryMetadataUpdate,
  getGalleryDescriptionLength,
  isGalleryDescriptionValid,
  isGalleryTitleValid,
} from "@/lib/gallery-validation";

describe("gallery validation", () => {
  it("validates gallery title and description boundaries", () => {
    expect(isGalleryTitleValid("")).toBe(false);
    expect(isGalleryTitleValid("  Track  ")).toBe(true);

    expect(getGalleryDescriptionLength("  short  ")).toBe(5);
    expect(isGalleryDescriptionValid("too short")).toBe(false);
    expect(isGalleryDescriptionValid("A useful description")).toBe(true);
    expect(
      isGalleryDescriptionValid("x".repeat(GALLERY_DESCRIPTION_MAX_LENGTH))
    ).toBe(true);
    expect(
      isGalleryDescriptionValid("x".repeat(GALLERY_DESCRIPTION_MAX_LENGTH + 1))
    ).toBe(false);
  });

  it("blocks listing when the share is stale, missing, or not previewed", () => {
    const valid = {
      title: "Race track",
      description: "A useful public gallery description.",
      displayNameValid: true,
      shareNeedsRefresh: false,
      hasShare: true,
      previewReady: true,
    };

    expect(canSubmitGalleryListing(valid)).toBe(true);
    expect(canSubmitGalleryListing({ ...valid, shareNeedsRefresh: true })).toBe(
      false
    );
    expect(canSubmitGalleryListing({ ...valid, hasShare: false })).toBe(false);
    expect(canSubmitGalleryListing({ ...valid, previewReady: false })).toBe(
      false
    );
    expect(canSubmitGalleryListing({ ...valid, displayNameValid: false })).toBe(
      false
    );
  });

  it("requires actual metadata changes before updating a listed entry", () => {
    const valid = {
      title: "Race track",
      description: "A useful public gallery description.",
      hasShare: true,
      hasMetadataChanges: true,
    };

    expect(canSubmitGalleryMetadataUpdate(valid)).toBe(true);
    expect(
      canSubmitGalleryMetadataUpdate({ ...valid, hasMetadataChanges: false })
    ).toBe(false);
    expect(canSubmitGalleryMetadataUpdate({ ...valid, hasShare: false })).toBe(
      false
    );
  });
});
