// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

import {
  collectEntryTexturePaths,
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
} from "@/lib/track/elements/catalog";
import type { Shape } from "../types";

/**
 * Design-scoped replacement for getTrackElementCatalogTexturePaths(), which
 * eagerly walks the *entire* catalog (all 24 obstacles, MultiGP-branded
 * ones included) regardless of what a design actually uses. The viewer
 * package must only ever request textures the given shapes reference.
 */
export function getDesignTexturePaths(shapes: readonly Shape[]): string[] {
  const paths = new Set<string>();

  for (const shape of shapes) {
    const identity = getTrackElementCatalogIdentity(shape.meta);
    if (!identity) continue;
    const entry = getTrackElementCatalogEntry(identity.elementId);
    if (!entry) continue;
    collectEntryTexturePaths(entry, paths);
  }

  return Array.from(paths);
}
