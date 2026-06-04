import { describe, expect, it } from "vitest";
import {
  getCone2DShape,
  getDiveGate2DShape,
  getFlag2DShape,
  getGate2DShape,
  getLadder2DShape,
  getStartFinish2DShape,
} from "@/lib/track/shape2d";
import { feetToMeters } from "@/lib/track/units";
import {
  createCatalogShapeDraft,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { GateShape } from "@/lib/types";

describe("track 2d shape helpers", () => {
  const ppm = 20;

  it("builds gate and ladder 2d metrics", () => {
    expect(
      getGate2DShape(
        {
          id: "gate-1",
          kind: "gate",
          x: 0,
          y: 0,
          rotation: 0,
          width: 2,
          height: 2,
        },
        ppm
      )
    ).toMatchObject({
      width: 40,
      depth: 4,
      color: "#3b82f6",
      variant: "frame-only",
    });

    expect(
      getLadder2DShape(
        {
          id: "ladder-1",
          kind: "ladder",
          x: 0,
          y: 0,
          rotation: 0,
          width: 2,
          height: 6,
          rungs: 3,
        },
        ppm
      )
    ).toMatchObject({
      width: 40,
      color: "#14b8a6",
    });
    expect(
      getLadder2DShape(
        {
          id: "ladder-1",
          kind: "ladder",
          x: 0,
          y: 0,
          rotation: 0,
          width: 2,
          height: 6,
          rungs: 3,
        },
        ppm
      ).depth
    ).toBeCloseTo(3.6);
  });

  it("builds flag and cone bounds", () => {
    const flag = getFlag2DShape(
      { id: "flag-1", kind: "flag", x: 0, y: 0, rotation: 0, radius: 0.25 },
      ppm
    );
    const cone = getCone2DShape(
      { id: "cone-1", kind: "cone", x: 0, y: 0, rotation: 0, radius: 0.2 },
      ppm
    );

    expect(flag.radius).toBe(5);
    expect(flag.bounds.width).toBeGreaterThan(flag.radius * 2);
    expect(cone.radius).toBe(4);
    expect(cone.selectionRadius).toBeGreaterThan(cone.radius);
  });

  it("builds start-finish pads and dive gate metrics", () => {
    const startFinish = getStartFinish2DShape(
      {
        id: "start-1",
        kind: "startfinish",
        x: 0,
        y: 0,
        rotation: 0,
        width: 3,
      },
      ppm
    );
    const diveGate = getDiveGate2DShape(
      {
        id: "dive-1",
        kind: "divegate",
        x: 0,
        y: 0,
        rotation: 0,
        size: 2.8,
        tilt: 60,
      },
      ppm
    );

    expect(startFinish.pads).toHaveLength(4);
    expect(startFinish.totalWidth).toBe(60);
    expect(diveGate.size).toBe(56);
    expect(diveGate.visibleDepth).toBeGreaterThan(0);
    expect(diveGate.postRadius).toBeGreaterThan(0);
  });

  it("uses catalog panel-frame dimensions for official gate 2d metrics", () => {
    const shape = createCatalogShapeDraft(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
      {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      }
    ) as GateShape;
    const gate = getGate2DShape(shape, ppm);

    expect(gate.variant).toBe("panel-frame");
    if (gate.variant !== "panel-frame") {
      throw new Error("expected panel-frame gate metrics");
    }
    expect(gate.openingWidth).toBeCloseTo(feetToMeters(5) * ppm);
    expect(gate.width).toBeCloseTo(feetToMeters(7) * ppm);
    expect(gate.panels.leftWidth).toBeCloseTo(feetToMeters(1) * ppm);
    expect(gate.panels.rightWidth).toBeCloseTo(feetToMeters(1) * ppm);
    expect(gate.panels.topColor).toBe("#202e5d");
    expect(gate.frame.placement).toBe("outer");
  });
});
