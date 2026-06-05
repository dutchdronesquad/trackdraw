import { describe, expect, it } from "vitest";
import {
  getBatchCatalogKind,
  getBatchCatalogEntryId,
} from "@/components/inspector/views/multi";
import {
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_FLAG_ELEMENT_ID,
  TRACKDRAW_LADDER_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  MULTIGP_CORNER_FLAG_ELEMENT_ID,
  createTrackElementCatalogIdentity,
  getTrackElementCatalogEntry,
} from "@/lib/track/elements/catalog";
import type { Shape } from "@/lib/types";

function gate(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "g1",
    kind: "gate",
    x: 0,
    y: 0,
    rotation: 0,
    width: 3,
    height: 3,
    ...overrides,
  } as Shape;
}

function flag(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "f1",
    kind: "flag",
    x: 0,
    y: 0,
    rotation: 0,
    radius: 1,
    ...overrides,
  } as Shape;
}

function ladder(overrides: Partial<Shape> = {}): Shape {
  return {
    id: "l1",
    kind: "ladder",
    x: 0,
    y: 0,
    rotation: 0,
    width: 2,
    height: 2,
    rungs: 3,
    ...overrides,
  } as Shape;
}

describe("getBatchCatalogKind", () => {
  it("returns null for empty array", () => {
    expect(getBatchCatalogKind([])).toBeNull();
  });

  it("returns null for non-catalog kind", () => {
    const cone = {
      id: "c1",
      kind: "cone",
      x: 0,
      y: 0,
      rotation: 0,
      radius: 1,
    } as Shape;
    expect(getBatchCatalogKind([cone])).toBeNull();
  });

  it("returns null for mixed kinds", () => {
    expect(getBatchCatalogKind([gate(), flag()])).toBeNull();
  });

  it("returns null for mixed obstacle kinds", () => {
    expect(getBatchCatalogKind([gate(), ladder()])).toBeNull();
  });

  it("returns 'gate' for all gates", () => {
    expect(getBatchCatalogKind([gate({ id: "g1" }), gate({ id: "g2" })])).toBe(
      "gate"
    );
  });

  it("returns 'flag' for all flags", () => {
    expect(getBatchCatalogKind([flag({ id: "f1" }), flag({ id: "f2" })])).toBe(
      "flag"
    );
  });

  it("returns 'ladder' for all ladders", () => {
    expect(
      getBatchCatalogKind([ladder({ id: "l1" }), ladder({ id: "l2" })])
    ).toBe("ladder");
  });

  it("returns kind for a single shape", () => {
    expect(getBatchCatalogKind([gate()])).toBe("gate");
  });
});

describe("getBatchCatalogEntryId", () => {
  it("returns default gate ID when shape has no catalog meta", () => {
    expect(getBatchCatalogEntryId(gate(), "gate")).toBe(
      TRACKDRAW_GATE_ELEMENT_ID
    );
  });

  it("returns default flag ID when shape has no catalog meta", () => {
    expect(getBatchCatalogEntryId(flag(), "flag")).toBe(
      TRACKDRAW_FLAG_ELEMENT_ID
    );
  });

  it("returns default ladder ID when shape has no catalog meta", () => {
    expect(getBatchCatalogEntryId(ladder(), "ladder")).toBe(
      TRACKDRAW_LADDER_ELEMENT_ID
    );
  });

  it("returns the catalog entry ID when shape has matching catalog meta", () => {
    const entry = getTrackElementCatalogEntry(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
    )!;
    const meta = { catalog: createTrackElementCatalogIdentity(entry) };
    const shape = gate({ meta });
    expect(getBatchCatalogEntryId(shape, "gate")).toBe(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
    );
  });

  it("returns default ID when catalog meta kind doesn't match requested kind", () => {
    // A gate shape that somehow has a flag catalog entry — falls back to default
    const entry = getTrackElementCatalogEntry(MULTIGP_CORNER_FLAG_ELEMENT_ID)!;
    const meta = { catalog: createTrackElementCatalogIdentity(entry) };
    const shape = gate({ meta });
    expect(getBatchCatalogEntryId(shape, "gate")).toBe(
      TRACKDRAW_GATE_ELEMENT_ID
    );
  });
});
