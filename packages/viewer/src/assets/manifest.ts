// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

import textureManifest from "./generated/texture-manifest.json";
import type { ViewerAssetManifestEntry } from "../snapshot/types";
import type { Shape } from "../types";
import { getDesignTexturePaths } from "./texture-paths";

type RawManifestEntry = {
  contentType: string;
  sizeBytes: number;
  sha256: string;
};

const manifestByPath: Record<string, RawManifestEntry> = textureManifest;

/**
 * Looks up one precomputed manifest entry by root-relative asset path
 * (e.g. "/assets/models/textures/multigp-obstacles/...webp"). Returns
 * `null` for a path missing from the generated table (e.g. a stale
 * manifest) rather than throwing - callers decide whether that's fatal.
 */
export function getAssetManifestEntry(
  path: string
): ViewerAssetManifestEntry | null {
  const entry = manifestByPath[path];
  return entry ? { path, ...entry } : null;
}

/**
 * Design-scoped asset manifest: only the manifest entries for textures
 * this design's shapes actually reference, matching the same
 * design-scoping rule getDesignTexturePaths itself documents.
 */
export function getDesignAssetManifest(
  shapes: readonly Shape[]
): ViewerAssetManifestEntry[] {
  return getDesignTexturePaths(shapes)
    .map(getAssetManifestEntry)
    .filter((entry): entry is ViewerAssetManifestEntry => entry !== null);
}
