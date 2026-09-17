import { describe, expect, it } from "vitest";
import { getDesignTexturePaths } from "@trackdraw/viewer/assets/texture-paths";
import {
  createCatalogShapeDraft,
  MULTIGP_HURDLE_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { Shape } from "@/lib/types";

function draftToShape(
  id: string,
  draft: ReturnType<typeof createCatalogShapeDraft>
): Shape {
  return { ...draft, id } as Shape;
}

describe("getDesignTexturePaths", () => {
  it("returns no paths for a design using only procedural TrackDraw catalog shapes", () => {
    const gate = draftToShape(
      "gate-1",
      createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      })
    );

    expect(getDesignTexturePaths([gate])).toEqual([]);
  });

  it("returns only the textures used by a MultiGP shape, not the whole catalog", () => {
    const hurdle = draftToShape(
      "hurdle-1",
      createCatalogShapeDraft(MULTIGP_HURDLE_ELEMENT_ID, {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      })
    );

    const paths = getDesignTexturePaths([hurdle]);
    expect(paths).toEqual([
      "/assets/models/textures/multigp-obstacles/5x10-hurdle-multigp.webp",
    ]);
  });

  it("returns an empty array for shapes with no catalog identity", () => {
    const untaggedGate: Shape = {
      id: "gate-2",
      kind: "gate",
      x: 0,
      y: 0,
      rotation: 0,
      width: 3,
      height: 2,
    };

    expect(getDesignTexturePaths([untaggedGate])).toEqual([]);
  });
});
