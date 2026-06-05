import { describe, expect, it } from "vitest";
import { getCanvasRotationGuideAngleDeg } from "@/lib/track/orientation";
import { feetToMeters } from "@/lib/track/units";
import {
  createCatalogShapeDraft,
  getCatalogEntriesByKind,
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  trackElementCatalog,
} from "@/lib/track/elements/catalog";
import type { GateShape } from "@/lib/types";

describe("track element catalog", () => {
  it("exposes unique catalog entries", () => {
    const ids = trackElementCatalog.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(getTrackElementCatalogEntry(TRACKDRAW_GATE_ELEMENT_ID)?.kind).toBe(
      "gate"
    );
    expect(getTrackElementCatalogEntry("missing")).toBeNull();
  });

  it("exposes gate entries for placement controls", () => {
    expect(getCatalogEntriesByKind("gate").map((entry) => entry.id)).toEqual([
      TRACKDRAW_GATE_ELEMENT_ID,
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
      MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
    ]);
  });

  it("keeps the frame-only TrackDraw gate defaults unchanged", () => {
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

  it("defaults newly placed gates to a forward-facing front (rotation 0)", () => {
    const shape = createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
      x: 0,
      y: 0,
    });

    expect(shape).toMatchObject({
      kind: "gate",
      rotation: 0,
    });
    const gateShape = { ...shape, id: "gate-1" } as GateShape;
    expect(getCanvasRotationGuideAngleDeg(gateShape)).toBe(270);
  });

  it("documents the MultiGP 5x5 panel-frame gate without changing default placement", () => {
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

  it("documents additional common MultiGP gate variants", () => {
    const championshipGate = getTrackElementCatalogEntry(
      MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID
    );

    expect(championshipGate).toMatchObject({
      name: "MultiGP Championship Gate 7x6",
      organization: "MultiGP",
      kind: "gate",
      official: true,
      dimensions: {
        display: { unitSystem: "imperial", label: "7 ft x 6 ft" },
      },
    });
    expect(championshipGate?.dimensions.widthMeters).toBeCloseTo(
      feetToMeters(7)
    );
    expect(championshipGate?.dimensions.heightMeters).toBeCloseTo(
      feetToMeters(6)
    );
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
        catalog: {
          version: 1,
          elementId: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
          assignedKind: "gate",
          official: true,
          snapshot: {
            name: "MultiGP Standard Gate 5x5",
            organization: "MultiGP",
            dimensionsLabel: "5 ft x 5 ft",
          },
        },
      },
    });
    expect(getTrackElementCatalogIdentity(shape.meta)).toMatchObject({
      elementId: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
      assignedKind: "gate",
      official: true,
      snapshot: {
        name: "MultiGP Standard Gate 5x5",
        organization: "MultiGP",
        dimensionsLabel: "5 ft x 5 ft",
      },
    });
  });

  it("ignores invalid catalog identity metadata", () => {
    expect(getTrackElementCatalogIdentity(undefined)).toBeNull();
    expect(
      getTrackElementCatalogIdentity({
        catalog: {
          version: 1,
          elementId: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
        },
      })
    ).toBeNull();
  });
});
