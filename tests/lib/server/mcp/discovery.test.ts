import { beforeEach, afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getAuth: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ getAuth: mocks.getAuth }));
import { GET } from "@/app/.well-known/[...discovery]/route";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");
  mocks.getAuth.mockReset();
  mocks.getAuth.mockResolvedValue({
    handler: async () =>
      Response.json({ resource: "https://trackdraw.app/api/mcp" }),
  });
});
afterEach(() => vi.unstubAllEnvs());
it("serves public MCP discovery without initializing auth or a database", async () => {
  const response = await GET(
    new Request(
      "https://trackdraw.app/.well-known/oauth-protected-resource/api/mcp"
    )
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    resource: "https://trackdraw.app/api/mcp",
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.getAuth).not.toHaveBeenCalled();
});

import { getMcpDiscoveryResponse } from "@/lib/server/mcp/oauth-metadata";
it("uses configured canonical URLs instead of caller supplied hosts", async () => {
  const response = getMcpDiscoveryResponse(
    new Request(
      "https://untrusted.invalid/.well-known/oauth-authorization-server/api/auth",
      { headers: { "x-forwarded-host": "untrusted.invalid" } }
    ),
    "https://dev.trackdraw.app"
  )!;
  const metadata = await response.json();
  expect(metadata).toMatchObject({
    issuer: "https://dev.trackdraw.app/api/auth",
    token_endpoint: "https://dev.trackdraw.app/api/auth/oauth2/token",
  });
});
it("preserves HEAD and unsupported-method behavior without touching auth", async () => {
  const url =
    "https://trackdraw.app/.well-known/oauth-protected-resource/api/mcp";
  const head = getMcpDiscoveryResponse(new Request(url, { method: "HEAD" }))!;
  expect(head.status).toBe(200);
  expect(await head.text()).toBe("");
  const post = getMcpDiscoveryResponse(new Request(url, { method: "POST" }))!;
  expect(post.status).toBe(405);
  expect(post.headers.get("allow")).toBe("GET, HEAD");
  expect(
    getMcpDiscoveryResponse(
      new Request("https://trackdraw.app/.well-known/unknown")
    )
  ).toBeNull();
  expect(mocks.getAuth).not.toHaveBeenCalled();
});
