import { describe, expect, it, vi } from "vitest";
import {
  getAssetManifestEntry,
  getDesignAssetManifest,
} from "@trackdraw/viewer/assets/manifest";
import * as texturePaths from "@trackdraw/viewer/assets/texture-paths";
import {
  createCatalogShapeDraft,
  MULTIGP_HURDLE_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { Shape } from "@/lib/types";

const HURDLE_TEXTURE_PATH =
  "/assets/models/textures/multigp-obstacles/5x10-hurdle-multigp.webp";

function draftToShape(
  id: string,
  draft: ReturnType<typeof createCatalogShapeDraft>
): Shape {
  return { ...draft, id } as Shape;
}

describe("getAssetManifestEntry", () => {
  it("returns the manifest entry for a known committed texture path", () => {
    const entry = getAssetManifestEntry(HURDLE_TEXTURE_PATH);

    expect(entry).not.toBeNull();
    expect(entry?.path).toBe(HURDLE_TEXTURE_PATH);
    expect(entry?.contentType).toBe("image/webp");
    expect(entry?.sizeBytes).toBeGreaterThan(0);
    expect(entry?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns null for an unknown path", () => {
    expect(getAssetManifestEntry("/assets/does/not/exist.webp")).toBeNull();
  });
});

describe("getDesignAssetManifest", () => {
  it("returns no entries for a design using only procedural TrackDraw shapes", () => {
    const gate = draftToShape(
      "gate-1",
      createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      })
    );

    expect(getDesignAssetManifest([gate])).toEqual([]);
  });

  it("returns exactly the manifest entries for textures a MultiGP shape references", () => {
    const hurdle = draftToShape(
      "hurdle-1",
      createCatalogShapeDraft(MULTIGP_HURDLE_ELEMENT_ID, {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      })
    );

    const manifest = getDesignAssetManifest([hurdle]);
    expect(manifest).toHaveLength(1);
    expect(manifest[0].path).toBe(HURDLE_TEXTURE_PATH);
  });

  it("throws when a design references a texture path missing from the manifest", () => {
    const spy = vi
      .spyOn(texturePaths, "getDesignTexturePaths")
      .mockReturnValue(["/assets/does/not/exist.webp"]);

    expect(() => getDesignAssetManifest([])).toThrow(
      /missing an entry for "\/assets\/does\/not\/exist\.webp"/
    );

    spy.mockRestore();
  });
});
