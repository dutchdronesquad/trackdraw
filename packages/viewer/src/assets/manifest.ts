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
 *
 * Throws if a shape references a texture path missing from the generated
 * manifest (a stale manifest - e.g. a new catalog texture was added without
 * running `npm run assets:viewer-manifest`) rather than silently omitting
 * it: this manifest exists for integrity/preload checks on the consuming
 * side, so a snapshot whose shapes reference a texture the assets list
 * doesn't cover would be a silent, hard-to-detect break of that guarantee.
 */
export function getDesignAssetManifest(
  shapes: readonly Shape[]
): ViewerAssetManifestEntry[] {
  return getDesignTexturePaths(shapes).map((path) => {
    const entry = getAssetManifestEntry(path);
    if (!entry) {
      throw new Error(
        `Asset manifest is missing an entry for "${path}". Regenerate it with \`npm run assets:viewer-manifest\`.`
      );
    }
    return entry;
  });
}
