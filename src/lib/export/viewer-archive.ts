import { createViewerArchive } from "@trackdraw/viewer/snapshot/archive";
import { toViewerDesignSnapshot } from "@/lib/track/viewer-snapshot";
import type { TrackDesign } from "@/lib/types";

/** Only fetch known catalog paths from this app; the package verifies size/hash. */
export async function buildViewerArchive(
  design: TrackDesign,
  fetchAsset: typeof fetch = fetch
) {
  return createViewerArchive(toViewerDesignSnapshot(design), async (asset) => {
    const response = await fetchAsset(asset.path, { credentials: "omit" });
    if (!response.ok)
      throw new Error(`Could not load course texture: ${asset.path}`);
    return new Uint8Array(await response.arrayBuffer());
  });
}

export async function exportViewerArchive(
  design: TrackDesign,
  filename: string
) {
  const bytes = await buildViewerArchive(design);
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: "application/zip" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Keep the object URL alive until the browser has begun the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
