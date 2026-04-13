import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildShareUrl,
  buildStoredSharePath,
  decodeDesign,
  decodeDesignWithReason,
  encodeDesign,
  getShareDescription,
  getShareTitle,
  isShareSafe,
} from "@/lib/share";
import { createDefaultDesign } from "@/lib/track/design";
import { parseEditorView } from "@/lib/view";

describe("share helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes and decodes a design roundtrip", () => {
    const design = createDefaultDesign();
    design.title = "Club Race";

    const token = encodeDesign(design);
    const decoded = decodeDesign(token);

    expect(decoded?.title).toBe("Club Race");
    expect(decoded?.id).toBe(design.id);
  });

  it("builds stored share paths and absolute share urls", () => {
    const design = createDefaultDesign();
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        host: "trackdraw.app",
      },
    });

    expect(buildStoredSharePath("abc", "3d")).toBe("/share/abc?view=3d");
    expect(buildShareUrl(design, "2d")).toContain("/share/");
    expect(buildShareUrl(design, "2d")).toContain("view=2d");
  });

  it("reports decode reasons for invalid and oversized tokens", () => {
    expect(decodeDesignWithReason("%%%")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(decodeDesignWithReason("x".repeat(7501))).toEqual({
      ok: false,
      reason: "too-large",
    });
  });

  it("returns sensible share title and description fallbacks", () => {
    const design = createDefaultDesign();
    design.title = "  ";
    design.description = "  ";

    expect(getShareTitle(design)).toBe("Untitled track");
    expect(getShareDescription(design)).toBe(
      "Read-only TrackDraw plan for Untitled track."
    );
  });

  it("treats default designs as share-safe and parses editor views", () => {
    const design = createDefaultDesign();

    expect(isShareSafe(design)).toBe(true);
    expect(parseEditorView("2d")).toBe("2d");
    expect(parseEditorView("3d")).toBe("3d");
    expect(parseEditorView("weird")).toBeUndefined();
  });
});
