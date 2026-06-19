import { describe, expect, it, vi } from "vitest";
import {
  createDefaultDesign,
  getDesignShapeById,
  normalizeDesign,
  normalizeShape,
  parseDesign,
  serializeDesignForShare,
  serializeDesign,
} from "@/lib/track/design";
import type { PolylineShape, SerializedTrackDesign } from "@/lib/types";

const inventory = {
  gate: 0,
  flag: 0,
  cone: 0,
  startfinish: 0,
  ladder: 0,
  divegate: 0,
  barrier: 0,
};

describe("track design helpers", () => {
  it("normalizes polyline shapes into point-based storage with defaults", () => {
    const shape: PolylineShape = {
      id: "line-1",
      kind: "polyline",
      x: 4,
      y: 6,
      rotation: 0,
      points: [
        { x: 1, y: 2, z: 0 },
        { x: 3, y: 4, z: 1 },
      ],
    };

    const normalized = normalizeShape(shape);
    if (normalized.kind !== "polyline") {
      throw new Error("Expected normalized polyline");
    }

    expect(normalized.x).toBe(0);
    expect(normalized.y).toBe(0);
    expect(normalized.points).toEqual([
      { x: 5, y: 8, z: 0 },
      { x: 7, y: 10, z: 1 },
    ]);
    expect(normalized.frontOffsetDeg).toBe(0);
    expect(normalized.arrowSpacing).toBe(15);
    expect(normalized.strokeWidth).toBe(0.2);
    expect(normalized.smooth).toBe(true);
  });

  it("normalizes serialized designs into shape maps and order", () => {
    const serialized: SerializedTrackDesign = {
      id: "design-1",
      version: 1,
      title: "Layout",
      description: "",
      tags: [],
      authorName: "",
      inventory,
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
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    };

    const normalized = normalizeDesign(serialized);

    expect(normalized.shapeOrder).toEqual(["gate-1"]);
    expect(normalized.shapeById["gate-1"]?.kind).toBe("gate");
  });

  it("migrates legacy dive gate size storage to width", () => {
    const normalized = normalizeDesign({
      id: "design-legacy-divegate",
      version: 2,
      title: "Layout",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "dive-1",
          kind: "divegate",
          x: 10,
          y: 8,
          rotation: 0,
          size: 2.8,
          tilt: 30,
          elevation: 3,
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    } as unknown as SerializedTrackDesign);

    expect(normalized.shapeById["dive-1"]).toMatchObject({
      kind: "divegate",
      width: 2.8,
      tilt: 30,
      elevation: 3,
    });
    expect("size" in normalized.shapeById["dive-1"]!).toBe(false);
  });

  it("normalizes timing marker metadata on supported shapes", () => {
    const design = normalizeDesign({
      id: "design-timing",
      version: 1,
      title: "Layout",
      description: "",
      tags: [],
      authorName: "",
      inventory,
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
          meta: {
            timing: { role: "split", timingId: " split-a " },
          },
        },
        {
          id: "flag-1",
          kind: "flag",
          x: 12,
          y: 8,
          rotation: 0,
          radius: 0.25,
          meta: {
            timing: { role: "split", timingId: "bad" },
          },
        },
        {
          id: "start-1",
          kind: "startfinish",
          x: 14,
          y: 8,
          rotation: 0,
          width: 3,
          meta: {
            timing: { role: "start_finish" },
          },
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    expect(design.shapeById["gate-1"]?.meta?.timing).toEqual({
      role: "split",
      timingId: "split-a",
    });
    expect(design.shapeById["flag-1"]?.meta).toBeUndefined();
    expect(design.shapeById["start-1"]?.meta).toBeUndefined();
  });

  it("serializes normalized designs back to shape arrays", () => {
    const design = normalizeDesign({
      id: "design-2",
      version: 1,
      title: "Layout",
      description: "",
      tags: [],
      authorName: "",
      inventory,
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
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    const serialized = serializeDesign(design);

    expect(serialized.shapes).toHaveLength(1);
    expect(serialized.shapes[0]?.id).toBe("gate-1");
  });

  it("roundtrips JSON project export data back into an editable design", () => {
    const design = normalizeDesign({
      id: "design-json-roundtrip",
      version: 1,
      title: "Race day backup",
      description: "Backup export",
      tags: ["race-day"],
      authorName: "TrackDraw",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      mapReference: {
        type: "map",
        provider: "esri-world-imagery",
        mapStyle: "satellite",
        centerLat: 52.1,
        centerLng: 5.2,
        zoom: 18,
        rotationDeg: 12,
        opacity: 0.7,
        visible: true,
        locked: true,
      },
      shapes: [
        {
          id: "route-1",
          kind: "polyline",
          x: 0,
          y: 0,
          rotation: 0,
          points: [
            { x: 2, y: 3, z: 0 },
            { x: 5, y: 8, z: 1 },
          ],
        },
        {
          id: "gate-start",
          kind: "gate",
          x: 10,
          y: 12,
          rotation: 90,
          width: 3,
          height: 1.8,
          meta: { timing: { role: "start_finish" } },
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:15:00.000Z",
    });

    const exportedJson = JSON.stringify(serializeDesign(design));
    const importedDesign = parseDesign(JSON.parse(exportedJson));

    expect(importedDesign?.id).toBe("design-json-roundtrip");
    expect(importedDesign?.shapeOrder).toEqual(["route-1", "gate-start"]);
    expect(importedDesign?.mapReference?.provider).toBe("esri-world-imagery");
    expect(importedDesign?.shapeById["gate-start"]?.meta?.timing).toEqual({
      role: "start_finish",
    });
    expect(importedDesign?.shapeById["route-1"]?.kind).toBe("polyline");
  });

  it("keeps map references in project serialization and strips them from share serialization", () => {
    const design = normalizeDesign({
      id: "design-map",
      version: 1,
      title: "Layout",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      mapReference: {
        type: "map",
        provider: "esri-world-imagery",
        mapStyle: "satellite",
        centerLat: 52.1,
        centerLng: 5.2,
        zoom: 18,
        rotationDeg: 370,
        opacity: 2,
        visible: true,
        locked: false,
      },
      shapes: [],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    expect(design.mapReference?.centerLat).toBe(52.1);
    expect(design.mapReference?.centerLng).toBeCloseTo(5.2, 6);
    expect(design.mapReference?.rotationDeg).toBe(10);
    expect(design.mapReference?.opacity).toBe(1);
    expect(design.mapReference?.locked).toBe(true);
    expect(serializeDesign(design).mapReference?.centerLat).toBe(52.1);
    expect(serializeDesignForShare(design).mapReference).toBeNull();
  });

  it("parses valid design-like values and rejects invalid ones", () => {
    const parsed = parseDesign({
      id: "design-3",
      version: 1,
      title: "Layout",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    expect(parsed?.id).toBe("design-3");
    expect(parseDesign(null)).toBeNull();
    expect(parseDesign({ nope: true })).toBeNull();
  });

  it("looks up shapes by id from normalized designs", () => {
    const design = normalizeDesign({
      id: "design-4",
      version: 1,
      title: "Layout",
      description: "",
      tags: [],
      authorName: "",
      inventory,
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
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    expect(getDesignShapeById(design, "gate-1")?.id).toBe("gate-1");
    expect(getDesignShapeById(design, "missing")).toBeNull();
  });

  it("creates a default design with consistent timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:00:00.000Z"));

    const design = createDefaultDesign();

    expect(design.title).toBe("New Track");
    expect(design.createdAt).toBe("2026-04-13T10:00:00.000Z");
    expect(design.updatedAt).toBe("2026-04-13T10:00:00.000Z");
    expect(design.shapeOrder).toEqual([]);
  });
});
