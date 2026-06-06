import { describe, expect, it } from "vitest";
import {
  buildGateCatalogTypePatch,
  createShapeForTool,
  getShapeDisplayLabel,
  shapeKindLabels,
  toolLabels,
  toolShortcuts,
} from "@/lib/editor-tools";
import {
  createTrackElementCatalogIdentity,
  createCatalogShapeDraft,
  getTrackElementCatalogEntry,
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  TRACKDRAW_FLAG_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { GateShape } from "@/lib/types";
import { feetToMeters } from "@/lib/track/units";

describe("editor tool helpers", () => {
  it("exposes stable labels and shortcuts", () => {
    expect(shapeKindLabels.startfinish).toBe("Start / Finish");
    expect(toolLabels.polyline).toBe("Path");
    expect(toolShortcuts.divegate).toBe("D");
    expect(toolShortcuts.preset).toBeUndefined();
  });

  it("creates default shape drafts for supported placement tools", () => {
    const point = { x: 12, y: 7 };

    expect(createShapeForTool("gate", point)).toMatchObject({
      kind: "gate",
      x: 12,
      y: 7,
      rotation: 0,
      width: 2,
      height: 2,
      thick: 0.2,
      color: "#3b82f6",
    });
    expect(createShapeForTool("label", point)).toMatchObject({
      kind: "label",
      text: "Gate A",
      fontSize: 18,
      color: "#e2e8f0",
    });
    expect(createShapeForTool("ladder", point)).toMatchObject({
      kind: "ladder",
      width: 2,
      height: 6,
      rungs: 3,
      elevation: 0,
    });
    expect(createShapeForTool("divegate", point)).toMatchObject({
      kind: "divegate",
      size: 2.8,
      thick: 0.2,
      tilt: 0,
      elevation: 3,
    });
  });

  it("creates the selected official gate variant through the gate tool", () => {
    const shape = createShapeForTool(
      "gate",
      { x: 3, y: 4 },
      {
        activePlacementElementId: {
          gate: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
        },
      }
    );

    expect(shape).toMatchObject({
      kind: "gate",
      x: 3,
      y: 4,
      rotation: 0,
      width: feetToMeters(5),
      height: feetToMeters(5),
      meta: {
        catalog: {
          elementId: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
          assignedKind: "gate",
          official: true,
        },
      },
    });
  });

  it("creates larger official gate variants through the same gate tool", () => {
    const shape = createShapeForTool(
      "gate",
      { x: 6, y: 8 },
      {
        activePlacementElementId: {
          gate: MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
        },
      }
    );

    expect(shape).toMatchObject({
      kind: "gate",
      rotation: 0,
      width: feetToMeters(7),
      height: feetToMeters(6),
      meta: {
        catalog: {
          elementId: MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
          assignedKind: "gate",
          official: true,
        },
      },
    });
  });

  it("falls back to the frame-only gate when a non-gate catalog id is passed", () => {
    expect(
      createShapeForTool(
        "gate",
        { x: 1, y: 2 },
        {
          activePlacementElementId: { gate: TRACKDRAW_FLAG_ELEMENT_ID },
        }
      )
    ).toMatchObject({
      kind: "gate",
      width: 2,
      height: 2,
    });
  });

  it("returns null for non-placement tools", () => {
    expect(createShapeForTool("select", { x: 1, y: 2 })).toBeNull();
    expect(createShapeForTool("grab", { x: 1, y: 2 })).toBeNull();
    expect(createShapeForTool("preset", { x: 1, y: 2 })).toBeNull();
    expect(createShapeForTool("polyline", { x: 1, y: 2 })).toBeNull();
  });

  it("uses catalog-backed shape names for display labels", () => {
    const shape = createShapeForTool(
      "gate",
      { x: 3, y: 4 },
      {
        activePlacementElementId: {
          gate: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
        },
      }
    );

    expect(shape?.kind).toBe("gate");
    expect(getShapeDisplayLabel({ ...shape!, id: "gate-1" })).toBe(
      "MultiGP Standard Gate 5x5"
    );
  });

  it("falls back to kind labels when catalog metadata does not match the shape", () => {
    const flagEntry = getTrackElementCatalogEntry(TRACKDRAW_FLAG_ELEMENT_ID);
    expect(flagEntry).not.toBeNull();

    const gate = {
      ...createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, { x: 1, y: 2 }),
      id: "gate-2",
      meta: {
        catalog: createTrackElementCatalogIdentity(flagEntry!),
      },
    } as GateShape;

    expect(getShapeDisplayLabel(gate)).toBe("Gate");
  });
});

describe("buildGateCatalogTypePatch", () => {
  const baseShape = createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
    x: 5,
    y: 8,
    rotation: 90,
  }) as GateShape & { id: string };
  baseShape.id = "gate-1";

  it("switches to a catalog-backed entry and applies its defaults", () => {
    const patch = buildGateCatalogTypePatch(
      baseShape,
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
    );

    expect(patch).toMatchObject({
      kind: "gate",
      x: 5,
      y: 8,
      rotation: 90,
      meta: {
        catalog: expect.objectContaining({
          elementId: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
          official: true,
        }),
      },
    });
  });

  it("resets to frame-only defaults and clears catalog identity when switching to TrackDraw Gate", () => {
    const catalogShape = createCatalogShapeDraft(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
      { x: 3, y: 4, rotation: 45, includeCatalogMetadata: true }
    ) as GateShape & { id: string };
    catalogShape.id = "gate-2";

    const patch = buildGateCatalogTypePatch(
      catalogShape,
      TRACKDRAW_GATE_ELEMENT_ID
    );

    expect(patch).toMatchObject({ kind: "gate", x: 3, y: 4, rotation: 45 });
    expect(patch?.meta?.catalog).toBeUndefined();
  });

  it("preserves non-catalog meta when switching type", () => {
    const shapeWithTiming = {
      ...baseShape,
      meta: { timing: { role: "split", timingId: "t1" } },
    } as unknown as GateShape;

    const patch = buildGateCatalogTypePatch(
      shapeWithTiming,
      MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID
    );

    expect(patch?.meta).toMatchObject({
      timing: { role: "split", timingId: "t1" },
      catalog: expect.objectContaining({
        elementId: MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
      }),
    });
  });

  it("returns null for a non-gate catalog id", () => {
    expect(
      buildGateCatalogTypePatch(baseShape, TRACKDRAW_FLAG_ELEMENT_ID)
    ).toBeNull();
  });
});
