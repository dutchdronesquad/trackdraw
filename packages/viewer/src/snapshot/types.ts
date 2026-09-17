// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

/**
 * Portable wire format for a viewer-facing design snapshot. Deliberately has
 * zero dependency on src/lib/types.ts's full TrackDesign/Shape types -
 * this is the finalized "design/display-metadata allowlist" output of
 * issue #859 (Phase 1): only fields safe to expose to a public, unauthenticated
 * viewer are included.
 *
 * See docs/pva/track-viewer-package-pva.md (Phase 1) for the rule this
 * encodes and docs/research/in-progress/track-viewer-extraction-spike-findings.md
 * for how it was derived.
 */
export const VIEWER_SNAPSHOT_SCHEMA = "trackdraw.viewer-snapshot.v1" as const;

export interface RequiredViewer {
  schema: typeof VIEWER_SNAPSHOT_SCHEMA;
  /** Semver floor: the installed @trackdraw/viewer renderer must be >= this. */
  minRendererVersion: string;
  /** Renderer feature flags this snapshot's shapes require, e.g. "shape:divegate", "catalog:multigp". */
  capabilities: string[];
}

export interface ViewerCatalogIdentity {
  version: number;
  elementId: string;
  assignedKind: string;
  official: boolean;
  snapshot: {
    name: string;
    organization?: string;
    dimensionsLabel: string;
  };
}

/**
 * A viewer-facing shape: identical render-fidelity fields to the app's
 * `Shape` union (position, rotation, dimensions, variant, points, etc.),
 * except `meta` is narrowed from an arbitrary `Record<string, unknown>`
 * bag to only the catalog-provenance field the renderer needs.
 */
export interface ViewerShape {
  id: string;
  kind: string;
  name?: string;
  x: number;
  y: number;
  rotation: number;
  frontOffsetDeg?: number;
  locked?: boolean;
  color?: string;
  meta?: { catalog?: ViewerCatalogIdentity };
  [field: string]: unknown;
}

export interface ViewerFieldSpec {
  width: number;
  height: number;
  origin: "tl" | "bl";
  gridStep: number;
  ppm: number;
}

export interface ViewerDesignSnapshot {
  schema: typeof VIEWER_SNAPSHOT_SCHEMA;
  snapshotId: string;
  requiredViewer: RequiredViewer;
  design: {
    version: 2;
    title: string;
    field: ViewerFieldSpec;
    shapes: ViewerShape[];
    updatedAt: string;
  };
}
