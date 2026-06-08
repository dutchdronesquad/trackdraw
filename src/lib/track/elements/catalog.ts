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
export const MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID =
  "multigp-championship-gate-7x6";
export const MULTIGP_CORNER_FLAG_ELEMENT_ID = "multigp-corner-flag";
export const MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID =
  "multigp-standard-ladder-5x5";
export const MULTIGP_CHAMPIONSHIP_LADDER_7X6_ELEMENT_ID =
  "multigp-championship-ladder-7x6";
export const MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID =
  "multigp-topless-ladder-7x6";
export const MULTIGP_DIVE_GATE_7X6_ELEMENT_ID = "multigp-dive-gate-7x6";
export const MULTIGP_LAUNCH_GATE_7X6_ELEMENT_ID = "multigp-launch-gate-7x6";

export type TrackElementCatalogId =
  | typeof TRACKDRAW_GATE_ELEMENT_ID
  | typeof TRACKDRAW_FLAG_ELEMENT_ID
  | typeof TRACKDRAW_CONE_ELEMENT_ID
  | typeof TRACKDRAW_LABEL_ELEMENT_ID
  | typeof TRACKDRAW_START_FINISH_ELEMENT_ID
  | typeof TRACKDRAW_LADDER_ELEMENT_ID
  | typeof TRACKDRAW_DIVE_GATE_ELEMENT_ID
  | typeof MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
  | typeof MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID
  | typeof MULTIGP_CORNER_FLAG_ELEMENT_ID
  | typeof MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID
  | typeof MULTIGP_CHAMPIONSHIP_LADDER_7X6_ELEMENT_ID
  | typeof MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID
  | typeof MULTIGP_DIVE_GATE_7X6_ELEMENT_ID
  | typeof MULTIGP_LAUNCH_GATE_7X6_ELEMENT_ID;

type PlaceableCatalogShape = Exclude<Shape, PolylineShape>;
export type TrackElementShapeDraft = ShapeDraft<PlaceableCatalogShape>;
export type GateTrackElementCatalogEntry = TrackElementCatalogEntry & {
  kind: "gate";
};

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

export interface GatePanelVisualSpec {
  widthMeters: number;
  color: string;
}

export interface GateTopPanelVisualSpec {
  heightMeters: number;
  color: string;
}

export interface GateFrameVisualSpec {
  placement: "outer" | "opening";
  material: "pvc" | "tube";
  color: string;
  diameterMeters: number;
}

export type TexturePanelEdge = "top" | "right" | "bottom" | "left";

export interface TextureOrientationSpec {
  textureTopEdgeFaces?: TexturePanelEdge;
  flipX?: boolean;
  flipY?: boolean;
}

export interface PanelTexturePlacementSpec<TSource extends string> {
  source: TSource;
  orientation?: TextureOrientationSpec;
}

export interface GatePanelTextureVisualSpec {
  left: string;
  right: string;
  top?: string;
  placement?: {
    left?: PanelTexturePlacementSpec<"left" | "right" | "top">;
    right?: PanelTexturePlacementSpec<"left" | "right" | "top">;
    top?: PanelTexturePlacementSpec<"left" | "right" | "top">;
  };
}

export interface FrameOnlyGateVisualSpec {
  kind: "gate";
  variant: "frame-only";
  frame: GateFrameVisualSpec;
}

export interface PanelFrameGateVisualSpec {
  kind: "gate";
  variant: "panel-frame";
  panels: {
    left: GatePanelVisualSpec;
    right: GatePanelVisualSpec;
    top: GateTopPanelVisualSpec;
  };
  frame: GateFrameVisualSpec;
  textures: GatePanelTextureVisualSpec;
}

export type GateVisualSpec = FrameOnlyGateVisualSpec | PanelFrameGateVisualSpec;

export interface CornerMarkerFlagVisualSpec {
  kind: "flag";
  variant: "corner-marker";
  poleColor: string;
  textures: {
    front: string;
    back: string;
  };
}

export type FlagVisualSpec = CornerMarkerFlagVisualSpec;

export interface PanelFrameLadderVisualSpec {
  kind: "ladder";
  variant: "panel-frame";
  panels: {
    left: GatePanelVisualSpec;
    right: GatePanelVisualSpec;
    top: GateTopPanelVisualSpec;
  };
  frame: GateFrameVisualSpec;
  textures: GatePanelTextureVisualSpec;
  topPanelPlacement?: "all" | "lower-sections";
}

