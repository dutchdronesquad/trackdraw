import type {
  TowerShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  Shape,
} from "@/lib/types";
import {
  TRACKDRAW_DIVE_GATE_ELEMENT_ID,
  TRACKDRAW_TOWER_ELEMENT_ID,
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
  type DiveGateVisualSpec,
  type TowerVisualSpec,
  type FrameOnlyGateVisualSpec,
  type FlagVisualSpec,
  type GateVisualSpec,
  type LadderVisualSpec,
  type TrackElementVisualSpec,
} from "@/lib/track/elements/catalog";
import { getShapeTimingMarker } from "@/lib/track/timing";

const START_FINISH_TOP_TEXTURES: Record<string, string> = {
  "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-top-regular-50-percent.webp":
    "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-top-red-50-percent.webp",
  "/assets/models/textures/multigp-obstacles/large-top-multigp.webp":
    "/assets/models/textures/multigp-obstacles/large-top-red-multigp.webp",
};

const START_FINISH_TOP_COLOR = "#8A181B";
const MULTIGP_TOP_PANEL_COLOR = "#202e5d";

function withStartFinishTopTexture(visual: GateVisualSpec): GateVisualSpec {
  if (visual.variant !== "panel-frame") return visual;
  const top = visual.textures.top;
  const redTop = top ? (START_FINISH_TOP_TEXTURES[top] ?? top) : top;
  const topColor = visual.panels.top.color;
  const redColor =
    topColor === MULTIGP_TOP_PANEL_COLOR ? START_FINISH_TOP_COLOR : topColor;
  if (redTop === top && redColor === topColor) return visual;
  return {
    ...visual,
    panels: {
      ...visual.panels,
      top: { ...visual.panels.top, color: redColor },
    },
    textures: { ...visual.textures, top: redTop },
  };
}

export function getTrackElementVisualSpec(
  shape: Shape
): TrackElementVisualSpec | null {
  const catalogIdentity = getTrackElementCatalogIdentity(shape.meta);
  const catalogVisual = getTrackElementCatalogEntry(
    catalogIdentity?.elementId
  )?.visual;

  if (catalogVisual?.kind === shape.kind) {
    return catalogVisual;
  }

  if (shape.kind === "gate") {
    return getFallbackGateVisualSpec(shape);
  }

  return null;
}

export function getGateVisualSpec(shape: GateShape): GateVisualSpec {
  const visual = getTrackElementVisualSpec(shape);
  const base =
    visual?.kind === "gate" ? visual : getFallbackGateVisualSpec(shape);
  const timing = getShapeTimingMarker(shape);
  return timing?.role === "start_finish"
    ? withStartFinishTopTexture(base)
    : base;
}

export function getFlagVisualSpec(shape: FlagShape): FlagVisualSpec | null {
  const visual = getTrackElementVisualSpec(shape);
  if (visual?.kind === "flag") return visual;
  return null;
}

export function getLadderVisualSpec(
  shape: LadderShape
): LadderVisualSpec | null {
  const visual = getTrackElementVisualSpec(shape);
  if (visual?.kind === "ladder") return visual;
  return null;
}

export function getTowerVisualSpec(shape: TowerShape): TowerVisualSpec | null {
  const visual = getTrackElementVisualSpec(shape);
  if (visual?.kind === "tower") return visual;
  return null;
}

function getTowerEntryId(shape: TowerShape) {
  const catalogIdentity = getTrackElementCatalogIdentity(shape.meta);
  if (catalogIdentity) return catalogIdentity.elementId;
  return TRACKDRAW_TOWER_ELEMENT_ID;
}

export function getTowerElevationMin(shape: TowerShape): number {
  const entry = getTrackElementCatalogEntry(getTowerEntryId(shape));
  return entry?.elevationMinMeters ?? 0;
}

export function getTowerElevationMax(shape: TowerShape): number | null {
  const entry = getTrackElementCatalogEntry(getTowerEntryId(shape));
  return entry?.elevationMaxMeters ?? null;
}

export function getDiveGateVisualSpec(
  shape: DiveGateShape
): DiveGateVisualSpec | null {
  const visual = getTrackElementVisualSpec(shape);
  if (visual?.kind === "divegate") return visual;
  return null;
}

function getDiveGateEntryId(shape: DiveGateShape) {
  const catalogIdentity = getTrackElementCatalogIdentity(shape.meta);
  if (catalogIdentity) return catalogIdentity.elementId;
  // Non-official shapes (TrackDraw generic dive gate) have no catalog identity stored.
  // Fall back to the generic dive gate entry so min/max clamping still applies.
  return TRACKDRAW_DIVE_GATE_ELEMENT_ID;
}

export function getDiveGateElevationMin(shape: DiveGateShape): number {
  const entry = getTrackElementCatalogEntry(getDiveGateEntryId(shape));
  return entry?.elevationMinMeters ?? 0;
}

export function getDiveGateElevationMax(shape: DiveGateShape): number | null {
  const entry = getTrackElementCatalogEntry(getDiveGateEntryId(shape));
  return entry?.elevationMaxMeters ?? null;
}

function getFallbackGateVisualSpec(shape: GateShape): FrameOnlyGateVisualSpec {
  const color = shape.color ?? "#3b82f6";
  return {
    kind: "gate",
    variant: "frame-only",
    frame: {
      placement: "opening",
      material: "tube",
      color,
      diameterMeters: shape.thick ?? 0.2,
    },
  };
}
