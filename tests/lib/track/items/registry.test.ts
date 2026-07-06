import { describe, expect, it } from "vitest";
import {
  getGeneratedRouteProfile,
  getCatalogPlacementToolConfigs,
  getInventoryKinds,
  hasCatalogPlacement,
  trackItemAdapters,
} from "@/lib/track/items/registry";
import { getTrackElementCatalogEntry } from "@/lib/track/elements/catalog";
import type { ShapeKind } from "@/lib/types";

const shapeKinds: ShapeKind[] = [
  "gate",
  "tower",
  "flag",
  "cone",
  "label",
  "polyline",
  "startfinish",
  "ladder",
  "divegate",
  "barrier",
];

describe("track item adapters", () => {
  it("registers exactly one adapter for every shape kind", () => {
    expect(trackItemAdapters.map((adapter) => adapter.kind).sort()).toEqual(
      [...shapeKinds].sort()
    );
    expect(new Set(trackItemAdapters.map((adapter) => adapter.kind)).size).toBe(
      shapeKinds.length
    );
  });

  it("keeps catalog placement defaults aligned with adapter kinds", () => {
    for (const tool of getCatalogPlacementToolConfigs()) {
      const adapter = trackItemAdapters.find(
        (candidate) => candidate.tool?.id === tool.id
      );
      const entry = getTrackElementCatalogEntry(tool.defaultCatalogEntryId);

      expect(adapter).toBeTruthy();
      expect(entry).toBeTruthy();
      expect(entry?.kind).toBe(adapter?.kind);
    }
  });

  it("marks only clear pass-through obstacles for generated routes", () => {
    const generatedRouteKinds = trackItemAdapters
      .filter((adapter) => adapter.generatedRoute?.traversal === "through")
      .map((adapter) => adapter.kind)
      .sort();

    expect(generatedRouteKinds).toEqual([
      "divegate",
      "gate",
      "ladder",
      "tower",
    ]);
  });

  it("exposes generated route profiles through shapes", () => {
    expect(
      getGeneratedRouteProfile({
        id: "gate-1",
        kind: "gate",
        x: 10,
        y: 8,
        rotation: 0,
        width: 2,
        height: 2,
      })?.traversal
    ).toBe("through");
    expect(
      getGeneratedRouteProfile({
        id: "cone-1",
        kind: "cone",
        x: 10,
        y: 8,
        rotation: 0,
        radius: 0.25,
      })
    ).toBeNull();
  });
});

describe("getInventoryKinds", () => {
  it("returns only kinds whose adapter has inventory: true", () => {
    const inventoryKinds = getInventoryKinds();
    const inventoryAdapters = trackItemAdapters.filter(
      (adapter) => adapter.inventory === true
    );

    expect(inventoryKinds.sort()).toEqual(
      inventoryAdapters.map((a) => a.kind).sort()
    );
  });

  it("includes the expected inventory kinds", () => {
    const inventoryKinds = getInventoryKinds();
    expect(inventoryKinds).toContain("gate");
    expect(inventoryKinds).toContain("flag");
    expect(inventoryKinds).toContain("cone");
    expect(inventoryKinds).toContain("startfinish");
    expect(inventoryKinds).toContain("ladder");
    expect(inventoryKinds).toContain("divegate");
    expect(inventoryKinds).toContain("barrier");
  });

  it("excludes non-inventory kinds", () => {
    const inventoryKinds = getInventoryKinds();
    expect(inventoryKinds).not.toContain("tower");
    expect(inventoryKinds).not.toContain("label");
    expect(inventoryKinds).not.toContain("polyline");
  });
});

describe("hasCatalogPlacement", () => {
  it("returns true for kinds with a defaultCatalogEntryId in their tool", () => {
    const catalogKinds = trackItemAdapters
      .filter((adapter) => Boolean(adapter.tool?.defaultCatalogEntryId))
      .map((adapter) => adapter.kind);

    for (const kind of catalogKinds) {
      expect(hasCatalogPlacement(kind)).toBe(true);
    }
  });

  it("returns false for kinds without catalog placement", () => {
    const nonCatalogKinds = trackItemAdapters
      .filter((adapter) => !adapter.tool?.defaultCatalogEntryId)
      .map((adapter) => adapter.kind);

    for (const kind of nonCatalogKinds) {
      expect(hasCatalogPlacement(kind)).toBe(false);
    }
  });

  it("returns true for all tool-based kinds with a defaultCatalogEntryId", () => {
    expect(hasCatalogPlacement("gate")).toBe(true);
    expect(hasCatalogPlacement("flag")).toBe(true);
    expect(hasCatalogPlacement("ladder")).toBe(true);
    expect(hasCatalogPlacement("tower")).toBe(true);
    expect(hasCatalogPlacement("cone")).toBe(true);
    expect(hasCatalogPlacement("label")).toBe(true);
    expect(hasCatalogPlacement("startfinish")).toBe(true);
    expect(hasCatalogPlacement("divegate")).toBe(true);
  });

  it("returns false for polyline which has no tool definition", () => {
    expect(hasCatalogPlacement("polyline")).toBe(false);
  });
});
