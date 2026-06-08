import {
  createCatalogShapeDraft,
  createTrackElementCatalogIdentity,
  getTrackElementCatalogIdentity,
  getTrackElementCatalogEntry,
  TRACKDRAW_CONE_ELEMENT_ID,
  TRACKDRAW_DIVE_GATE_ELEMENT_ID,
  TRACKDRAW_FLAG_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_LABEL_ELEMENT_ID,
  TRACKDRAW_LADDER_ELEMENT_ID,
  TRACKDRAW_START_FINISH_ELEMENT_ID,
  type TrackElementCatalogId,
  type TrackElementCatalogEntry,
} from "@/lib/track/elements/catalog";
import { getDiveGateVisualSpec } from "@/lib/track/elements/visual";
import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  Shape,
  ShapeDraft,
  ShapeKind,
} from "@/lib/types";

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

export function getShapeDisplayLabel(shape: Shape): string {
  const catalogIdentity = getTrackElementCatalogIdentity(shape.meta);
  if (catalogIdentity?.assignedKind === shape.kind) {
    return catalogIdentity.snapshot.name;
  }

  return shapeKindLabels[shape.kind];
}

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
  options: {
    activePlacementElementId?: Partial<
      Record<EditorTool, TrackElementCatalogId>
    >;
  } = {}
): ShapeDraft | null {
  const entryId =
    options.activePlacementElementId?.[tool] ?? toolCatalogEntryIds[tool];
  if (!entryId) return null;

  const entry = getTrackElementCatalogEntry(entryId);
  const defaultForTool = toolCatalogEntryIds[tool];
  const defaultEntry = defaultForTool
    ? getTrackElementCatalogEntry(defaultForTool)
    : null;
  // Safety: if the entry's kind doesn't match the tool's expected kind, fall back
  const resolvedEntryId =
    defaultEntry && entry?.kind !== defaultEntry.kind
      ? (defaultForTool ?? entryId)
      : entryId;
  const resolvedEntry = getTrackElementCatalogEntry(resolvedEntryId);

  return createCatalogShapeDraft(resolvedEntryId, {
    x: point.x,
    y: point.y,
    includeCatalogMetadata: resolvedEntry?.official === true,
  });
}

function buildCatalogTypePatchInner<
  S extends GateShape | FlagShape | LadderShape | DiveGateShape,
>(shape: S, entry: TrackElementCatalogEntry): Partial<S> {
  const draft = createCatalogShapeDraft(entry.id, {
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation,
    includeCatalogMetadata: false,
  });

  // Preserve non-catalog meta (timing markers, group membership, etc.)
  const strippedMeta = shape.meta
    ? Object.fromEntries(
        Object.entries(shape.meta).filter(([k]) => k !== "catalog")
      )
    : {};
  const newCatalogIdentity = entry.official
    ? createTrackElementCatalogIdentity(entry)
    : undefined;
  const newMeta =
    newCatalogIdentity || Object.keys(strippedMeta).length > 0
      ? { ...strippedMeta, catalog: newCatalogIdentity }
      : undefined;

  return { ...draft, meta: newMeta } as unknown as Partial<S>;
}

export function buildGateCatalogTypePatch(
  shape: GateShape,
  targetEntryId: TrackElementCatalogId
): Partial<GateShape> | null {
  const entry = getTrackElementCatalogEntry(targetEntryId);
  if (!entry || entry.kind !== "gate") return null;
  return buildCatalogTypePatchInner(shape, entry);
}

export function buildFlagCatalogTypePatch(
  shape: FlagShape,
  targetEntryId: TrackElementCatalogId
): Partial<FlagShape> | null {
  const entry = getTrackElementCatalogEntry(targetEntryId);
  if (!entry || entry.kind !== "flag") return null;
  return buildCatalogTypePatchInner(shape, entry);
}

export function buildLadderCatalogTypePatch(
  shape: LadderShape,
  targetEntryId: TrackElementCatalogId
): Partial<LadderShape> | null {
  const entry = getTrackElementCatalogEntry(targetEntryId);
  if (!entry || entry.kind !== "ladder") return null;
  return buildCatalogTypePatchInner(shape, entry);
}

export function buildDiveGateCatalogTypePatch(
  shape: DiveGateShape,
  targetEntryId: TrackElementCatalogId
): Partial<DiveGateShape> | null {
  const entry = getTrackElementCatalogEntry(targetEntryId);
  if (!entry || entry.kind !== "divegate") return null;
  const patch = buildCatalogTypePatchInner(shape, entry);

  if (shape.elevation == null) return patch;

  // Convert elevation across coordinate systems so the gate stays at the same
  // visual height. Visual gates (arch/launch) use topY = elevation. The generic
  // gate uses topY = elevation + (width/2)*sin(tilt). Both collapse to the same
  // formula when tilt=0 (the generic default), so this conversion is lossless for
  // the common case and gracefully handles tilted generic → visual switches.
  const sourceIsVisual = !!getDiveGateVisualSpec(shape);
  const tiltRad = ((shape.tilt ?? 0) * Math.PI) / 180;
  const sourceTopY = sourceIsVisual
    ? shape.elevation
    : shape.elevation + ((shape.width ?? 2.8) / 2) * Math.sin(tiltRad);

  const elevMin = entry.elevationMinMeters ?? 0;
  const elevMax = entry.elevationMaxMeters ?? null;
  const newElevation = Math.min(
    elevMax ?? Infinity,
    Math.max(elevMin, sourceTopY)
  );
  if (newElevation > 0.1) {
    return { ...patch, elevation: +newElevation.toFixed(2) };
  }

  return patch;
}
