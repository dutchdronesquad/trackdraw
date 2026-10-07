// @vitest-environment happy-dom
import { saveLocalDraft, loadLocalDraft } from "@/lib/projects";
import { buildCatalogTypePatch } from "@/lib/editor/catalog-type-patch";
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
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import {
  serializeDesign,
  serializeDesignForShare,
  parseDesign,
} from "@/lib/track/design";
import { toViewerDesignSnapshot } from "@/lib/track/viewer-snapshot";
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
it("keeps a requested appearance through incompatible type changes and returning to the standard gate", () => {
  const id = useEditor.getState().addShape(
    createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    })
  );
  useEditor.getState().updateShape(id, { appearance: reference });
  const gate = useEditor.getState().track.design.shapeById[id];
  const patch = buildCatalogTypePatch(gate, TRACKDRAW_GATE_ELEMENT_ID)!;
  useEditor.getState().updateShape(id, patch);
  expect(useEditor.getState().track.design.shapeById[id].appearance).toEqual(
    reference
  );
  const restore = buildCatalogTypePatch(
    useEditor.getState().track.design.shapeById[id],
    MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
  )!;
  useEditor.getState().updateShape(id, restore);
  expect(useEditor.getState().track.design.shapeById[id].appearance).toEqual(
    reference
  );
});