export type LadderVisualSpec = PanelFrameLadderVisualSpec;

export interface ArchDiveGateVisualSpec {
  kind: "divegate";
  variant: "arch";
  frame: GateFrameVisualSpec;
  banner: {
    color: string;
    sideTexture: string;
    topTexture: string;
    placement?: {
      left?: PanelTexturePlacementSpec<"side" | "top">;
      right?: PanelTexturePlacementSpec<"side" | "top">;
      top?: PanelTexturePlacementSpec<"side" | "top">;
      bottom?: PanelTexturePlacementSpec<"side" | "top">;
    };
  };
}

export interface LaunchGateVisualSpec {
  kind: "divegate";
  variant: "launch";
  frame: GateFrameVisualSpec;
  banner: {
    color: string;
    sideTexture: string;
    topTexture: string;
    placement?: {
      front?: PanelTexturePlacementSpec<"side" | "top">;
      rear?: PanelTexturePlacementSpec<"side" | "top">;
      left?: PanelTexturePlacementSpec<"side" | "top">;
      right?: PanelTexturePlacementSpec<"side" | "top">;
    };
  };
}

export type DiveGateVisualSpec = ArchDiveGateVisualSpec | LaunchGateVisualSpec;

export type TrackElementVisualSpec =
  | GateVisualSpec
  | FlagVisualSpec
  | LadderVisualSpec
  | DiveGateVisualSpec;

export interface TrackElementCatalogEntry {
  id: TrackElementCatalogId;
  name: string;
  organization?: string;
  kind: PlaceableCatalogShape["kind"];
  official?: boolean;
  editable?: {
    color?: boolean;
    dimensions?: boolean;
  };
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
  visual?: TrackElementVisualSpec;
  exportHints?: {
    simulatorFriendly?: boolean;
  };
}

