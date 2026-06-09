import {
  createCatalogShapeDraft,
  createTrackElementCatalogIdentity,
  getTrackElementCatalogEntry,
  type TrackElementCatalogEntry,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import { getDiveGateVisualSpec } from "@/lib/track/elements/visual";
import {
  getTrackItemAdapterForShape,
  hasCatalogPlacement,
} from "@/lib/track/items/registry";
import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  Shape,
  TowerShape,
} from "@/lib/types";

type CatalogPatchShape =
  | GateShape
  | FlagShape
  | LadderShape
  | TowerShape
  | DiveGateShape;

function isCatalogPatchShape(shape: Shape): shape is CatalogPatchShape {
  return hasCatalogPlacement(shape.kind);
}

function buildCatalogTypePatchInner<S extends CatalogPatchShape>(
  shape: S,
  entry: TrackElementCatalogEntry
): Partial<S> {
  const draft = createCatalogShapeDraft(entry.id, {
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation,
    includeCatalogMetadata: false,
  });

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

function preserveDiveGateTopY(
  shape: DiveGateShape,
  entry: TrackElementCatalogEntry,
  patch: Partial<DiveGateShape>
): Partial<DiveGateShape> {
  if (shape.elevation == null) return patch;

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

export function buildCatalogTypePatch(
  shape: Shape,
  targetEntryId: TrackElementCatalogId
): Partial<Shape> | null {
  if (!isCatalogPatchShape(shape)) return null;

  const entry = getTrackElementCatalogEntry(targetEntryId);
  if (!entry || entry.kind !== shape.kind) return null;

  const adapter = getTrackItemAdapterForShape(shape);

  if (shape.kind === "divegate" && adapter.catalogPatch?.preserveDiveGateTopY) {
    const patch = buildCatalogTypePatchInner(shape, entry);
    return preserveDiveGateTopY(shape, entry, patch);
  }

  const patch = buildCatalogTypePatchInner(shape, entry);
  return patch as Partial<Shape>;
}

export function buildGateCatalogTypePatch(
  shape: GateShape,
  targetEntryId: TrackElementCatalogId
): Partial<GateShape> | null {
  return buildCatalogTypePatch(
    shape,
    targetEntryId
  ) as Partial<GateShape> | null;
}

export function buildFlagCatalogTypePatch(
  shape: FlagShape,
  targetEntryId: TrackElementCatalogId
): Partial<FlagShape> | null {
  return buildCatalogTypePatch(
    shape,
    targetEntryId
  ) as Partial<FlagShape> | null;
}

export function buildLadderCatalogTypePatch(
  shape: LadderShape,
  targetEntryId: TrackElementCatalogId
): Partial<LadderShape> | null {
  return buildCatalogTypePatch(
    shape,
    targetEntryId
  ) as Partial<LadderShape> | null;
}

export function buildTowerCatalogTypePatch(
  shape: TowerShape,
  targetEntryId: TrackElementCatalogId
): Partial<TowerShape> | null {
  return buildCatalogTypePatch(
    shape,
    targetEntryId
  ) as Partial<TowerShape> | null;
}

export function buildDiveGateCatalogTypePatch(
  shape: DiveGateShape,
  targetEntryId: TrackElementCatalogId
): Partial<DiveGateShape> | null {
  return buildCatalogTypePatch(
    shape,
    targetEntryId
  ) as Partial<DiveGateShape> | null;
}
