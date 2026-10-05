import { describe, expect, it, vi } from "vitest";
import { getRouteCacheKey } from "@opennextjs/aws/utils/routeCacheKey.js";

const { getAssetCache } = vi.hoisted(() => ({
  getAssetCache: vi.fn().mockResolvedValue(null),
}));
vi.mock(
  "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache",
  () => ({
    default: { name: "cf-static-assets-incremental-cache", get: getAssetCache },
  })
);

import config from "../open-next.config";

async function getCache() {
  const override = config.default?.override?.incrementalCache;
  if (typeof override !== "function") throw new Error("Missing cache override");
  return override();
}

describe("static shell cache", () => {
  it.each(["index", "studio", "privacy", "terms"])(
    "loads the generated route cache for %s",
    async (route) => {
      const cache = await getCache();
      const pathname = route === "index" ? "/" : `/${route}`;
      const key = getRouteCacheKey(pathname, {
        kind: "APP_PAGE",
        sourceRoute: `${route === "index" ? "" : pathname}/page`,
      });
      for (const candidate of [key, key.slice(1)]) {
        await cache.get(candidate, "cache");
        expect(getAssetCache).toHaveBeenCalledWith(candidate, "cache");
      }
    }
  );

  it("keeps legacy shell keys usable", async () => {
    const cache = await getCache();
    await cache.get("/studio");
    expect(getAssetCache).toHaveBeenCalledWith("/studio", undefined);
  });

  it.each([
    getRouteCacheKey("/gallery", {
      kind: "APP_PAGE",
      sourceRoute: "/gallery/page",
    }),
    getRouteCacheKey("/share/token", {
      kind: "APP_PAGE",
      sourceRoute: "/share/[token]/page",
    }),
    getRouteCacheKey("/dashboard", {
      kind: "APP_PAGE",
      sourceRoute: "/dashboard/page",
    }),
    getRouteCacheKey("/api/tracks", {
      kind: "APP_ROUTE",
      sourceRoute: "/api/tracks/route",
    }),
  ])("does not cache dynamic or unrelated routes: %s", async (key) => {
    const cache = await getCache();
    await expect(cache.get(key, "cache")).resolves.toBeNull();
    expect(getAssetCache).not.toHaveBeenCalled();
  });

  it("does not read fetch entries from the static shell cache", async () => {
    const cache = await getCache();
    await expect(cache.get("/studio", "fetch")).resolves.toBeNull();
    expect(getAssetCache).not.toHaveBeenCalled();
  });
});
