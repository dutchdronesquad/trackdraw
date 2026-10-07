// @vitest-environment happy-dom
import { saveLocalDraft, loadLocalDraft } from "@/lib/projects";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useEditor } from "@/store/editor";
import {
  resetEditorStore,
  runHistoryStep,
  setEditorTestTime,
} from "../../helpers/editor-store";
import {
  createCatalogShapeDraft,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import {
  serializeDesign,
  serializeDesignForShare,
  parseDesign,
} from "@/lib/track/design";
import { toViewerDesignSnapshot } from "@/lib/track/viewer-snapshot";
import { getShapeArtworkReference } from "@/lib/track/appearance";
import { getGateVisualSpec } from "@/lib/track/elements/visual";
import type { GateShape } from "@/lib/types";

const reference = {
  source: "registry",
  collectionId: "dds",
  textureId: "standard-gate",
  templateId: "gate-standard-v1",
};
beforeEach(() => resetEditorStore());
afterEach(() => vi.useRealTimers());
it("preserves selection through history, editable export/import and published viewer snapshots", () => {
  const id = useEditor.getState().addShape(
    createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
      x: 3,
      y: 4,
      includeCatalogMetadata: true,
    })
  );
  useEditor.getState().clearHistory();
  setEditorTestTime("2026-04-13T10:00:01.000Z");
  useEditor.getState().updateShape(id, { appearance: reference });
  expect(useEditor.getState().track.design.shapeById[id].appearance).toEqual(
    reference
  );
  runHistoryStep(useEditor.temporal.getState().undo);
  expect(
    useEditor.getState().track.design.shapeById[id].appearance
  ).toBeUndefined();
  runHistoryStep(useEditor.temporal.getState().redo);
  const restored = parseDesign(
    JSON.parse(
      JSON.stringify(serializeDesign(useEditor.getState().track.design))
    )
  )!;
  expect(restored.shapeById[id].appearance).toEqual(reference);
  expect(
    parseDesign(serializeDesignForShare(restored))?.shapeById[id].appearance
  ).toEqual(reference);
  expect(saveLocalDraft(restored).ok).toBe(true);
  expect(loadLocalDraft()?.shapeById[id].appearance).toEqual(reference);
  const snapshot = toViewerDesignSnapshot(restored);
  expect(snapshot.design.shapes[0].appearance).toEqual(reference);
  expect(snapshot.requiredViewer.capabilities).toContain(
    "appearance:registry:gate-standard-v1"
  );
  expect(JSON.stringify(restored.shapeById[id].appearance)).not.toContain(
    "https:"
  );
});
it("keeps missing and unsupported references while retaining the original visual", () => {
  const draft = createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
    x: 0,
    y: 0,
    includeCatalogMetadata: true,
  });
  const gate = { ...draft, id: "gate" } as GateShape;
  const base = getGateVisualSpec(gate);
  for (const appearance of [
    reference,
    { ...reference, templateId: "gate-standard-v2" },
    { source: "private", assetId: "owned", templateId: "gate-standard-v1" },
  ]) {
    const shape = { ...gate, appearance };
    expect(getGateVisualSpec(shape)).toEqual(base);
    expect(shape.appearance).toEqual(appearance);
  }
});
it("resets incompatible artwork when switching to 7x6, with undo restoring the club artwork", () => {
  const id = useEditor.getState().addShape(
    createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    })
  );
  useEditor.getState().updateShape(id, { appearance: reference });
  useEditor.getState().clearHistory();
  setEditorTestTime("2026-04-13T10:00:01.000Z");
  useEditor
    .getState()
    .updateShapesCatalogType([id], MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID);
  const changed = useEditor.getState().track.design.shapeById[id] as GateShape;
  expect(changed.appearance).toBeUndefined();
  expect(getGateVisualSpec(changed)).toMatchObject({
    textures: { top: expect.stringContaining("large-top-multigp.webp") },
  });
  runHistoryStep(useEditor.temporal.getState().undo);
  expect(useEditor.getState().track.design.shapeById[id].appearance).toEqual(
    reference
  );
  runHistoryStep(useEditor.temporal.getState().redo);
  setEditorTestTime("2026-04-13T10:00:02.000Z");
  useEditor
    .getState()
    .updateShapesCatalogType([id], MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID);
  expect(
    useEditor.getState().track.design.shapeById[id].appearance
  ).toBeUndefined();
  expect(
    getShapeArtworkReference(useEditor.getState().track.design.shapeById[id])
      ?.collectionId
  ).toBe("multigp");
});

