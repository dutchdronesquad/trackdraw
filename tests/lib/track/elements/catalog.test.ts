import { describe, expect, it } from "vitest";
import { getCanvasRotationGuideAngleDeg } from "@/lib/track/orientation";
import { feetToMeters } from "@/lib/track/units";
import {
  createCatalogShapeDraft,
  getCatalogEntriesByKind,
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
  MULTIGP_CHAMPIONSHIP_LADDER_7X6_ELEMENT_ID,
  MULTIGP_DIVE_GATE_7X6_ELEMENT_ID,
  MULTIGP_LAUNCH_GATE_7X6_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID,
  MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID,
  TRACKDRAW_DIVE_GATE_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_LADDER_ELEMENT_ID,
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

  it("exposes ladder entries for placement controls", () => {
    expect(getCatalogEntriesByKind("ladder").map((entry) => entry.id)).toEqual([
      TRACKDRAW_LADDER_ELEMENT_ID,
      MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID,
      MULTIGP_CHAMPIONSHIP_LADDER_7X6_ELEMENT_ID,
      MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID,
    ]);
  });

  it("exposes dive gate entries for placement controls", () => {
    expect(
      getCatalogEntriesByKind("divegate").map((entry) => entry.id)
    ).toEqual([
      TRACKDRAW_DIVE_GATE_ELEMENT_ID,
      MULTIGP_DIVE_GATE_7X6_ELEMENT_ID,
      MULTIGP_LAUNCH_GATE_7X6_ELEMENT_ID,
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
    expect(getCanvasRotationGuideAngleDeg(gateShape)).toBe(90);
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

  it("documents the MultiGP Topless Ladder 7x6 variant", () => {
    const toplessLadder = getTrackElementCatalogEntry(
      MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID
    );

    expect(toplessLadder).toMatchObject({
      name: "MultiGP Topless Ladder 7x6",
      organization: "MultiGP",
      kind: "ladder",
      official: true,
      dimensions: {
        display: {
          unitSystem: "imperial",
          label: "7 ft wide, 3 x 6 ft topless",
        },
      },
    });
    expect(toplessLadder?.dimensions.widthMeters).toBeCloseTo(feetToMeters(7));
    expect(toplessLadder?.dimensions.heightMeters).toBeCloseTo(
      feetToMeters(6) * 3
    );
  });

  it("documents the official MultiGP dive gate opening and textures", () => {
    const diveGate = getTrackElementCatalogEntry(
      MULTIGP_DIVE_GATE_7X6_ELEMENT_ID
    );

    expect(diveGate).toMatchObject({
      name: "MultiGP Dive Gate 7x6",
      organization: "MultiGP",
      kind: "divegate",
      official: true,
      dimensions: {
        display: { unitSystem: "imperial", label: "7 ft x 6 ft" },
      },
      visual: {
        kind: "divegate",
        variant: "arch",
        banner: {
          sideTexture:
            "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
          topTexture:
            "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
        },
      },
    });
    expect(diveGate?.dimensions.widthMeters).toBeCloseTo(feetToMeters(7));
    expect(diveGate?.dimensions.heightMeters).toBeCloseTo(feetToMeters(6));
  });

  it("documents the official MultiGP launch gate and texture", () => {
    const launchGate = getTrackElementCatalogEntry(
      MULTIGP_LAUNCH_GATE_7X6_ELEMENT_ID
    );

    expect(launchGate).toMatchObject({
      name: "MultiGP Launch Gate 7x6",
      organization: "MultiGP",
      kind: "divegate",
      official: true,
      dimensions: {
        display: {
          unitSystem: "imperial",
          label: "7 ft x 6 ft",
        },
      },
      visual: {
        kind: "divegate",
        variant: "launch",
        banner: {
          sideTexture:
            "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
          topTexture:
            "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
        },
      },
    });
    expect(launchGate?.dimensions.widthMeters).toBeCloseTo(feetToMeters(7));
    expect(launchGate?.dimensions.heightMeters).toBeCloseTo(feetToMeters(6));
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
