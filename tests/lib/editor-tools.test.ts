import { describe, expect, it } from "vitest";
import {
  createShapeForTool,
  shapeKindLabels,
  toolLabels,
  toolShortcuts,
} from "@/lib/editor-tools";
import {
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  TRACKDRAW_FLAG_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
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
        gateElementId: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
      }
    );

    expect(shape).toMatchObject({
      kind: "gate",
      x: 3,
      y: 4,
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
        gateElementId: MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
      }
    );

    expect(shape).toMatchObject({
      kind: "gate",
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

  it("falls back to the generic gate when a non-gate catalog id is passed", () => {
    expect(
      createShapeForTool(
        "gate",
        { x: 1, y: 2 },
        {
          gateElementId: TRACKDRAW_FLAG_ELEMENT_ID,
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
});
