import { describe, expect, it } from "vitest";
import {
  expandGroupedSelection,
  getGroupMemberIds,
  getShapeGroupId,
  getShapeGroupName,
  selectionHasGroupedShapes,
} from "@/lib/track/shape-groups";
import { normalizeDesign } from "@/lib/track/design";

describe("shape group helpers", () => {
  const design = normalizeDesign({
    id: "design-1",
    version: 1,
    title: "Groups",
    description: "",
    tags: [],
    authorName: "",
    inventory: {
      gate: 0,
      ladder: 0,
      divegate: 0,
      startfinish: 0,
      flag: 0,
      cone: 0,
    },
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes: [
      {
        id: "gate-1",
        kind: "gate",
        x: 10,
        y: 8,
        rotation: 0,
        width: 2,
        height: 2,
        meta: { groupId: "group-a", groupName: "Start set" },
      },
      {
        id: "flag-1",
        kind: "flag",
        x: 12,
        y: 8,
        rotation: 0,
        radius: 0.25,
        meta: { groupId: "group-a", groupName: "Start set" },
      },
      {
        id: "cone-1",
        kind: "cone",
        x: 14,
        y: 8,
        rotation: 0,
        radius: 0.2,
      },
    ],
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
  });

  it("reads group id and name from shape meta", () => {
    expect(getShapeGroupId(design.shapeById["gate-1"]!)).toBe("group-a");
    expect(getShapeGroupName(design.shapeById["gate-1"]!)).toBe("Start set");
    expect(getShapeGroupId(design.shapeById["cone-1"]!)).toBeNull();
  });

  it("collects all member ids for a group in design order", () => {
    expect(getGroupMemberIds(design, "group-a")).toEqual(["gate-1", "flag-1"]);
  });

  it("expands grouped selection to include all members", () => {
    expect(expandGroupedSelection(design, ["flag-1"])).toEqual([
      "gate-1",
      "flag-1",
    ]);
    expect(expandGroupedSelection(design, ["cone-1"])).toEqual(["cone-1"]);
  });

  it("detects whether a selection contains grouped shapes", () => {
    expect(
      selectionHasGroupedShapes([
        design.shapeById["gate-1"],
        design.shapeById["cone-1"],
      ])
    ).toBe(true);
    expect(selectionHasGroupedShapes([design.shapeById["cone-1"]])).toBe(false);
  });
});
