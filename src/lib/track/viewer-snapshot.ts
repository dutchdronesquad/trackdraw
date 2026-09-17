import { nanoid } from "nanoid";
import { getDesignShapes } from "@/lib/track/design";
import { getTrackElementCatalogIdentity } from "@/lib/track/elements/catalog";
import type { Shape, TrackDesign } from "@/lib/types";
import { CURRENT_REQUIRED_VIEWER } from "@trackdraw/viewer/snapshot/version";
import {
  VIEWER_SNAPSHOT_SCHEMA,
  type RequiredViewer,
  type ViewerDesignSnapshot,
  type ViewerShape,
} from "@trackdraw/viewer/snapshot/types";

/**
 * Maps an app-internal `Shape` to the viewer-safe wire format: identical
 * render-fidelity fields, but `meta` narrowed to only the catalog-provenance
 * sub-key (everything else in that arbitrary bag - e.g. timing metadata -
 * is dropped).
 */
function toViewerShape(shape: Shape): ViewerShape {
  const { meta, ...rest } = shape;
  const catalog = getTrackElementCatalogIdentity(meta);
  return {
    ...rest,
    ...(catalog ? { meta: { catalog } } : {}),
  };
}

function shapeCapability(shape: Shape): `shape:${string}` {
  return `shape:${shape.kind}`;
}

function computeRequiredViewer(shapes: readonly Shape[]): RequiredViewer {
  const used = new Set<string>();
  for (const shape of shapes) {
    used.add(shapeCapability(shape));
    const catalog = getTrackElementCatalogIdentity(shape.meta);
    if (catalog?.snapshot.organization) {
      used.add(`catalog:${catalog.snapshot.organization.toLowerCase()}`);
    }
  }

  return {
    schema: VIEWER_SNAPSHOT_SCHEMA,
    minRendererVersion: CURRENT_REQUIRED_VIEWER.minRendererVersion,
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
 * fresh `snapshotId`), `authorName`, `inventory`, `tags`, `description`,
 * `mapReference`, `createdAt`, the internal `shapeOrder`/`shapeById` maps
 * (flattened via `getDesignShapes`), and every `shape.meta` key except
 * `catalog`. See docs/pva/track-viewer-package-pva.md (Phase 1) for the
 * recorded decision.
 */
export function toViewerDesignSnapshot(
  design: TrackDesign
): ViewerDesignSnapshot {
  const shapes = getDesignShapes(design);
  return {
    schema: VIEWER_SNAPSHOT_SCHEMA,
    snapshotId: nanoid(),
    requiredViewer: computeRequiredViewer(shapes),
    design: {
      version: 2,
      title: design.title,
      field: design.field,
      shapes: shapes.map(toViewerShape),
      updatedAt: design.updatedAt,
    },
  };
}
