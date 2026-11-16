import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
export const assetOrigin = "https://assets.trackdraw.app/multigp/";

// Cache only catalog-owned texture URLs. Runtime access to the network stays blocked.
export async function prepareAssets() {
  const sources = await Promise.all(
    ["catalog.ts", "visual.ts"].map((file) =>
      readFile(path.join(root, "src/lib/track/elements", file), "utf8")
    )
  );
  const urls = [
    ...new Set(
      sources
        .join("\n")
        .match(
          /https:\/\/assets\.trackdraw\.app\/multigp\/[a-zA-Z0-9_-]+\.webp/g
        )
    ),
  ];
  const cache = path.join(here, ".asset-cache/multigp");
  await mkdir(cache, { recursive: true });
  for (const url of urls) {
    const name = new URL(url).pathname.split("/").pop();
    const destination = path.join(cache, name);
    try {
      await access(destination);
      continue;
    } catch {
      /* Populate missing assets. */
    }
    if (process.env.TRACKDRAW_POC_TEXTURES) {
      await copyFile(
        path.join(process.env.TRACKDRAW_POC_TEXTURES, name),
        destination
      );
    } else {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok)
        throw new Error(
          `Texture preparation failed: ${url} (${response.status})`
        );
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.toString("ascii", 8, 12) !== "WEBP")
        throw new Error(`Expected WebP texture: ${url}`);
      await writeFile(destination, bytes);
    }
  }
  return {
    cache,
    names: urls.map((url) => new URL(url).pathname.split("/").pop()),
  };
}
