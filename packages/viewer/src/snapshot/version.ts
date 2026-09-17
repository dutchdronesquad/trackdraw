// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

import { VIEWER_SNAPSHOT_SCHEMA, type RequiredViewer } from "./types";

/**
 * Every render capability the current renderer supports. Extend this list
 * whenever a new shape kind or catalog organization gains renderer support.
 */
export const RENDERER_CAPABILITIES = [
  "shape:gate",
  "shape:tower",
  "shape:flag",
  "shape:cone",
  "shape:label",
  "shape:polyline",
  "shape:startfinish",
  "shape:ladder",
  "shape:divegate",
  "shape:barrier",
  "catalog:trackdraw",
  "catalog:multigp",
] as const;

export const RENDERER_VERSION = "0.1.0";

export const CURRENT_REQUIRED_VIEWER: RequiredViewer = {
  schema: VIEWER_SNAPSHOT_SCHEMA,
  minRendererVersion: "0.1.0",
  capabilities: [...RENDERER_CAPABILITIES],
};

/**
 * Compares two "x.y.z" semver strings. Returns true if `a` is strictly
 * lower than `b`. No pre-release/build-metadata support - not needed for
 * this simple floor check.
 */
function semverLt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na < nb;
  }
  return false;
}

/**
 * The versioning rule finalized in issue #859 (Phase 1): additive-safe,
 * floor-gated compatibility.
 *  - `minRendererVersion` is a semver floor: the installed renderer must be >=.
 *  - `capabilities` is a required-subset check: the installed renderer's
 *    capability set must be a superset of the snapshot's requirements, so
 *    new shape kinds can ship without invalidating old snapshots, and old
 *    snapshots stay renderable by newer renderers.
 *  - A `schema` mismatch (e.g. a future v2 envelope) is always incompatible
 *    - no cross-schema negotiation in v1.
 */
export function isViewerCompatible(
  required: RequiredViewer,
  installed: { rendererVersion: string; capabilities: ReadonlySet<string> }
): boolean {
  if (required.schema !== VIEWER_SNAPSHOT_SCHEMA) return false;
  if (semverLt(installed.rendererVersion, required.minRendererVersion)) {
    return false;
  }
  return required.capabilities.every((cap) => installed.capabilities.has(cap));
}
