import { describe, expect, it } from "vitest";
import {
  createShapeForTool,
  shapeKindLabels,
  toolLabels,
  toolShortcuts,
} from "@/lib/editor-tools";

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

  it("returns null for non-placement tools", () => {
    expect(createShapeForTool("select", { x: 1, y: 2 })).toBeNull();
    expect(createShapeForTool("grab", { x: 1, y: 2 })).toBeNull();
    expect(createShapeForTool("preset", { x: 1, y: 2 })).toBeNull();
    expect(createShapeForTool("polyline", { x: 1, y: 2 })).toBeNull();
  });
});
