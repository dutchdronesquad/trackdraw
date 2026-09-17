// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

export type AssetResolver = (path: string) => string;

/**
 * Prefixes catalog asset paths (still stored as absolute-from-origin
 * strings, e.g. "/assets/models/textures/...") so they resolve correctly
 * when the viewer is hosted under a non-root URL prefix.
 */
export function createAssetResolver(baseUrl = ""): AssetResolver {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return (path: string) => `${trimmed}${path}`;
}

export const IDENTITY_ASSET_RESOLVER: AssetResolver = (path) => path;