it("ignores stale incompatible artwork and keeps 7x6 timing artwork", () => {
  const gate = {
    ...createCatalogShapeDraft(MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    }),
    id: "gate",
    appearance: reference,
  } as GateShape;
  expect(getShapeArtworkReference(gate)).toMatchObject({
    templateId: "gate-championship-v1",
    textureId: "championship-gate",
  });
  expect(getGateVisualSpec(gate)).toMatchObject({
    textures: { top: expect.stringContaining("large-top-multigp.webp") },
  });
  gate.meta = { ...gate.meta, timing: { role: "start_finish" } };
  expect(getShapeArtworkReference(gate)?.textureId).toBe(
    "championship-gate-red"
  );
  expect(getGateVisualSpec(gate)).toMatchObject({
    textures: { top: expect.stringContaining("large-top-red-multigp.webp") },
  });
});

it("changes batch artwork in one undo step, skips locked items, and restores Race Timing artwork", () => {
  const ids = [0, 1, 2].map((x) =>
    useEditor.getState().addShape(
      createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
        x,
        y: 0,
        includeCatalogMetadata: true,
      })
    )
  );
  useEditor.getState().setShapesLocked([ids[2]], true);
  useEditor.getState().clearHistory();
  setEditorTestTime("2026-04-13T10:00:01.000Z");
  useEditor.getState().updateShapes(ids, { appearance: reference });
  expect(
    useEditor.getState().track.design.shapeById[ids[0]].appearance
  ).toEqual(reference);
  expect(
    useEditor.getState().track.design.shapeById[ids[1]].appearance
  ).toEqual(reference);
  expect(
    useEditor.getState().track.design.shapeById[ids[2]].appearance
  ).toBeUndefined();
  runHistoryStep(useEditor.temporal.getState().undo);
  expect(
    useEditor.getState().track.design.shapeById[ids[0]].appearance
  ).toBeUndefined();
  expect(
    useEditor.getState().track.design.shapeById[ids[1]].appearance
  ).toBeUndefined();
  runHistoryStep(useEditor.temporal.getState().redo);
  setEditorTestTime("2026-04-13T10:00:02.000Z");
  useEditor.getState().updateShapes(ids, { appearance: undefined });
  expect(
    useEditor.getState().track.design.shapeById[ids[0]].appearance
  ).toBeUndefined();
});

it("preserves compatible Championship artwork through snapshots and resets it on a standard gate", () => {
  const id = useEditor
    .getState()
    .addShape(
      createCatalogShapeDraft(MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID, {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      })
    );
  const appearance = {
    ...reference,
    textureId: "championship-gate",
    templateId: "gate-championship-v1",
  };
  useEditor.getState().updateShape(id, { appearance });
  const gate = useEditor.getState().track.design.shapeById[id];
  expect(getShapeArtworkReference(gate)).toEqual(appearance);
  const snapshot = toViewerDesignSnapshot(useEditor.getState().track.design);
  expect(snapshot.design.shapes[0].appearance).toEqual(appearance);
  expect(snapshot.requiredViewer.capabilities).toContain(
    "appearance:registry:gate-championship-v1"
  );
  useEditor
    .getState()
    .updateShapesCatalogType([id], MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID);
  expect(
    useEditor.getState().track.design.shapeById[id].appearance
  ).toBeUndefined();
});