export interface TrackElementCatalogIdentity {
  version: 1;
  elementId: TrackElementCatalogId;
  assignedKind: PlaceableCatalogShape["kind"];
  official: boolean;
  snapshot: {
    name: string;
    organization?: string;
    dimensionsLabel: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlaceableCatalogShapeKind(
  value: unknown
): value is PlaceableCatalogShape["kind"] {
  return (
    value === "gate" ||
    value === "flag" ||
    value === "cone" ||
    value === "label" ||
    value === "startfinish" ||
    value === "ladder" ||
    value === "divegate"
  );
}

function isTrackElementCatalogIdentity(
  value: unknown
): value is TrackElementCatalogIdentity {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (typeof value.elementId !== "string") return false;
  if (!getTrackElementCatalogEntry(value.elementId)) return false;
  if (!isPlaceableCatalogShapeKind(value.assignedKind)) return false;
  if (typeof value.official !== "boolean") return false;
  if (!isRecord(value.snapshot)) return false;
  if (typeof value.snapshot.name !== "string") return false;
  if (
    "organization" in value.snapshot &&
    typeof value.snapshot.organization !== "string"
  ) {
    return false;
  }
  return typeof value.snapshot.dimensionsLabel === "string";
}

const frameOnlyGateDefaults = {
  kind: "gate",
  x: 0,
  y: 0,
  rotation: 0,
  width: 2,
  height: 2,
  thick: 0.2,
  color: "#3b82f6",
} satisfies TrackElementShapeDraft;

const flagDefaults = {
  kind: "flag",
  x: 0,
  y: 0,
  rotation: 0,
  radius: 0.25,
  poleHeight: 3.5,
  color: "#a855f7",
} satisfies TrackElementShapeDraft;

const frameOnlyGateVisual = {
  kind: "gate",
  variant: "frame-only",
  frame: {
    placement: "opening",
    material: "tube",
    color: frameOnlyGateDefaults.color,
    diameterMeters: frameOnlyGateDefaults.thick,
  },
} satisfies GateVisualSpec;

const panelFrameGateVisual = {
  kind: "gate",
  variant: "panel-frame",
  panels: {
    left: { widthMeters: feetToMeters(1), color: "#f8fafc" },
    right: { widthMeters: feetToMeters(1), color: "#f8fafc" },
    top: { heightMeters: feetToMeters(1), color: "#202e5d" },
  },
  frame: {
    placement: "outer",
    material: "pvc",
    color: "#f8fafc",
    diameterMeters: 0.055,
  },
  textures: {
    left: "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-left-panel-regular-50-percent.webp",
    right:
      "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-right-panel-regular-50-percent.webp",
    top: "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-top-regular-50-percent.webp",
    placement: {
      left: { source: "right", orientation: { textureTopEdgeFaces: "top" } },
      right: { source: "left", orientation: { textureTopEdgeFaces: "top" } },
      top: { source: "top", orientation: { textureTopEdgeFaces: "top" } },
    },
  },
} satisfies GateVisualSpec;

const panelFrameChampionshipGateVisual = {
  ...panelFrameGateVisual,
  panels: {
    left: { widthMeters: feetToMeters(1.5), color: "#f8fafc" },
    right: { widthMeters: feetToMeters(1.5), color: "#f8fafc" },
    top: { heightMeters: feetToMeters(2), color: "#202e5d" },
  },
  textures: {
    left: "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
    right:
      "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
    top: "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
    placement: {
      left: { source: "left", orientation: { flipX: true } },
      right: { source: "left", orientation: { flipX: true } },
      top: { source: "top", orientation: { flipX: true } },
    },
  },
} satisfies GateVisualSpec;

export const trackElementCatalog = [
  {
    id: TRACKDRAW_GATE_ELEMENT_ID,
    name: "TrackDraw Gate",
    organization: "TrackDraw",
    kind: "gate",
    dimensions: {
      widthMeters: frameOnlyGateDefaults.width,
      heightMeters: frameOnlyGateDefaults.height,
      display: { unitSystem: "metric", label: "2 x 2 m" },
    },
    defaultShape: frameOnlyGateDefaults,
    tags: ["race", "practice"],
    render2d: { icon: "gate" },
    render3d: { modelHint: "gate-frame" },
    visual: frameOnlyGateVisual,
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
    name: "MultiGP Standard Gate 5x5",
    organization: "MultiGP",
    kind: "gate",
    official: true,
    editable: { color: false, dimensions: false },
    dimensions: {
      widthMeters: feetToMeters(5),
      heightMeters: feetToMeters(5),
      display: { unitSystem: "imperial", label: "5 ft x 5 ft" },
    },
    defaultShape: {
      ...frameOnlyGateDefaults,
      width: feetToMeters(5),
      height: feetToMeters(5),
    },
    tags: ["race", "practice", "multigp"],
    sources: [
      {
        label: "MultiGP Standard Gate 5x5",
        url: "https://shop.multigp.com/product/standard-multigp-gate-5x5/",
      },
    ],
    render2d: { icon: "gate" },
    render3d: { modelHint: "gate-frame" },
    visual: panelFrameGateVisual,
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
    name: "MultiGP Championship Gate 7x6",
    organization: "MultiGP",
    kind: "gate",
    official: true,
    editable: { color: false, dimensions: false },
    dimensions: {
      widthMeters: feetToMeters(7),
      heightMeters: feetToMeters(6),
      display: { unitSystem: "imperial", label: "7 ft x 6 ft" },
    },
    defaultShape: {
      ...frameOnlyGateDefaults,
      width: feetToMeters(7),
      height: feetToMeters(6),
    },
    tags: ["championship", "race", "multigp"],
    sources: [
      {
        label: "MultiGP Drone Race Course Obstacles",
        url: "https://www.multigp.com/multigp-drone-race-course-obstacles/",
      },
    ],
    render2d: { icon: "gate" },
    render3d: { modelHint: "gate-frame" },
    visual: panelFrameChampionshipGateVisual,
    exportHints: { simulatorFriendly: true },
  },
  {
    id: TRACKDRAW_FLAG_ELEMENT_ID,
    name: "TrackDraw Flag",
    organization: "TrackDraw",
    kind: "flag",
    dimensions: {
      radiusMeters: flagDefaults.radius,
      heightMeters: flagDefaults.poleHeight,
      display: { unitSystem: "metric", label: "0.25 m radius, 3.5 m pole" },
    },
    defaultShape: flagDefaults,
    tags: ["race", "practice"],
    render2d: { icon: "flag" },
    render3d: { modelHint: "flag-pole" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_CORNER_FLAG_ELEMENT_ID,
    name: "MultiGP Corner Flag",
    organization: "MultiGP",
    kind: "flag",
    official: true,
    editable: { color: false, dimensions: false },
    dimensions: {
      radiusMeters: 0.2,
      heightMeters: feetToMeters(10),
      display: { unitSystem: "imperial", label: "10 ft" },
    },
    defaultShape: {
      ...flagDefaults,
      radius: 0.2,
      poleHeight: feetToMeters(10),
      color: "#b91c1c",
    } satisfies TrackElementShapeDraft,
    tags: ["race", "practice", "multigp", "marker"],
    sources: [
      {
        label: "MultiGP Drone Racing Flag",
        url: "https://shop.multigp.com/product/drone-racing-flag-fabric/",
      },
    ],
    render2d: { icon: "flag" },
    render3d: { modelHint: "flag-pole" },
    visual: {
      kind: "flag",
      variant: "corner-marker",
      poleColor: "#1c1c1c",
      textures: {
        front:
          "/assets/models/textures/multigp-obstacles/feather-banners-cobranded-multigp.webp",
        back: "/assets/models/textures/multigp-obstacles/feather-banners-cobranded-multigp-back.webp",
      },
    } satisfies FlagVisualSpec,
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
    tags: ["practice"],
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
    tags: ["annotation"],
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
    tags: ["race", "timing-compatible"],
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
    tags: ["technical", "practice"],
    render2d: { icon: "ladder" },
    render3d: { modelHint: "ladder-gate" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID,
    name: "MultiGP Standard Ladder 5x5",
    organization: "MultiGP",
    kind: "ladder",
    official: true,
    editable: { color: false, dimensions: false },
    dimensions: {
      widthMeters: feetToMeters(5),
      heightMeters: feetToMeters(5) * 3,
      display: {
        unitSystem: "imperial",
        label: "5 ft wide, 3 × 5 ft sections",
      },
    },
    defaultShape: {
      kind: "ladder",
      x: 0,
      y: 0,
      rotation: 0,
      width: feetToMeters(5),
      height: feetToMeters(5) * 3,
      rungs: 3,
      elevation: 0,
      color: "#f8fafc",
    } satisfies TrackElementShapeDraft,
    tags: ["race", "technical", "multigp"],
    sources: [
      {
        label: "MultiGP Drone Race Course Obstacles",
        url: "https://www.multigp.com/multigp-drone-race-course-obstacles/",
      },
    ],
    render2d: { icon: "ladder" },
    render3d: { modelHint: "ladder-gate" },
    visual: {
      kind: "ladder",
      variant: "panel-frame",
      panels: {
        left: { widthMeters: feetToMeters(1), color: "#f8fafc" },
        right: { widthMeters: feetToMeters(1), color: "#f8fafc" },
        top: { heightMeters: feetToMeters(1), color: "#202e5d" },
      },
      frame: {
        placement: "outer",
        material: "pvc",
        color: "#f8fafc",
        diameterMeters: 0.055,
      },
      textures: {
        left: "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-left-panel-regular-50-percent.webp",
        right:
          "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-right-panel-regular-50-percent.webp",
        top: "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-top-regular-50-percent.webp",
        placement: {
          left: {
            source: "right",
            orientation: { textureTopEdgeFaces: "top" },
          },
          right: {
            source: "left",
            orientation: { textureTopEdgeFaces: "top" },
          },
          top: { source: "top", orientation: { textureTopEdgeFaces: "top" } },
        },
      },
    } satisfies LadderVisualSpec,
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_CHAMPIONSHIP_LADDER_7X6_ELEMENT_ID,
    name: "MultiGP Championship Ladder 7x6",
    organization: "MultiGP",
    kind: "ladder",
    official: true,
    editable: { color: false, dimensions: false },
    dimensions: {
      widthMeters: feetToMeters(7),
      heightMeters: feetToMeters(6) * 3,
      display: {
        unitSystem: "imperial",
        label: "7 ft wide, 3 × 6 ft openings",
      },
    },
    defaultShape: {
      kind: "ladder",
      x: 0,
      y: 0,
      rotation: 0,
      width: feetToMeters(7),
      height: feetToMeters(6) * 3,
      rungs: 3,
      elevation: 0,
      color: "#f8fafc",
    } satisfies TrackElementShapeDraft,
    tags: ["championship", "race", "technical", "multigp"],
    sources: [
      {
        label: "MultiGP Drone Race Course Obstacles",
        url: "https://www.multigp.com/multigp-drone-race-course-obstacles/",
      },
    ],
    render2d: { icon: "ladder" },
    render3d: { modelHint: "ladder-gate" },
    visual: {
      kind: "ladder",
      variant: "panel-frame",
      panels: {
        left: { widthMeters: feetToMeters(1.5), color: "#f8fafc" },
        right: { widthMeters: feetToMeters(1.5), color: "#f8fafc" },
        top: { heightMeters: feetToMeters(2), color: "#202e5d" },
      },
      frame: {
        placement: "outer",
        material: "pvc",
        color: "#f8fafc",
        diameterMeters: 0.055,
      },
      textures: {
        left: "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        right:
          "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        top: "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
        placement: {
          left: {
            source: "left",
            orientation: { textureTopEdgeFaces: "bottom" },
          },
          right: {
            source: "left",
            orientation: { textureTopEdgeFaces: "top" },
          },
          top: { source: "top", orientation: { textureTopEdgeFaces: "top" } },
        },
      },
    } satisfies LadderVisualSpec,
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID,
    name: "MultiGP Topless Ladder 7x6",
    organization: "MultiGP",
    kind: "ladder",
    official: true,
    editable: { color: false, dimensions: false },
    dimensions: {
      widthMeters: feetToMeters(7),
      heightMeters: feetToMeters(6) * 3,
      display: {
        unitSystem: "imperial",
        label: "7 ft wide, 3 x 6 ft topless",
      },
    },
    defaultShape: {
      kind: "ladder",
      x: 0,
      y: 0,
      rotation: 0,
      width: feetToMeters(7),
      height: feetToMeters(6) * 3,
      rungs: 3,
      elevation: 0,
      color: "#f8fafc",
    } satisfies TrackElementShapeDraft,
    tags: ["championship", "race", "technical", "multigp", "topless"],
    sources: [
      {
        label: "MultiGP Drone Race Course Obstacles",
        url: "https://www.multigp.com/multigp-drone-race-course-obstacles/",
      },
    ],
    render2d: { icon: "ladder" },
    render3d: { modelHint: "ladder-gate" },
    visual: {
      kind: "ladder",
      variant: "panel-frame",
      panels: {
        left: { widthMeters: feetToMeters(1.5), color: "#f8fafc" },
        right: { widthMeters: feetToMeters(1.5), color: "#f8fafc" },
        top: { heightMeters: feetToMeters(2), color: "#202e5d" },
      },
      frame: {
        placement: "outer",
        material: "pvc",
        color: "#f8fafc",
        diameterMeters: 0.055,
      },
      textures: {
        left: "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        right:
          "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        top: "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
        placement: {
          left: {
            source: "left",
            orientation: { textureTopEdgeFaces: "bottom" },
          },
          right: {
            source: "left",
            orientation: { textureTopEdgeFaces: "top" },
          },
          top: {
            source: "top",
            orientation: {
              textureTopEdgeFaces: "bottom",
              flipX: true,
              flipY: true,
            },
          },
        },
      },
      topPanelPlacement: "lower-sections",
    } satisfies LadderVisualSpec,
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
      width: 2.8,
      thick: 0.2,
      tilt: 0,
      elevation: 3,
      color: "#f97316",
    },
    tags: ["technical", "practice"],
    render2d: { icon: "divegate" },
    render3d: { modelHint: "dive-gate" },
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_DIVE_GATE_7X6_ELEMENT_ID,
    name: "MultiGP Dive Gate 7x6",
    organization: "MultiGP",
    kind: "divegate",
    official: true,
    editable: { color: false, dimensions: false },
    dimensions: {
      widthMeters: feetToMeters(7),
      heightMeters: feetToMeters(6),
      display: { unitSystem: "imperial", label: "7 ft x 6 ft" },
    },
    defaultShape: {
      kind: "divegate",
      x: 0,
      y: 0,
      rotation: 0,
      width: feetToMeters(7),
      height: feetToMeters(6),
      thick: 0.055,
      tilt: 0,
      elevation: 0,
      color: "#f8fafc",
    } satisfies TrackElementShapeDraft,
    tags: ["championship", "race", "multigp", "technical"],
    sources: [
      {
        label: "MultiGP Drone Race Course Obstacles",
        url: "https://www.multigp.com/multigp-drone-race-course-obstacles/",
      },
    ],
    render2d: { icon: "divegate" },
    render3d: { modelHint: "dive-gate" },
    visual: {
      kind: "divegate",
      variant: "arch",
      frame: {
        placement: "outer",
        material: "pvc",
        color: "#f8fafc",
        diameterMeters: 0.055,
      },
      banner: {
        color: "#202e5d",
        sideTexture:
          "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        topTexture:
          "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
      },
    } satisfies DiveGateVisualSpec,
    exportHints: { simulatorFriendly: true },
  },
  {
    id: MULTIGP_LAUNCH_GATE_7X6_ELEMENT_ID,
    name: "MultiGP Launch Gate 7x6",
    organization: "MultiGP",
    kind: "divegate",
    official: true,
    editable: { color: false, dimensions: false },
    dimensions: {
      widthMeters: feetToMeters(7),
      heightMeters: feetToMeters(6),
      display: {
        unitSystem: "imperial",
        label: "7 ft x 6 ft",
      },
    },
    defaultShape: {
      kind: "divegate",
      x: 0,
      y: 0,
      rotation: 0,
      width: feetToMeters(7),
      height: feetToMeters(6),
      thick: 0.055,
      tilt: 0,
      elevation: 0,
      color: "#f8fafc",
    } satisfies TrackElementShapeDraft,
    tags: ["launch", "race", "multigp", "technical"],
    sources: [
      {
        label: "MultiGP Drone Race Course Obstacles",
        url: "https://www.multigp.com/multigp-drone-race-course-obstacles/",
      },
    ],
    render2d: { icon: "divegate" },
    render3d: { modelHint: "launch-gate" },
    visual: {
      kind: "divegate",
      variant: "launch",
      frame: {
        placement: "outer",
        material: "pvc",
        color: "#f8fafc",
        diameterMeters: 0.055,
      },
      banner: {
        color: "#202e5d",
        sideTexture:
          "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        topTexture:
          "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
        placement: {
          front: {
            source: "top",
            orientation: { textureTopEdgeFaces: "bottom", flipX: true },
          },
          rear: {
            source: "top",
            orientation: { textureTopEdgeFaces: "bottom", flipX: true },
          },
          left: {
            source: "side",
            orientation: { textureTopEdgeFaces: "top", flipY: true },
          },
          right: {
            source: "side",
            orientation: { textureTopEdgeFaces: "bottom", flipY: true },
          },
        },
      },
    } satisfies DiveGateVisualSpec,
    exportHints: { simulatorFriendly: true },
  },
] satisfies TrackElementCatalogEntry[];

const trackElementCatalogMap = new Map(
  trackElementCatalog.map((entry) => [entry.id, entry])
);

export function getTrackElementCatalogTexturePaths(): string[] {
  const paths = new Set<string>();

  for (const entry of trackElementCatalog) {
    const visual = entry.visual;
    if (!visual) continue;

    if (
      (visual.kind === "gate" || visual.kind === "ladder") &&
      visual.variant === "panel-frame"
    ) {
      paths.add(visual.textures.left);
      paths.add(visual.textures.right);
      if (visual.textures.top) paths.add(visual.textures.top);
      continue;
    }

    if (visual.kind === "flag") {
      paths.add(visual.textures.front);
      paths.add(visual.textures.back);
      continue;
    }

    if (visual.kind === "divegate") {
      paths.add(visual.banner.sideTexture);
      paths.add(visual.banner.topTexture);
    }
  }

  return Array.from(paths);
}

export function getTrackElementCatalogEntry(
  id: string | null | undefined
): TrackElementCatalogEntry | null {
  if (!id) return null;
  return trackElementCatalogMap.get(id as TrackElementCatalogId) ?? null;
}

export function getCatalogEntriesByKind<
  K extends PlaceableCatalogShape["kind"],
>(kind: K): (TrackElementCatalogEntry & { kind: K })[] {
  return (trackElementCatalog as readonly TrackElementCatalogEntry[]).filter(
    (entry): entry is TrackElementCatalogEntry & { kind: K } =>
      entry.kind === kind
  );
}

export function createTrackElementCatalogIdentity(
  entry: TrackElementCatalogEntry
): TrackElementCatalogIdentity {
  return {
    version: 1,
    elementId: entry.id,
    assignedKind: entry.kind,
    official: entry.official === true,
    snapshot: {
      name: entry.name,
      organization: entry.organization,
      dimensionsLabel: entry.dimensions.display.label,
    },
  };
}

export function getTrackElementCatalogIdentity(
  meta: Record<string, unknown> | null | undefined
): TrackElementCatalogIdentity | null {
  if (!isRecord(meta)) return null;
  const catalog = meta.catalog;
  return isTrackElementCatalogIdentity(catalog) ? catalog : null;
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
      catalog: createTrackElementCatalogIdentity(entry),
    },
  } satisfies TrackElementShapeDraft;
}
