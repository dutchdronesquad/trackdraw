import { describe, expect, it } from "vitest";
import {
  buildCatalogTypePatch,
  buildBarrierCatalogTypePatch,
  buildGateCatalogTypePatch,
  buildLadderCatalogTypePatch,
  buildTowerCatalogTypePatch,
} from "@/lib/editor/catalog-type-patch";
import {
  createShapeForTool,
  getShapeDisplayLabel,
  toolLabels,
  toolShortcuts,
} from "@/lib/editor/tool-registry";
import { shapeKindLabels } from "@/lib/track/items/registry";
import {
  createTrackElementCatalogIdentity,
  createCatalogShapeDraft,
  getTrackElementCatalogEntry,
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
  MULTIGP_DOUBLE_GATE_TOWER_5X5_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID,
  TRACKDRAW_BANNER_ELEMENT_ID,
  TRACKDRAW_FENCE_ELEMENT_ID,
  TRACKDRAW_FLAG_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_LADDER_ELEMENT_ID,
  TRACKDRAW_TOWER_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type {
  BarrierShape,
  GateShape,
  LadderShape,
  TowerShape,
} from "@/lib/types";
import { feetToMeters } from "@/lib/track/units";

describe("editor tool helpers", () => {
  it("exposes stable labels and shortcuts", () => {
    expect(shapeKindLabels.startfinish).toBe("Start / Finish");
    expect(toolLabels.polyline).toBe("Path");
    expect(toolLabels.tower).toBe("Tower");
    expect(toolShortcuts.tower).toBe("T");
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
      color: "#14b8a6",
    });
    expect(createShapeForTool("tower", point)).toMatchObject({
      kind: "tower",
      width: 2,
      height: 2,
      levels: 1,
      elevation: 1.5,
      color: "#38bdf8",
    });
    expect(createShapeForTool("divegate", point)).toMatchObject({
      kind: "divegate",
      width: 2.8,
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

  it("keeps catalog identity for generic barrier variants", () => {
    const shape = createShapeForTool(
      "barrier",
      { x: 6, y: 8 },
      {
        activePlacementElementId: {
          barrier: TRACKDRAW_FENCE_ELEMENT_ID,
        },
      }
    );

    expect(shape).toMatchObject({
      kind: "barrier",
      variant: "fence",
      meta: {
        catalog: {
          elementId: TRACKDRAW_FENCE_ELEMENT_ID,
          assignedKind: "barrier",
          official: false,
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

describe("buildTowerCatalogTypePatch", () => {
  it("switches between stacked tower catalog variants", () => {
    const towerShape = createCatalogShapeDraft(TRACKDRAW_TOWER_ELEMENT_ID, {
      x: 3,
      y: 4,
      rotation: 45,
    }) as TowerShape & { id: string };
    towerShape.id = "tower-1";

    const patch = buildTowerCatalogTypePatch(
      towerShape,
      MULTIGP_DOUBLE_GATE_TOWER_5X5_ELEMENT_ID
    );

    expect(patch).toMatchObject({
      kind: "tower",
      x: 3,
      y: 4,
      rotation: 45,
      levels: 2,
      meta: {
        catalog: expect.objectContaining({
          elementId: MULTIGP_DOUBLE_GATE_TOWER_5X5_ELEMENT_ID,
          official: true,
        }),
      },
    });
  });
});

describe("buildCatalogTypePatch", () => {
  it("applies catalog patches through the generic shape entrypoint", () => {
    const towerShape = createCatalogShapeDraft(TRACKDRAW_TOWER_ELEMENT_ID, {
      x: 3,
      y: 4,
      rotation: 45,
    }) as TowerShape & { id: string };
    towerShape.id = "tower-2";

    const patch = buildCatalogTypePatch(
      towerShape,
      MULTIGP_DOUBLE_GATE_TOWER_5X5_ELEMENT_ID
    );

    expect(patch).toMatchObject({
      kind: "tower",
      levels: 2,
      meta: {
        catalog: expect.objectContaining({
          elementId: MULTIGP_DOUBLE_GATE_TOWER_5X5_ELEMENT_ID,
        }),
      },
    });
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

describe("buildLadderCatalogTypePatch", () => {
  it("resets to TrackDraw defaults and clears catalog identity", () => {
    const catalogShape = createCatalogShapeDraft(
      MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID,
      { x: 3, y: 4, rotation: 45, includeCatalogMetadata: true }
    ) as LadderShape & { id: string };
    catalogShape.id = "ladder-1";

    const patch = buildLadderCatalogTypePatch(
      catalogShape,
      TRACKDRAW_LADDER_ELEMENT_ID
    );

    expect(patch).toMatchObject({
      kind: "ladder",
      x: 3,
      y: 4,
      rotation: 45,
      width: 2,
      height: 6,
      rungs: 3,
      color: "#14b8a6",
    });
    expect(patch?.meta?.catalog).toBeUndefined();
  });
});

describe("buildBarrierCatalogTypePatch", () => {
  it("switches between generic barrier variants and keeps catalog identity", () => {
    const bannerShape = createCatalogShapeDraft(TRACKDRAW_BANNER_ELEMENT_ID, {
      x: 3,
      y: 4,
      rotation: 45,
      includeCatalogMetadata: true,
    }) as BarrierShape & { id: string };
    bannerShape.id = "barrier-1";

    const patch = buildBarrierCatalogTypePatch(
      bannerShape,
      TRACKDRAW_FENCE_ELEMENT_ID
    );

    expect(patch).toMatchObject({
      kind: "barrier",
      variant: "fence",
      x: 3,
      y: 4,
      rotation: 45,
      meta: {
        catalog: expect.objectContaining({
          elementId: TRACKDRAW_FENCE_ELEMENT_ID,
          official: false,
        }),
      },
    });
  });
});
