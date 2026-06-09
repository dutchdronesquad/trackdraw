import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockMediaBucket,
  createR2ObjectBody,
  installCloudflareMediaBucket,
} from "../../helpers/cloudflare";
import { routeContext } from "../../helpers/api-routes";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { GET } from "@/app/api/media/[...key]/route";

function mediaContext(key: string[]) {
  return routeContext({ key });
}

describe("media API route", () => {
  beforeEach(() => {
    mocks.getCloudflareContext.mockReset();
  });

  it("rejects empty media keys before reading R2", async () => {
    const response = await GET(
      new Request("http://localhost/api/media"),
      mediaContext([""])
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Missing media key");
    expect(mocks.getCloudflareContext).not.toHaveBeenCalled();
  });

  it("returns a server error when the media bucket binding is missing", async () => {
    installCloudflareMediaBucket(mocks.getCloudflareContext, null);

    const response = await GET(
      new Request("http://localhost/api/media/gallery/previews/entry-1.webp"),
      mediaContext(["gallery", "previews", "entry-1.webp"])
    );

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("Missing media bucket binding");
  });

  it("returns 404 when the R2 object does not exist", async () => {
    const bucket = createMockMediaBucket();
    installCloudflareMediaBucket(mocks.getCloudflareContext, bucket);

    const response = await GET(
      new Request("http://localhost/api/media/gallery/previews/missing.webp"),
      mediaContext(["gallery", "previews", "missing.webp"])
    );

    expect(bucket.get).toHaveBeenCalledWith("gallery/previews/missing.webp");
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Media object not found");
  });

  it("serves media objects with R2 metadata, etag, and cache headers", async () => {
    const bucket = createMockMediaBucket({
      get: vi.fn(async () =>
        createR2ObjectBody({
          body: "webp-body",
          etag: '"etag-1"',
          cacheControl: "public, max-age=60",
          contentType: "image/webp",
        })
      ),
    });
    installCloudflareMediaBucket(mocks.getCloudflareContext, bucket);

    const response = await GET(
      new Request("http://localhost/api/media/gallery/previews/entry-1.webp"),
      mediaContext(["gallery", "", "previews", "entry-1.webp"])
    );

    expect(response.status).toBe(200);
    expect(bucket.get).toHaveBeenCalledWith("gallery/previews/entry-1.webp");
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("etag")).toBe('"etag-1"');
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    await expect(response.text()).resolves.toBe("webp-body");
  });

  it("falls back to octet-stream content type and immutable caching", async () => {
    const bucket = createMockMediaBucket({
      get: vi.fn(async () =>
        createR2ObjectBody({
          body: "asset-body",
          etag: '"etag-2"',
        })
      ),
    });
    installCloudflareMediaBucket(mocks.getCloudflareContext, bucket);

    const response = await GET(
      new Request("http://localhost/api/media/gallery/previews/entry-2.webp"),
      mediaContext(["gallery", "previews", "entry-2.webp"])
    );

    expect(response.headers.get("content-type")).toBe(
      "application/octet-stream"
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable"
    );
  });
});
