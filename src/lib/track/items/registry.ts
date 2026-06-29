import {
  TRACKDRAW_BANNER_ELEMENT_ID,
  TRACKDRAW_CONE_ELEMENT_ID,
  TRACKDRAW_DIVE_GATE_ELEMENT_ID,
  TRACKDRAW_FLAG_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_LABEL_ELEMENT_ID,
  TRACKDRAW_LADDER_ELEMENT_ID,
  TRACKDRAW_START_FINISH_ELEMENT_ID,
  TRACKDRAW_TOWER_ELEMENT_ID,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import type {
  DiveGateShape,
  InventoryShapeKind,
  LadderShape,
  Shape,
  ShapeKind,
  TowerShape,
} from "@/lib/types";

export type OrientationSurface = "facing" | "canvasGuide" | "previewGuide";

export type TrackItemToolId =
  | "gate"
  | "flag"
  | "cone"
  | "label"
  | "polyline"
  | "startfinish"
  | "ladder"
  | "tower"
  | "divegate"
  | "barrier";

export type CatalogPlacementToolId = Exclude<TrackItemToolId, "polyline">;

export type SetupComplexity = "light" | "standard" | "heavy";

export type Translate = (
  key: string,
  values?: Record<string, unknown>
) => string;

export type SetupProfile = {
  priority: number;
  prepMinutes: number;
  placeMinutes: number;
  note: string;
  complexity: SetupComplexity;
};

export interface TrackItemAdapter {
  kind: ShapeKind;
  label: string;
  inventory?: boolean;
  tool?: {
    id: TrackItemToolId;
    label: string;
    mobileLabel?: string;
    shortcut?: string;
    defaultCatalogEntryId?: TrackElementCatalogId;
    catalogPlacement?: boolean;
  };
  orientation: Partial<Record<OrientationSurface, number>>;
  frontBack?: boolean;
  numberedObstacle?: boolean;
  timingMarker?: boolean;
  setupHardObstacle?: boolean;
  rotateHandle3d?: boolean;
  catalogPatch?: {
    preserveDiveGateTopY?: boolean;
  };
  canvasRenderRotationOffsetDeg?: number;
  mobileTouchTargetMinScreenPx?: number;
  routeToleranceWidthFactor?: number;
  getSetupProfile: (shape: Shape, t: Translate) => SetupProfile;
}

export type TrackItemToolConfig = NonNullable<TrackItemAdapter["tool"]>;
export type CatalogPlacementToolConfig = TrackItemToolConfig & {
  id: CatalogPlacementToolId;
  catalogPlacement: true;
  defaultCatalogEntryId: TrackElementCatalogId;
};

function getNoSetupProfile(t: Translate): SetupProfile {
  return {
    priority: 99,
    prepMinutes: 0,
    placeMinutes: 0,
    note: t("obstacleNotes.label"),
    complexity: "light",
  };
}

export const trackItemAdapters = [
  {
    kind: "gate",
    label: "Gate",
    inventory: true,
    tool: {
      id: "gate",
      label: "Gate",
      shortcut: "G",
      defaultCatalogEntryId: TRACKDRAW_GATE_ELEMENT_ID,
      catalogPlacement: true,
    },
    orientation: { facing: 0, canvasGuide: 90, previewGuide: 0 },
    frontBack: true,
    numberedObstacle: true,
    timingMarker: true,
    setupHardObstacle: true,
    rotateHandle3d: true,
    canvasRenderRotationOffsetDeg: 180,
    mobileTouchTargetMinScreenPx: 44,
    routeToleranceWidthFactor: 0.42,
    getSetupProfile: (_shape, t) => ({
      priority: 3,
      prepMinutes: 1,
      placeMinutes: 2,
      note: t("obstacleNotes.gate"),
      complexity: "standard" as const,
    }),
  },
  {
    kind: "tower",
    label: "Tower",
    tool: {
      id: "tower",
      label: "Tower",
      shortcut: "T",
      defaultCatalogEntryId: TRACKDRAW_TOWER_ELEMENT_ID,
      catalogPlacement: true,
    },
    orientation: { facing: 0, canvasGuide: 90, previewGuide: 0 },
    frontBack: true,
    numberedObstacle: true,
    setupHardObstacle: true,
    rotateHandle3d: true,
    canvasRenderRotationOffsetDeg: 180,
    mobileTouchTargetMinScreenPx: 44,
    routeToleranceWidthFactor: 0.42,
    getSetupProfile: (shape, t) => {
      const s = shape as TowerShape;
      const levelCount = Math.max(1, Math.min(4, Math.round(s.levels ?? 1)));
      const elevationFactor = Math.max(0, Math.round(s.elevation ?? 0));
      return {
        priority: 2,
        prepMinutes: 4 + levelCount,
        placeMinutes: 6 + levelCount + elevationFactor,
        note: t("obstacleNotes.tower"),
        complexity: "heavy" as const,
      };
    },
  },
  {
    kind: "flag",
    label: "Flag",
    inventory: true,
    tool: {
      id: "flag",
      label: "Flag",
      shortcut: "F",
      defaultCatalogEntryId: TRACKDRAW_FLAG_ELEMENT_ID,
      catalogPlacement: true,
    },
    orientation: { facing: 0, canvasGuide: 0, previewGuide: -90 },
    rotateHandle3d: true,
    getSetupProfile: (_shape, t) => ({
      priority: 4,
      prepMinutes: 1,
      placeMinutes: 1,
      note: t("obstacleNotes.flag"),
      complexity: "light" as const,
    }),
  },
  {
    kind: "cone",
    label: "Cone",
    inventory: true,
    tool: {
      id: "cone",
      label: "Cone",
      shortcut: "C",
      defaultCatalogEntryId: TRACKDRAW_CONE_ELEMENT_ID,
    },
    orientation: { facing: 0, canvasGuide: -90, previewGuide: 0 },
    getSetupProfile: (_shape, t) => ({
      priority: 5,
      prepMinutes: 0,
      placeMinutes: 1,
      note: t("obstacleNotes.cone"),
      complexity: "light" as const,
    }),
  },
  {
    kind: "label",
    label: "Label",
    tool: {
      id: "label",
      label: "Label",
      shortcut: "L",
      defaultCatalogEntryId: TRACKDRAW_LABEL_ELEMENT_ID,
    },
    orientation: { facing: 0, canvasGuide: -90, previewGuide: 0 },
    getSetupProfile: (_shape, t) => getNoSetupProfile(t),
  },
  {
    kind: "polyline",
    label: "Race Line",
    tool: { id: "polyline", label: "Path", shortcut: "P" },
    orientation: { facing: 0, canvasGuide: -90, previewGuide: 0 },
    getSetupProfile: (_shape, t) => getNoSetupProfile(t),
  },
  {
    kind: "startfinish",
    label: "Start / Finish",
    inventory: true,
    tool: {
      id: "startfinish",
      label: "Start Pads",
      mobileLabel: "Start",
      shortcut: "S",
      defaultCatalogEntryId: TRACKDRAW_START_FINISH_ELEMENT_ID,
    },
    orientation: { facing: 0, canvasGuide: -90, previewGuide: 0 },
    frontBack: true,
    setupHardObstacle: true,
    getSetupProfile: (_shape, t) => ({
      priority: 0,
      prepMinutes: 2,
      placeMinutes: 3,
      note: t("obstacleNotes.startfinish"),
      complexity: "standard" as const,
    }),
  },
  {
    kind: "ladder",
    label: "Ladder",
    inventory: true,
    tool: {
      id: "ladder",
      label: "Ladder",
      shortcut: "R",
      defaultCatalogEntryId: TRACKDRAW_LADDER_ELEMENT_ID,
      catalogPlacement: true,
    },
    orientation: { facing: 0, canvasGuide: 90, previewGuide: 0 },
    frontBack: true,
    numberedObstacle: true,
    setupHardObstacle: true,
    rotateHandle3d: true,
    canvasRenderRotationOffsetDeg: 180,
    routeToleranceWidthFactor: 0.42,
    getSetupProfile: (shape, t) => {
      const s = shape as LadderShape;
      return {
        priority: 2,
        prepMinutes: 4 + Math.max(0, s.rungs - 3),
        placeMinutes: 7,
        note: t("obstacleNotes.ladder"),
        complexity: "heavy" as const,
      };
    },
  },
  {
    kind: "divegate",
    label: "Dive Gate",
    inventory: true,
    tool: {
      id: "divegate",
      label: "Dive Gate",
      mobileLabel: "Dive",
      shortcut: "D",
      defaultCatalogEntryId: TRACKDRAW_DIVE_GATE_ELEMENT_ID,
      catalogPlacement: true,
    },
    orientation: { facing: 90, canvasGuide: 90, previewGuide: 0 },
    frontBack: true,
    numberedObstacle: true,
    setupHardObstacle: true,
    rotateHandle3d: true,
    catalogPatch: { preserveDiveGateTopY: true },
    routeToleranceWidthFactor: 0.38,
    getSetupProfile: (shape, t) => {
      const s = shape as DiveGateShape;
      const elevationFactor = Math.max(0, (s.elevation ?? 3) - 2.5);
      const tiltFactor = (s.tilt ?? 0) > 20 ? 1 : 0;
      return {
        priority: 1,
        prepMinutes: 5 + tiltFactor,
        placeMinutes: 8 + Math.round(elevationFactor),
        note: t("obstacleNotes.divegate"),
        complexity: "heavy" as const,
      };
    },
  },
  {
    kind: "barrier",
    label: "Barrier",
    inventory: true,
    tool: {
      id: "barrier",
      label: "Barrier",
      mobileLabel: "Barrier",
      shortcut: "B",
      defaultCatalogEntryId: TRACKDRAW_BANNER_ELEMENT_ID,
      catalogPlacement: true,
    },
    orientation: { facing: 0, canvasGuide: 90, previewGuide: 0 },
    numberedObstacle: false,
    setupHardObstacle: false,
    rotateHandle3d: true,
    canvasRenderRotationOffsetDeg: 180,
    routeToleranceWidthFactor: 0,
    getSetupProfile: (_shape, t) => ({
      priority: 4,
      prepMinutes: 2,
      placeMinutes: 2,
      note: t("obstacleNotes.barrier"),
      complexity: "standard" as const,
    }),
  },
] satisfies TrackItemAdapter[];

export const trackItemAdapterByKind = Object.fromEntries(
  trackItemAdapters.map((adapter) => [adapter.kind, adapter])
) as Record<ShapeKind, TrackItemAdapter>;

export function getTrackItemAdapter(kind: ShapeKind): TrackItemAdapter {
  return trackItemAdapterByKind[kind];
}

export function getTrackItemAdapterForShape(shape: Shape): TrackItemAdapter {
  return getTrackItemAdapter(shape.kind);
}

export function getShapeKindLabel(kind: ShapeKind, t: Translate): string {
  return t(`kindLabels.${kind}`);
}

export function getToolLabel(toolId: TrackItemToolId, t: Translate): string {
  return t(`toolLabels.${toolId}`);
}

export function getToolMobileLabel(
  toolId: TrackItemToolId,
  t: Translate
): string {
  const hasMobileLabel = Boolean(getTrackItemAdapter(toolId).tool?.mobileLabel);
  return hasMobileLabel
    ? t(`toolMobileLabels.${toolId}`)
    : getToolLabel(toolId, t);
}

export function getDefaultCatalogEntryId(
  kind: ShapeKind
): TrackElementCatalogId | undefined {
  return getTrackItemAdapter(kind).tool?.defaultCatalogEntryId;
}

export function getTrackItemToolConfigs(): TrackItemToolConfig[] {
  return trackItemAdapters
    .map((adapter): TrackItemAdapter["tool"] => adapter.tool)
    .filter((tool): tool is TrackItemToolConfig => Boolean(tool));
}

export function getCatalogPlacementToolConfigs(): CatalogPlacementToolConfig[] {
  return getTrackItemToolConfigs().filter(
    (tool): tool is CatalogPlacementToolConfig =>
      tool.catalogPlacement === true && Boolean(tool.defaultCatalogEntryId)
  );
}

export function hasFrontBackItemOrientation(shape: Shape): boolean {
  return getTrackItemAdapterForShape(shape).frontBack === true;
}

export function getShapeOrientationBaseOffset(
  kind: ShapeKind,
  surface: OrientationSurface
): number {
  return getTrackItemAdapter(kind).orientation[surface] ?? 0;
}

export function getShapeCanvasRenderRotationOffset(shape: Shape): number {
  return getTrackItemAdapterForShape(shape).canvasRenderRotationOffsetDeg ?? 0;
}

export function getMobileTouchTargetMinScreenPx(shape: Shape): number {
  return getTrackItemAdapterForShape(shape).mobileTouchTargetMinScreenPx ?? 32;
}

export function isNumberedTrackObstacle(shape: Shape): boolean {
  return getTrackItemAdapterForShape(shape).numberedObstacle === true;
}

export function isTimingMarkerTrackItem(shape: Shape): boolean {
  return getTrackItemAdapterForShape(shape).timingMarker === true;
}

export function isSetupHardObstacle(shape: Shape): boolean {
  return getTrackItemAdapterForShape(shape).setupHardObstacle === true;
}

export function has3dRotateHandle(shape: Shape): boolean {
  return getTrackItemAdapterForShape(shape).rotateHandle3d === true;
}

export function getObstacleRouteToleranceWidthFactor(shape: Shape): number {
  return getTrackItemAdapterForShape(shape).routeToleranceWidthFactor ?? 0;
}

export function getCatalogPlacementToolIds(): CatalogPlacementToolId[] {
  return getCatalogPlacementToolConfigs().map((tool) => tool.id);
}

export function hasCatalogPlacement(kind: ShapeKind): boolean {
  return Boolean(getTrackItemAdapter(kind).tool?.defaultCatalogEntryId);
}

export function getInventoryKinds(): InventoryShapeKind[] {
  return trackItemAdapters
    .filter((adapter) => adapter.inventory === true)
    .map((adapter) => adapter.kind as InventoryShapeKind);
}
