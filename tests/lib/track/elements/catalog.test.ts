import { describe, expect, it } from "vitest";
import { feetToMeters } from "@/lib/track/units";
import {
  createCatalogShapeDraft,
  getTrackElementCatalogEntry,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  trackElementCatalog,
} from "@/lib/track/elements/catalog";

describe("track element catalog", () => {
  it("exposes unique catalog entries", () => {
    const ids = trackElementCatalog.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(getTrackElementCatalogEntry(TRACKDRAW_GATE_ELEMENT_ID)?.kind).toBe(
      "gate"
    );
    expect(getTrackElementCatalogEntry("missing")).toBeNull();
  });

  it("keeps the generic TrackDraw gate defaults unchanged", () => {
    const shape = createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
      x: 12,
      y: 8,
      rotation: 15,
    });

    expect(shape).toMatchObject({
      kind: "gate",
      x: 12,
      y: 8,
      rotation: 15,
      width: 2,
      height: 2,
      thick: 0.2,
      color: "#3b82f6",
    });
    expect(shape.meta).toBeUndefined();
  });

  it("documents the official MultiGP 5x5 gate without changing generic placement", () => {
    const entry = getTrackElementCatalogEntry(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
    );

    expect(entry).toMatchObject({
      name: "MultiGP Standard Gate 5x5",
      organization: "MultiGP",
      kind: "gate",
      official: true,
      dimensions: {
        display: { unitSystem: "imperial", label: "5 ft x 5 ft" },
      },
    });
    expect(entry?.dimensions.widthMeters).toBeCloseTo(feetToMeters(5));
    expect(entry?.dimensions.heightMeters).toBeCloseTo(feetToMeters(5));
  });

  it("can stamp catalog identity metadata when a placement flow asks for it", () => {
    const shape = createCatalogShapeDraft(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
      {
        x: 4,
        y: 6,
        includeCatalogMetadata: true,
      }
    );

    expect(shape).toMatchObject({
      kind: "gate",
      width: feetToMeters(5),
      height: feetToMeters(5),
      meta: {
        catalogElementId: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
        catalogElementName: "MultiGP Standard Gate 5x5",
        catalogOrganization: "MultiGP",
        officialCatalogElement: true,
      },
    });
  });
});
