import {
  createCatalogShapeDraft,
  getTrackElementCatalogEntry,
  TRACKDRAW_CONE_ELEMENT_ID,
  TRACKDRAW_DIVE_GATE_ELEMENT_ID,
  TRACKDRAW_FLAG_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_LABEL_ELEMENT_ID,
  TRACKDRAW_LADDER_ELEMENT_ID,
  TRACKDRAW_START_FINISH_ELEMENT_ID,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import type { ShapeDraft, ShapeKind } from "@/lib/types";

export type EditorTool =
  | "select"
  | "grab"
  | "preset"
  | "gate"
  | "flag"
  | "cone"
  | "label"
  | "polyline"
  | "startfinish"
  | "ladder"
  | "divegate";

export const shapeKindLabels: Record<ShapeKind, string> = {
  gate: "Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Race Line",
  startfinish: "Start / Finish",
  ladder: "Ladder",
  divegate: "Dive Gate",
};

export const toolLabels: Record<EditorTool, string> = {
  select: "Select",
  grab: "Grab",
  preset: "Presets",
  gate: "Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Path",
  startfinish: "Start Pads",
  ladder: "Ladder",
  divegate: "Dive Gate",
};

export const toolShortcuts: Partial<Record<EditorTool, string>> = {
  select: "V",
  grab: "H",
  gate: "G",
  flag: "F",
  cone: "C",
  label: "L",
  polyline: "P",
  startfinish: "S",
  ladder: "R",
  divegate: "D",
};

const toolCatalogEntryIds: Partial<Record<EditorTool, TrackElementCatalogId>> =
  {
    gate: TRACKDRAW_GATE_ELEMENT_ID,
    flag: TRACKDRAW_FLAG_ELEMENT_ID,
    cone: TRACKDRAW_CONE_ELEMENT_ID,
    label: TRACKDRAW_LABEL_ELEMENT_ID,
    startfinish: TRACKDRAW_START_FINISH_ELEMENT_ID,
    ladder: TRACKDRAW_LADDER_ELEMENT_ID,
    divegate: TRACKDRAW_DIVE_GATE_ELEMENT_ID,
  };

export function createShapeForTool(
  tool: EditorTool,
  point: { x: number; y: number },
  options: { gateElementId?: TrackElementCatalogId | null } = {}
): ShapeDraft | null {
  const entryId =
    tool === "gate"
      ? options.gateElementId || TRACKDRAW_GATE_ELEMENT_ID
      : toolCatalogEntryIds[tool];
  if (!entryId) return null;

  const entry = getTrackElementCatalogEntry(entryId);
  const resolvedEntryId =
    tool === "gate" && entry?.kind !== "gate"
      ? TRACKDRAW_GATE_ELEMENT_ID
      : entryId;
  const resolvedEntry = getTrackElementCatalogEntry(resolvedEntryId);

  return createCatalogShapeDraft(resolvedEntryId, {
    x: point.x,
    y: point.y,
    rotation: 0,
    includeCatalogMetadata: resolvedEntry?.official === true,
  });
}
