import { describe, expect, it } from "vitest";
import fixture from "../../fixtures/json-roundtrip.json";
import {
  createImportedProjectCopy,
  parseProjectFile,
} from "@/lib/track/project-file";
import { serializeDesign } from "@/lib/track/design";
import { trackItemAdapters } from "@/lib/track/items/registry";
import type { SerializedTrackDesign } from "@/lib/types";

// A new portable project field must also be represented in this fixture.
const everyPortableField: Record<keyof SerializedTrackDesign, unknown> =
  fixture;

describe("portable project files", () => {
  it("preserves every project field and ordered item in a comprehensive current export", () => {
    const parsed = parseProjectFile(fixture);
    expect(parsed).not.toBeNull();
    expect(serializeDesign(parsed!)).toEqual(everyPortableField);
    expect(new Set(fixture.shapes.map((shape) => shape.kind))).toEqual(
      new Set(trackItemAdapters.map((adapter) => adapter.kind))
    );
    expect(Object.keys(serializeDesign(parsed!)).sort()).toEqual(
      Object.keys(fixture).sort()
    );
  });
  it("imports desktop copies with new project identity and times but identical track content", () => {
    const source = parseProjectFile(fixture)!;
    const copy = createImportedProjectCopy(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.createdAt).not.toBe(source.createdAt);
    expect(serializeDesign(copy)).toEqual({
      ...fixture,
      id: copy.id,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
    });
    expect(serializeDesign(source)).toEqual(fixture);
  });
  it.each([
    null,
    {},
    { ...fixture, version: 99 },
    { ...fixture, version: "2" },
    { ...fixture, id: "" },
    { ...fixture, shapes: [null] },
    { ...fixture, shapes: [fixture.shapes[0], fixture.shapes[0]] },
    {
      ...fixture,
      shapes: [{ ...fixture.shapes[0], kind: "unknown-obstacle" }],
    },
  ])(
    "rejects unsupported or broken files without silently dropping items",
    (value) => {
      expect(parseProjectFile(value)).toBeNull();
    }
  );
  it("accepts normalized storage and refuses dangling references", () => {
    const normalized = parseProjectFile(fixture)!;
    const { shapes: _shapes, ...withoutArray } =
      normalized as typeof normalized & { shapes?: unknown };
    expect(serializeDesign(parseProjectFile(withoutArray)!)).toEqual(fixture);
    expect(
      parseProjectFile({
        ...withoutArray,
        shapeOrder: [...withoutArray.shapeOrder, "missing"],
      })
    ).toBeNull();
  });
  it("migrates legacy rotations once and keeps the migrated layout stable through repeated transfers", () => {
    const legacy = { ...fixture, version: 1 };
    let current = serializeDesign(parseProjectFile(legacy)!);
    expect(current.version).toBe(2);
    for (let i = 0; i < fixture.shapes.length; i++) {
      const shape = fixture.shapes[i];
      expect(current.shapes[i].rotation).toBe(
        ["gate", "ladder", "tower"].includes(shape.kind)
          ? (shape.rotation - 180 + 360) % 360
          : shape.rotation
      );
    }
    const migrated = structuredClone(current);
    for (let i = 0; i < 3; i++)
      current = serializeDesign(
        parseProjectFile(JSON.parse(JSON.stringify(current)))!
      );
    expect(current).toEqual(migrated);
  });
});
