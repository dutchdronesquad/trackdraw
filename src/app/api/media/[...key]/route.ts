import { getCloudflareContext } from "@opennextjs/cloudflare";

type MediaRouteContext = {
  params: Promise<{
    key: string[];
  }>;
};

type R2ObjectBody = {
  body: BodyInit;
  httpEtag: string;
  httpMetadata?: {
    cacheControl?: string;
  };
  writeHttpMetadata(headers: Headers): void;
};

type R2BucketBinding = {
  get(key: string): Promise<R2ObjectBody | null>;
};

type CloudflareContextWithMediaBucket = {
  env: {
    MEDIA_BUCKET?: R2BucketBinding;
  };
};

export async function GET(_request: Request, context: MediaRouteContext) {
  const { key } = await context.params;
  const objectKey = key.filter(Boolean).join("/");

  if (!objectKey) {
    return new Response("Missing media key", { status: 400 });
  }

  const { env } = (await getCloudflareContext({
    async: true,
  })) as CloudflareContextWithMediaBucket;

  if (!env.MEDIA_BUCKET) {
    return new Response("Missing media bucket binding", { status: 500 });
  }

  const object = await env.MEDIA_BUCKET.get(objectKey);
  if (!object) {
    return new Response("Media object not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set(
    "cache-control",
    object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable"
  );

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }

  return new Response(object.body, {
    status: 200,
    headers,
  });
}
