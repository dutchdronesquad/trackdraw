import { vi } from "vitest";

export type MockMediaBucket = {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

export function createMockMediaBucket(
  overrides: Partial<MockMediaBucket> = {}
): MockMediaBucket {
  return {
    get: vi.fn(async () => null),
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function createR2ObjectBody({
  body,
  etag = '"etag-1"',
  cacheControl,
  contentType,
}: {
  body: BodyInit;
  etag?: string;
  cacheControl?: string;
  contentType?: string;
}) {
  return {
    body,
    httpEtag: etag,
    httpMetadata: cacheControl ? { cacheControl } : undefined,
    writeHttpMetadata(headers: Headers) {
      if (contentType) {
        headers.set("content-type", contentType);
      }
    },
  };
}

export function installCloudflareMediaBucket(
  getCloudflareContext: ReturnType<typeof vi.fn>,
  bucket: MockMediaBucket | null
) {
  getCloudflareContext.mockResolvedValue({
    env: bucket ? { MEDIA_BUCKET: bucket } : {},
  });
}
