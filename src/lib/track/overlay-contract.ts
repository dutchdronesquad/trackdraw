import { serializeDesign, serializeDesignForShare } from "@/lib/track/design";
import {
  getOverlayPrepReport,
  type OverlayPrepReport,
} from "@/lib/track/overlay-prep";
import type { SerializedTrackDesign, TrackDesign } from "@/lib/types";

export const TRACKDRAW_OVERLAY_CONTRACT_SCHEMA = "trackdraw.overlay.v1";
export const TRACKDRAW_OVERLAY_CONTRACT_VERSION = 1;

export interface TrackDrawOverlayCoordinateSystem {
  fieldOrigin: TrackDesign["field"]["origin"];
  fieldUnits: "meters";
  routeDistanceUnits: "meters";
  routeProgressRange: "0..1";
}

export interface TrackDrawOverlayContract {
  contractVersion: typeof TRACKDRAW_OVERLAY_CONTRACT_VERSION;
  coordinateSystem: TrackDrawOverlayCoordinateSystem;
  design: SerializedTrackDesign;
  generatedAt: string;
  overlayPrep: OverlayPrepReport;
  schema: typeof TRACKDRAW_OVERLAY_CONTRACT_SCHEMA;
}

export function buildTrackDrawOverlayContract(
  design: TrackDesign,
  options: {
    generatedAt?: string;
    includeMapReference?: boolean;
  } = {}
): TrackDrawOverlayContract {
  const serializedDesign =
    options.includeMapReference === true
      ? serializeDesign(design)
      : serializeDesignForShare(design);

  return {
    contractVersion: TRACKDRAW_OVERLAY_CONTRACT_VERSION,
    coordinateSystem: {
      fieldOrigin: design.field.origin,
      fieldUnits: "meters",
      routeDistanceUnits: "meters",
      routeProgressRange: "0..1",
    },
    design: serializedDesign,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    overlayPrep: getOverlayPrepReport(design),
    schema: TRACKDRAW_OVERLAY_CONTRACT_SCHEMA,
  };
}
