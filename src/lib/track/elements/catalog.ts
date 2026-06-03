import { feetToMeters, type MeasurementUnitSystem } from "@/lib/track/units";
import type { PolylineShape, Shape, ShapeDraft } from "@/lib/types";

export const TRACKDRAW_GATE_ELEMENT_ID = "trackdraw-generic-gate";
export const TRACKDRAW_FLAG_ELEMENT_ID = "trackdraw-generic-flag";
export const TRACKDRAW_CONE_ELEMENT_ID = "trackdraw-generic-cone";
export const TRACKDRAW_LABEL_ELEMENT_ID = "trackdraw-generic-label";
export const TRACKDRAW_START_FINISH_ELEMENT_ID =
  "trackdraw-generic-start-finish";
export const TRACKDRAW_LADDER_ELEMENT_ID = "trackdraw-generic-ladder";
export const TRACKDRAW_DIVE_GATE_ELEMENT_ID = "trackdraw-generic-dive-gate";
export const MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID = "multigp-standard-gate-5x5";

export type TrackElementCatalogId =
  | typeof TRACKDRAW_GATE_ELEMENT_ID
  | typeof TRACKDRAW_FLAG_ELEMENT_ID
  | typeof TRACKDRAW_CONE_ELEMENT_ID
  | typeof TRACKDRAW_LABEL_ELEMENT_ID
  | typeof TRACKDRAW_START_FINISH_ELEMENT_ID
  | typeof TRACKDRAW_LADDER_ELEMENT_ID
  | typeof TRACKDRAW_DIVE_GATE_ELEMENT_ID
  | typeof MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID;

type PlaceableCatalogShape = Exclude<Shape, PolylineShape>;
export type TrackElementShapeDraft = ShapeDraft<PlaceableCatalogShape>;

export interface TrackElementDimensions {
  widthMeters?: number;
  heightMeters?: number;
  radiusMeters?: number;
  sizeMeters?: number;
  display: {
    unitSystem: MeasurementUnitSystem;
    label: string;
  };
}

export interface TrackElementSource {
  label: string;
  url: string;
}

export interface TrackElementCatalogEntry {
  id: TrackElementCatalogId;
  name: string;
  organization?: string;
  kind: PlaceableCatalogShape["kind"];
  official?: boolean;
  dimensions: TrackElementDimensions;
  defaultShape: TrackElementShapeDraft;
  tags: string[];
  sources?: TrackElementSource[];
  render2d?: {
    icon?: string;
  };
  render3d?: {
    modelHint?: string;
  };
  exportHints?: {
    simulatorFriendly?: boolean;
  };
}

const trackdrawGateDefaults = {
  kind: "gate",
  x: 0,
  y: 0,
  rotation: 0,
  width: 2,
  height: 2,
  thick: 0.2,
  color: "#3b82f6",
} satisfies TrackElementShapeDraft;

const trackdrawFlagDefaults = {
  kind: "flag",
  x: 0,
  y: 0,
  rotation: 0,
  radius: 0.25,
  poleHeight: 3.5,
  color: "#a855f7",
} satisfies TrackElementShapeDraft;

