import { getAuth } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Forward the original path: Better Auth serves RFC 8414 and RFC 9728 at
  // issuer/resource-path-inserted URLs, outside the auth catch-all route.
  const response = await (await getAuth()).handler(request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
