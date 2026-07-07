import { describe, expect, it } from "vitest";
import {
  generateRaceLineDraft,
  isGeneratedRaceLine,
} from "@/lib/track/generated-route";
import { POLYLINE_3D_HEIGHT_OFFSET } from "@/lib/track/constants";
import { normalizeDesign } from "@/lib/track/design";
import {
  createCatalogShapeDraft,
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
  MULTIGP_CHAMPIONSHIP_LADDER_7X6_ELEMENT_ID,
  MULTIGP_DIVE_GATE_7X6_ELEMENT_ID,
  MULTIGP_DOUBLE_GATE_TOWER_5X5_ELEMENT_ID,
  MULTIGP_LAUNCH_GATE_7X6_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID,
  MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID,
  MULTIGP_TOWER_5X5_ELEMENT_ID,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import { feetToMeters } from "@/lib/track/units";
import type { Shape, TrackDesign } from "@/lib/types";

const inventory = {
  gate: 4,
  flag: 2,
  cone: 2,
  startfinish: 1,
  ladder: 2,
  divegate: 2,
  barrier: 0,
};

function makeDesign(shapes: Shape[]): TrackDesign {
  return normalizeDesign({
    id: "generated-route-test",
    version: 2,
    title: "Generated route test",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes,
    createdAt: "2026-07-03T10:00:00.000Z",
    updatedAt: "2026-07-03T10:00:00.000Z",
  });
}

function gate(
  id: string,
  x: number,
  y: number,
  rotation = 0
): Extract<Shape, { kind: "gate" }> {
  return {
    id,
    kind: "gate",
    x,
    y,
    rotation,
    width: 2,
    height: 2,
  };
}

function ladder(
  id: string,
  x: number,
  y: number,
  rotation = 90
): Extract<Shape, { kind: "ladder" }> {
  return {
    id,
    kind: "ladder",
    x,
    y,
    rotation,
    width: 2.5,
    height: 6,
    rungs: 3,
  };
}

function tower(
  id: string,
  x: number,
  y: number,
  rotation = 90
): Extract<Shape, { kind: "tower" }> {
  return {
    id,
    kind: "tower",
    x,
    y,
    rotation,
    width: 2.5,
    height: 2,
    levels: 1,
    elevation: 1.5,
  };
}

function diveGate(
  id: string,
  x: number,
  y: number,
  rotation = 90
): Extract<Shape, { kind: "divegate" }> {
  return {
    id,
    kind: "divegate",
    x,
    y,
    rotation,
    width: 2,
    height: 2,
    elevation: 3,
  };
}

function flag(
  id: string,
  x: number,
  y: number,
  rotation = 0
): Extract<Shape, { kind: "flag" }> {
  return { id, kind: "flag", x, y, rotation, radius: 0.25 };
}

function catalogShape(
  id: string,
  entryId: TrackElementCatalogId,
  x: number,
  y: number,
  rotation = 90
): Shape {
  return {
    id,
    ...createCatalogShapeDraft(entryId, {
      x,
      y,
      rotation,
      includeCatalogMetadata: true,
    }),
  } as Shape;
}

function renderedLineElevation(point: { z?: number } | undefined): number {
  return Math.max(point?.z ?? 0, 0) + POLYLINE_3D_HEIGHT_OFFSET;
}

describe("generateRaceLineDraft", () => {
  it("builds an editable polyline from supported obstacles in shape order", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        gate("gate-2", 20, 8),
        gate("gate-1", 8, 8),
        ladder("ladder-1", 30, 12),
      ])
    );

    expect(result.report.supportedObstacleIds).toEqual([
      "gate-2",
      "gate-1",
      "ladder-1",
    ]);
    expect(result.report.unsupportedShapeIds).toEqual([]);
    expect(result.draft).toMatchObject({
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      closed: false,
      smooth: true,
      showArrows: true,
      meta: { generatedRoute: true },
    });
    expect(
      isGeneratedRaceLine(
        result.draft
          ? ({ id: "generated-route", ...result.draft } as Shape)
          : null
      )
    ).toBe(true);
    expect(result.draft?.points).toHaveLength(5);
    expect(result.draft?.points[1]).toMatchObject({ x: 20, y: 8 });
    expect(result.draft?.points[2]).toMatchObject({ x: 8, y: 8 });
    expect(result.draft?.points[3]).toMatchObject({ x: 30, y: 12 });
  });

  it("keeps generated waypoints compact for smoother flythroughs", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        gate("gate-1", 5, 8),
        gate("gate-2", 12, 8),
        ladder("ladder-1", 20, 12),
        tower("tower-1", 28, 12),
      ])
    );

    // Entry + four obstacle anchors + exit. Middle obstacles do not get
    // separate approach/depart points, keeping each item at one or two
    // waypoints instead of three.
    expect(result.draft?.points).toHaveLength(6);
    expect(result.draft?.points[1]).toMatchObject({ x: 5, y: 8 });
    expect(result.draft?.points[2]).toMatchObject({ x: 12, y: 8 });
    expect(result.draft?.points[3]).toMatchObject({ x: 20, y: 12 });
    expect(result.draft?.points[4]).toMatchObject({ x: 28, y: 12 });
  });

  it("keeps TrackDraw gates on the low legacy 3D route anchor", () => {
    const result = generateRaceLineDraft(makeDesign([gate("gate-1", 30, 12)]));

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(
      POLYLINE_3D_HEIGHT_OFFSET,
      5
    );
  });

  it("routes MultiGP panel gates through their opening centers in 3D", () => {
    const standard = generateRaceLineDraft(
      makeDesign([
        catalogShape("gate-1", MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, 30, 12),
      ])
    );
    const championship = generateRaceLineDraft(
      makeDesign([
        catalogShape(
          "gate-1",
          MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
          30,
          12
        ),
      ])
    );

    expect(renderedLineElevation(standard.draft?.points[1])).toBeCloseTo(
      feetToMeters(2.5),
      5
    );
    expect(renderedLineElevation(championship.draft?.points[1])).toBeCloseTo(
      feetToMeters(3),
      5
    );
  });

  it("routes TrackDraw ladders through the lower half of the middle opening", () => {
    const result = generateRaceLineDraft(
      makeDesign([ladder("ladder-1", 30, 12)])
    );

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(2.5, 5);
  });

  it("routes TrackDraw towers through the elevated opening center in 3D", () => {
    const result = generateRaceLineDraft(
      makeDesign([tower("tower-1", 30, 12)])
    );

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(2.5, 5);
  });

  it("routes MultiGP ladders so the 3D line passes the visual lower opening center", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        catalogShape(
          "ladder-1",
          MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID,
          30,
          12
        ),
      ])
    );

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(
      feetToMeters(2.5),
      5
    );
  });

  it("routes MultiGP towers so the 3D line passes the nominal elevated opening center", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        catalogShape("tower-1", MULTIGP_TOWER_5X5_ELEMENT_ID, 30, 12),
      ])
    );

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(
      feetToMeters(7.5),
      5
    );
  });

  it("routes MultiGP double towers through the first opening center in 3D", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        catalogShape(
          "tower-1",
          MULTIGP_DOUBLE_GATE_TOWER_5X5_ELEMENT_ID,
          30,
          12
        ),
      ])
    );

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(
      feetToMeters(2.5),
      5
    );
  });

  it("routes MultiGP championship and topless ladders through the lower visual opening center", () => {
    const championship = generateRaceLineDraft(
      makeDesign([
        catalogShape(
          "ladder-1",
          MULTIGP_CHAMPIONSHIP_LADDER_7X6_ELEMENT_ID,
          30,
          12
        ),
      ])
    );
    const topless = generateRaceLineDraft(
      makeDesign([
        catalogShape("ladder-1", MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID, 30, 12),
      ])
    );

    expect(renderedLineElevation(championship.draft?.points[1])).toBeCloseTo(
      feetToMeters(3),
      5
    );
    expect(renderedLineElevation(topless.draft?.points[1])).toBeCloseTo(
      feetToMeters(3),
      5
    );
  });

  it("routes TrackDraw dive gates through their frame center in 3D", () => {
    const result = generateRaceLineDraft(
      makeDesign([diveGate("divegate-1", 30, 12)])
    );

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(3, 5);
  });

  it("routes MultiGP dive gate arches so the 3D line passes the visual opening center", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        catalogShape("divegate-1", MULTIGP_DIVE_GATE_7X6_ELEMENT_ID, 30, 12),
      ])
    );

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(
      feetToMeters(13.5),
      5
    );
  });

  it("keeps MultiGP launch gate line height on the top frame", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        catalogShape(
          "launchgate-1",
          MULTIGP_LAUNCH_GATE_7X6_ELEMENT_ID,
          30,
          12
        ),
      ])
    );

    const anchorPoint = result.draft?.points[1];
    expect(anchorPoint).toMatchObject({ x: 30, y: 12 });
    expect(renderedLineElevation(anchorPoint)).toBeCloseTo(feetToMeters(15), 5);
  });

  it("routes around a flag on the side its own rotation points to, not straight through it", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        gate("gate-1", 0, 0),
        flag("flag-1", 10, 0, 90),
        gate("gate-2", 20, 0),
      ])
    );

    expect(result.report.supportedObstacleIds).toEqual([
      "gate-1",
      "flag-1",
      "gate-2",
    ]);
    // Points: gate-1 approach/anchor (2), flag marker (1), gate-2
    // anchor/depart (2).
    const flagPoint = result.draft?.points[2];
    expect(flagPoint).toBeDefined();
    // The flag is rotated 90deg, so the route should offset toward the side
    // it's actually facing (-y, since the canvas-guide direction points
    // outward from the front and is flipped 180deg) rather than sitting on
    // the flag's own coordinates or guessing a side from travel direction.
    expect(flagPoint?.x).toBeCloseTo(10, 5);
    expect(flagPoint?.y).toBeLessThan(-0.5);
  });

  it("reports unsupported non-route shapes without blocking supported obstacles", () => {
    const label: Extract<Shape, { kind: "label" }> = {
      id: "label-1",
      kind: "label",
      x: 12,
      y: 10,
      rotation: 0,
      text: "Briefing note",
    };

    const result = generateRaceLineDraft(
      makeDesign([gate("gate-1", 8, 8), label, gate("gate-2", 20, 8)])
    );

    expect(result.draft).not.toBeNull();
    expect(result.report.supportedObstacleIds).toEqual(["gate-1", "gate-2"]);
    expect(result.report.unsupportedShapeIds).toEqual(["label-1"]);
    expect(result.report.warnings).toContainEqual({
      type: "unsupported-shape",
      shapeId: "label-1",
    });
  });

  it("returns no draft when no supported obstacles exist", () => {
    const result = generateRaceLineDraft(
      makeDesign([
        {
          id: "cone-1",
          kind: "cone",
          x: 10,
          y: 10,
          rotation: 0,
          radius: 0.3,
        },
      ])
    );

    expect(result.draft).toBeNull();
    expect(result.report.supportedObstacleIds).toEqual([]);
    expect(result.report.warnings.map((warning) => warning.type)).toEqual([
      "unsupported-shape",
      "too-few-obstacles",
    ]);
  });

  it("keeps a one-obstacle draft explicit but warns that the route needs review", () => {
    const result = generateRaceLineDraft(makeDesign([gate("gate-1", 8, 8)]));

    expect(result.draft?.points).toHaveLength(2);
    expect(result.report.warnings).toContainEqual({
      type: "too-few-obstacles",
    });
  });

  it("approaches a gate head-on from the front, not sideways or from the back", () => {
    const result = generateRaceLineDraft(makeDesign([gate("gate-1", 8, 8, 0)]));

    const points = result.draft?.points ?? [];
    expect(points).toHaveLength(2);
    // A gate at rotation 0 gets a compact entry + anchor path. The entry
    // point stays on the gate heading, not sideways along x.
    expect(points[0].x).toBeCloseTo(8, 5);
    expect(points[0].y).toBeCloseTo(10, 5);
    expect(points[1].x).toBeCloseTo(8, 5);
    expect(points[1].y).toBeCloseTo(8, 5);
  });

  it("warns when consecutive supported obstacles are too close together", () => {
    const result = generateRaceLineDraft(
      makeDesign([gate("gate-1", 8, 8), gate("gate-2", 9, 8)])
    );

    expect(result.report.warnings).toContainEqual({
      type: "close-obstacles",
      shapeIds: ["gate-1", "gate-2"],
    });
  });
});