export const trackElementCatalog = [
  {
    id: TRACKDRAW_GATE_ELEMENT_ID,
    name: "TrackDraw Gate",
    organization: "TrackDraw",
    kind: "gate",
    dimensions: {
      widthMeters: trackdrawGateDefaults.width,
      heightMeters: trackdrawGateDefaults.height,
      display: { unitSystem: "metric", label: "2 x 2 m" },
    },
    defaultShape: trackdrawGateDefaults,
    tags: ["generic", "race", "practice"],
    render2d: { icon: "gate" },
    render3d: { modelHint: "gate-frame" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
    name: "MultiGP Standard Gate 5x5",
    organization: "MultiGP",
    kind: "gate",
    official: true,
    dimensions: {
      widthMeters: feetToMeters(5),
      heightMeters: feetToMeters(5),
      display: { unitSystem: "imperial", label: "5 ft x 5 ft" },
    },
    defaultShape: {
      ...trackdrawGateDefaults,
      width: feetToMeters(5),
      height: feetToMeters(5),
    },
    tags: ["official", "race", "practice", "multigp"],
    sources: [
      {
        label: "MultiGP Standard Gate 5x5",
        url: "https://shop.multigp.com/product/standard-multigp-gate-5x5/",
      },
    ],
    render2d: { icon: "gate" },
    render3d: { modelHint: "gate-frame" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: TRACKDRAW_FLAG_ELEMENT_ID,
    name: "TrackDraw Flag",
    organization: "TrackDraw",
    kind: "flag",
    dimensions: {
      radiusMeters: trackdrawFlagDefaults.radius,
      heightMeters: trackdrawFlagDefaults.poleHeight,
      display: { unitSystem: "metric", label: "0.25 m radius, 3.5 m pole" },
    },
    defaultShape: trackdrawFlagDefaults,
    tags: ["generic", "race", "practice"],
    render2d: { icon: "flag" },
    render3d: { modelHint: "flag-pole" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: TRACKDRAW_CONE_ELEMENT_ID,
    name: "TrackDraw Cone",
    organization: "TrackDraw",
    kind: "cone",
    dimensions: {
      radiusMeters: 0.2,
      display: { unitSystem: "metric", label: "0.2 m radius" },
    },
    defaultShape: {
      kind: "cone",
      x: 0,
      y: 0,
      rotation: 0,
      radius: 0.2,
      color: "#f97316",
    },
    tags: ["generic", "practice"],
    render2d: { icon: "cone" },
    render3d: { modelHint: "cone" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: TRACKDRAW_LABEL_ELEMENT_ID,
    name: "TrackDraw Label",
    organization: "TrackDraw",
    kind: "label",
    dimensions: {
      display: { unitSystem: "metric", label: "Text label" },
    },
    defaultShape: {
      kind: "label",
      x: 0,
      y: 0,
      rotation: 0,
      text: "Gate A",
      fontSize: 18,
      color: "#e2e8f0",
    },
    tags: ["generic", "annotation"],
    render2d: { icon: "label" },
  },
  {
    id: TRACKDRAW_START_FINISH_ELEMENT_ID,
    name: "TrackDraw Start / Finish",
    organization: "TrackDraw",
    kind: "startfinish",
    dimensions: {
      widthMeters: 3,
      display: { unitSystem: "metric", label: "3 m wide" },
    },
    defaultShape: {
      kind: "startfinish",
      x: 0,
      y: 0,
      rotation: 0,
      width: 3,
      color: "#f59e0b",
    },
    tags: ["generic", "race", "timing-compatible"],
    render2d: { icon: "startfinish" },
    render3d: { modelHint: "start-pads" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: TRACKDRAW_LADDER_ELEMENT_ID,
    name: "TrackDraw Ladder",
    organization: "TrackDraw",
    kind: "ladder",
    dimensions: {
      widthMeters: 2,
      heightMeters: 6,
      display: { unitSystem: "metric", label: "2 x 6 m, 3 rungs" },
    },
    defaultShape: {
      kind: "ladder",
      x: 0,
      y: 0,
      rotation: 0,
      width: 2,
      height: 6,
      rungs: 3,
      elevation: 0,
      color: "#14b8a6",
    },
    tags: ["generic", "technical", "practice"],
    render2d: { icon: "ladder" },
    render3d: { modelHint: "ladder-gate" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: TRACKDRAW_DIVE_GATE_ELEMENT_ID,
    name: "TrackDraw Dive Gate",
    organization: "TrackDraw",
    kind: "divegate",
    dimensions: {
      sizeMeters: 2.8,
      display: { unitSystem: "metric", label: "2.8 m square" },
    },
    defaultShape: {
      kind: "divegate",
      x: 0,
      y: 0,
      rotation: 0,
      size: 2.8,
      thick: 0.2,
      tilt: 0,
      elevation: 3,
      color: "#f97316",
    },
    tags: ["generic", "technical", "practice"],
    render2d: { icon: "divegate" },
    render3d: { modelHint: "dive-gate" },
    exportHints: { simulatorFriendly: true },
  },
] satisfies TrackElementCatalogEntry[];

const trackElementCatalogMap = new Map(
  trackElementCatalog.map((entry) => [entry.id, entry])
);

export function getTrackElementCatalogEntry(
  id: string | null | undefined
): TrackElementCatalogEntry | null {
  if (!id) return null;
  return trackElementCatalogMap.get(id as TrackElementCatalogId) ?? null;
}

export function createCatalogShapeDraft(
  entryId: TrackElementCatalogId,
  placement: {
    x: number;
    y: number;
    rotation?: number;
    color?: string;
    includeCatalogMetadata?: boolean;
  }
): TrackElementShapeDraft {
  const entry = getTrackElementCatalogEntry(entryId);
  if (!entry) {
    throw new Error(`Unknown track element catalog entry: ${entryId}`);
  }

  const { includeCatalogMetadata, ...placementOverrides } = placement;
  const draft = {
    ...entry.defaultShape,
    ...placementOverrides,
    rotation: placement.rotation ?? entry.defaultShape.rotation,
  } satisfies TrackElementShapeDraft;

  if (!includeCatalogMetadata) return draft;

  return {
    ...draft,
    meta: {
      ...draft.meta,
      catalogElementId: entry.id,
      catalogElementName: entry.name,
      catalogOrganization: entry.organization,
      officialCatalogElement: entry.official === true,
    },
  } satisfies TrackElementShapeDraft;
}
