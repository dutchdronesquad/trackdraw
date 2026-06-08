import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  Shape,
} from "@/lib/types";
import {
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
  type DiveGateVisualSpec,
  type FrameOnlyGateVisualSpec,
  type FlagVisualSpec,
  type GateVisualSpec,
  type LadderVisualSpec,
  type TrackElementVisualSpec,
} from "@/lib/track/elements/catalog";

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
  if (visual?.kind === "gate") return visual;
  return getFallbackGateVisualSpec(shape);
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

export function getDiveGateVisualSpec(
  shape: DiveGateShape
): DiveGateVisualSpec | null {
  const visual = getTrackElementVisualSpec(shape);
  if (visual?.kind === "divegate") return visual;
  return null;
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
