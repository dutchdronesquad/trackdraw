// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

export { TrackViewer, type TrackViewerProps } from "./TrackViewer";
export type {
  BarrierVariant,
  FieldSpec,
  MeasurementUnitSystem,
  Shape,
  ShapeKind,
  TrackDesign,
} from "./types";
export {
  DEFAULT_VIEWER_LABELS,
  mergeViewerLabels,
  type TrackViewerLabels,
} from "./i18n/labels";
export { detectWebglSupport, type WebglSupport } from "./capabilities/webgl";
export {
  createAssetResolver,
  IDENTITY_ASSET_RESOLVER,
  type AssetResolver,
} from "./assets/asset-url";
export { getDesignTexturePaths } from "./assets/texture-paths";
export {
  VIEWER_SNAPSHOT_SCHEMA,
  type RequiredViewer,
  type ViewerCatalogIdentity,
  type ViewerDesignSnapshot,
  type ViewerFieldSpec,
  type ViewerShape,
} from "./snapshot/types";
export {
  CURRENT_REQUIRED_VIEWER,
  RENDERER_CAPABILITIES,
  RENDERER_VERSION,
  isViewerCompatible,
} from "./snapshot/version";
