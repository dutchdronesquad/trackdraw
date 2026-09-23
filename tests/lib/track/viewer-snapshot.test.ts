import { describe, expect, it } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import {
  createCatalogShapeDraft,
  MULTIGP_HURDLE_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { toViewerDesignSnapshot } from "@/lib/track/viewer-snapshot";
import type { Shape, TrackDesign } from "@/lib/types";

function withShapes(shapes: Shape[]): TrackDesign {
  const design = createDefaultDesign();
  return {
    ...design,
    title: "Test Track",
    authorName: "Someone Private",
    description: "internal notes",
    tags: ["draft"],
    shapeOrder: shapes.map((s) => s.id),
    shapeById: Object.fromEntries(shapes.map((s) => [s.id, s])),
  };
}

describe("toViewerDesignSnapshot", () => {
  it("strips author, description, tags, and inventory from the snapshot", () => {
    const design = withShapes([]);
    const snapshot = toViewerDesignSnapshot(design);

    expect(snapshot.design.title).toBe("Test Track");
    expect(snapshot.design).not.toHaveProperty("authorName");
    expect(snapshot.design).not.toHaveProperty("description");
    expect(snapshot.design).not.toHaveProperty("tags");
    expect(snapshot.design).not.toHaveProperty("inventory");
    expect(snapshot.design).not.toHaveProperty("mapReference");
    expect(snapshot.design).not.toHaveProperty("createdAt");
    expect(snapshot.snapshotId).toBeTruthy();
    expect(snapshot.snapshotId).not.toBe(design.id);
  });

  it("narrows shape.meta to only the catalog identity, dropping other keys", () => {
    const draft = createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
      x: 1,
      y: 2,
      includeCatalogMetadata: true,
    });
    const gate: Shape = {
      ...draft,
      id: "gate-1",
      meta: { ...draft.meta, timing: { role: "start" } },
    };
    const design = withShapes([gate]);

    const snapshot = toViewerDesignSnapshot(design);
    const viewerShape = snapshot.design.shapes[0];

    expect(viewerShape.meta).toBeDefined();
    expect(viewerShape.meta?.catalog?.elementId).toBe(
      TRACKDRAW_GATE_ELEMENT_ID
    );
    expect(Object.keys(viewerShape.meta ?? {})).toEqual(["catalog"]);
  });

  it("omits meta entirely for a shape with no catalog identity", () => {
    const plainGate: Shape = {
      id: "gate-2",
      kind: "gate",
      x: 0,
      y: 0,
      rotation: 0,
      width: 3,
      height: 2,
    };
    const design = withShapes([plainGate]);

    const snapshot = toViewerDesignSnapshot(design);
    expect(snapshot.design.shapes[0].meta).toBeUndefined();
  });

  it("round-trips field and shape geometry unchanged", () => {
    const gate: Shape = {
      id: "gate-3",
      kind: "gate",
      x: 5,
      y: 7,
      rotation: 90,
      width: 3,
      height: 2,
    };
    const design = withShapes([gate]);

    const snapshot = toViewerDesignSnapshot(design);
    expect(snapshot.design.field).toEqual(design.field);
    expect(snapshot.design.shapes[0]).toMatchObject({
      id: "gate-3",
      kind: "gate",
      x: 5,
      y: 7,
      rotation: 90,
      width: 3,
      height: 2,
    });
  });

  it("requiredViewer.capabilities reflects the shapes/catalog orgs actually used", () => {
    const hurdle = createCatalogShapeDraft(MULTIGP_HURDLE_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    });
    const design = withShapes([{ ...hurdle, id: "hurdle-1" }]);

    const snapshot = toViewerDesignSnapshot(design);

    expect(snapshot.requiredViewer.capabilities).toContain("shape:barrier");
    expect(snapshot.requiredViewer.capabilities).toContain("catalog:multigp");
  });

  it("rejects shapes the current schema cannot safely export", () => {
    // Regression guard: computeRequiredViewer must report every capability a
    // design's shapes actually use, not just the subset the current
    // renderer's RENDERER_CAPABILITIES list happens to contain - otherwise a
    // snapshot needing an unrecognized shape kind would wrongly evaluate as
    // compatible with any renderer.
    const futureShape = {
      id: "future-1",
      kind: "future-kind",
      x: 0,
      y: 0,
      rotation: 0,
    } as unknown as Shape;
    const design = withShapes([futureShape]);

    expect(() => toViewerDesignSnapshot(design)).toThrow();
  });

  it("populates the assets manifest for a design using a textured catalog shape", () => {
    const hurdle = createCatalogShapeDraft(MULTIGP_HURDLE_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    });
    const design = withShapes([{ ...hurdle, id: "hurdle-1" }]);

    const snapshot = toViewerDesignSnapshot(design);

    expect(snapshot.assets).toHaveLength(1);
    expect(snapshot.assets[0]).toMatchObject({
      path: "/assets/models/textures/multigp-obstacles/5x10-hurdle-multigp.webp",
      contentType: "image/webp",
    });
    expect(snapshot.assets[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns an empty assets manifest for a design using only procedural shapes", () => {
    const gate = createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    });
    const design = withShapes([{ ...gate, id: "gate-4" }]);

    const snapshot = toViewerDesignSnapshot(design);

    expect(snapshot.assets).toEqual([]);
  });
});

it("gives identical public content the same identity without leaking unknown shape fields", () => {
  const shape = {
    id: "gate",
    kind: "gate" as const,
    x: 1,
    y: 2,
    rotation: 0,
    width: 3,
    height: 2,
    internalNote: "private",
  };
  const design = withShapes([shape]);
  const a = toViewerDesignSnapshot(design);
  const b = toViewerDesignSnapshot({
    ...design,
    authorName: "Another private author",
  });
  expect(a.snapshotId).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(a).toEqual(b);
  expect(a.design.shapes[0]).not.toHaveProperty("internalNote");
  design.shapeById.gate = { ...shape, x: 2 };
  expect(toViewerDesignSnapshot(design).snapshotId).not.toBe(a.snapshotId);
});
