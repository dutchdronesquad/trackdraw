import { expect, it } from "vitest";
import { getEarlyMcpResponse } from "@/lib/server/mcp/request-guards";

const site = "https://dev.trackdraw.app";
function guard(path = "/api/mcp", headers?: HeadersInit, env = "production") {
  return getEarlyMcpResponse(
    new Request("https://untrusted.invalid" + path, {
      method: "POST",
      headers,
    }),
    site,
    env
  );
}
it("challenges unauthenticated MCP requests using canonical discovery without Next or auth", async () => {
  const response = guard()!;
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toContain(
    'resource_metadata="https://dev.trackdraw.app/.well-known/oauth-protected-resource/api/mcp"'
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(await response.json()).toEqual({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32000,
      message: "Authorize your TrackDraw account to connect.",
    },
  });
});
it("preserves origin and query checks before the challenge", () => {
  expect(
    guard("/api/mcp", { origin: "https://untrusted.invalid" })?.status
  ).toBe(403);
  expect(guard("/api/mcp?token=ignored")?.status).toBe(400);
  expect(guard("/api/mcp", { origin: "http://localhost:8787" })?.status).toBe(
    403
  );
  expect(
    guard("/api/mcp", { origin: "http://localhost:8787" }, "development")
      ?.status
  ).toBe(401);
});
it("leaves every supplied credential to live authentication and ignores other routes", () => {
  for (const authorization of [
    "Bearer opaque",
    "Basic invalid",
    "Bearer",
    "Bearer " + "x".repeat(4097),
  ]) {
    expect(guard("/api/mcp", { authorization, origin: site })).toBeNull();
  }
  expect(guard("/api/projects")).toBeNull();
  expect(guard("/api/mcp/other")).toBeNull();
});
