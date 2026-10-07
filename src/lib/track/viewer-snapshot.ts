import {
  getResolvedAppearance,
  findShapeAppearance,
  appearanceKey,
} from "@trackdraw/schema/appearance/registry";
import { getViewerSnapshotId } from "@trackdraw/schema/snapshot/identity";
import { getDesignShapes } from "@/lib/track/design";
import { getTrackElementCatalogIdentity } from "@/lib/track/elements/catalog";
import type { Shape, TrackDesign } from "@/lib/types";
import { getDesignAssetManifest } from "@trackdraw/schema/assets/manifest";
import {
  validateViewerDesignSnapshot,
  viewerShapeSchema,
} from "@trackdraw/schema/snapshot/schema";
import { MIN_RENDERER_VERSION } from "@trackdraw/schema/snapshot/version";
import {
  VIEWER_SNAPSHOT_SCHEMA,
  type RequiredViewer,
  type ViewerDesignSnapshot,
  type ViewerShape,
} from "@trackdraw/schema/snapshot/types";

/**
 * Maps an app-internal `Shape` to the viewer-safe wire format: identical
 * render-fidelity fields, but `meta` narrowed to only the catalog-provenance
 * sub-key (everything else in that arbitrary bag - e.g. timing metadata -
 * is dropped).
 */
function toViewerShape(shape: Shape): ViewerShape {
  const { meta, ...rest } = shape;
  const catalog = getTrackElementCatalogIdentity(meta);
  return viewerShapeSchema.parse({
    ...rest,
    ...(catalog ? { meta: { catalog } } : {}),
  });
}

function shapeCapability(shape: Shape): `shape:${string}` {
  return `shape:${shape.kind}`;
}

function computeRequiredViewer(shapes: readonly Shape[]): RequiredViewer {
  const used = new Set<string>();
  for (const shape of shapes) {
    used.add(shapeCapability(shape));
    if (shape.appearance?.source === "registry")
      used.add(
        `appearance:${shape.appearance.source}:${shape.appearance.templateId}`
      );
    const catalog = getTrackElementCatalogIdentity(shape.meta);
    if (catalog?.snapshot.organization) {
      used.add(`catalog:${catalog.snapshot.organization.toLowerCase()}`);
    }
  }

  return {
    schema: VIEWER_SNAPSHOT_SCHEMA,
    minRendererVersion: MIN_RENDERER_VERSION,
    // Report every capability the design's shapes actually use, not just the
    // ones the current renderer happens to recognize - intersecting with
    // RENDERER_CAPABILITIES here would silently drop the requirement for any
    // shape kind/catalog org isViewerCompatible() doesn't yet know about,
    // letting an incompatible snapshot report as compatible.
    capabilities: Array.from(used).sort(),
  };
}

/**
 * The design/display-metadata allowlist finalized in issue #859 (Phase 1).
 *
 * Explicitly excluded (never leaves this function): `id` (replaced by a
 * content-based `snapshotId`), `authorName`, `inventory`, `tags`, `description`,
 * `mapReference`, `createdAt`, the internal `shapeOrder`/`shapeById` maps
 * (flattened via `getDesignShapes`), and every `shape.meta` key except
 * `catalog`. See docs/pva/track-viewer-package-pva.md (Phase 1) for the
 * recorded decision.
 */
export function toViewerDesignSnapshot(
  design: TrackDesign
): ViewerDesignSnapshot {
  const shapes = getDesignShapes(design);
  const resolved = shapes.flatMap((shape) => {
    const entry = getResolvedAppearance(shape.appearance);
    return entry && findShapeAppearance(shape, [entry]) ? [entry] : [];
  });
  const appearances = [
    ...new Map(
      resolved.map((entry) => [appearanceKey(entry.reference), entry])
    ).values(),
  ];
  const snapshot = {
    schema: VIEWER_SNAPSHOT_SCHEMA,
    snapshotId: "pending",
    requiredViewer: computeRequiredViewer(shapes),
    design: {
      version: 2 as const,
      title: design.title,
      field: design.field,
      shapes: shapes.map(toViewerShape),
      ...(appearances.length ? { appearances } : {}),
      updatedAt: design.updatedAt,
    },
    assets: getDesignAssetManifest(shapes, appearances),
  };
  const validated = validateViewerDesignSnapshot(snapshot);
  return { ...validated, snapshotId: getViewerSnapshotId(validated) };
}
