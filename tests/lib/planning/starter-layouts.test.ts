import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStarterLayoutDesign,
  getStarterLayoutById,
  starterLayouts,
} from "@/lib/planning/starter-layouts";

describe("starter layout helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:00:00.000Z"));
  });

  it("looks up starter layouts by id", () => {
    expect(getStarterLayoutById("open-practice")?.title).toBe(
      "Open Practice Layout"
    );
    expect(getStarterLayoutById("missing")).toBeNull();
    expect(getStarterLayoutById(undefined)).toBeNull();
  });

  it("creates centered starter-layout designs with generated ids", () => {
    const design = createStarterLayoutDesign("technical-ladder-line");
    if (!design) {
      throw new Error("Expected starter layout design");
    }

    const source = starterLayouts.find(
      (layout) => layout.id === "technical-ladder-line"
    );
    if (!source) {
      throw new Error("Expected source layout");
    }

    expect(design.title).toBe(source.title);
    expect(design.shapeOrder).toHaveLength(source.shapes.length);
    expect(design.updatedAt).toBe("2026-04-13T10:00:00.000Z");

    const placedShapes = design.shapeOrder.map((id) => design.shapeById[id]);
    expect(placedShapes.every((shape) => Boolean(shape?.id))).toBe(true);

    const xs = placedShapes.map((shape) => shape.x);
    const ys = placedShapes.map((shape) => shape.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    expect(centerX).toBe(design.field.width / 2);
    expect(centerY).toBe(design.field.height / 2);
  });

  it("returns null for unknown starter layout ids", () => {
    expect(createStarterLayoutDesign("unknown-layout")).toBeNull();
  });
});
