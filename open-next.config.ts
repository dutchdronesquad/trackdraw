import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
import type {
  CacheEntryType,
  CacheValue,
  IncrementalCache,
} from "@opennextjs/aws/types/overrides.js";

const staticShellCacheKeys = new Set([
  "/index",
  "/studio",
  "/privacy",
  "/terms",
]);

const staticShellCache = {
  name: staticAssetsIncrementalCache.name,
  get<CacheType extends CacheEntryType = "cache">(
    key: string,
    cacheType?: CacheType
  ) {
    if (
      (cacheType === undefined || cacheType === "cache") &&
      staticShellCacheKeys.has(key)
    ) {
      return staticAssetsIncrementalCache.get(key, cacheType);
    }

    return Promise.resolve(null);
  },
  set<CacheType extends CacheEntryType = "cache">(
    _key: string,
    _value: CacheValue<CacheType>,
    _cacheType?: CacheType
  ) {
    return Promise.resolve();
  },
  delete(_key: string) {
    return Promise.resolve();
  },
} satisfies IncrementalCache;

export default defineCloudflareConfig({
  incrementalCache: staticShellCache,
  enableCacheInterception: true,
});
