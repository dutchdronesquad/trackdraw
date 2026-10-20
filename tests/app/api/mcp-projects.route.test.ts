import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { POST, GET } from "@/app/api/mcp/route";
import { z } from "zod";
import { getDatabase } from "@/lib/server/db";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import {
  getProjectForUser,
  listProjectSummariesForUser,
} from "@/lib/server/projects";
import {
  toApiOverlayPackage,
  toApiProjectSummary,
  toApiProjectSummaryLight,
  toApiTrackPackage,
  toApiViewerSnapshotPackage,
} from "@/lib/server/api-projects";
import {
  MCP_MAX_RESULT_BYTES,
  PROJECT_READ_TOOLS,
} from "@/lib/server/mcp/project-tools";
import type { Shape } from "@/lib/types";
vi.mock("server-only", () => ({}));
const oauth = vi.hoisted(() => ({ claims: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({
  getAuth: async () => ({ api: { verifyMcpAccessToken: oauth.claims } }),
}));
vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn() }));
let sqlite: ReturnType<typeof createMigratedDatabase>;
let scopes: string;
let client: Client;
const endpoint = "https://trackdraw.app/api/mcp";
const gate: Shape = {
  id: "gate",
  kind: "gate",
  x: 5,
  y: 5,
  rotation: 0,
  width: 3,
  height: 2,
};
function save(
  id: string,
  owner = "owner",
  shapes: Shape[] = [gate],
  archived = false
) {
  const design = createDefaultDesign();
  design.id = id;
  design.title = "Course " + id;
  design.updatedAt = "2026-10-20T10:00:00Z";
  design.shapeOrder = shapes.map((s) => s.id);
  design.shapeById = Object.fromEntries(shapes.map((s) => [s.id, s]));
  sqlite
    .prepare(
      "INSERT INTO projects(id,owner_user_id,title,design_json,field_width,field_height,shape_count,created_at,updated_at,archived_at) VALUES(?,?,?,?,?,?,?,'2026-10-20','2026-10-20',?)"
    )
    .run(
      id,
      owner,
      design.title,
      JSON.stringify(serializeDesign(design)),
      design.field.width,
      design.field.height,
      shapes.length,
      archived ? "2026-10-20" : null
    );
}
async function call(name: string, args: Record<string, unknown> = {}) {
  const response = await client.callTool({ name, arguments: args });
  return response;
}
async function data(name: string, args: Record<string, unknown> = {}) {
  const response = await call(name, args);
  expect(response.isError).not.toBe(true);
  return z.record(z.string(), z.unknown()).parse(response.structuredContent);
}
beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
  vi.spyOn(console, "info").mockImplementation(() => {});
  scopes = "mcp:read projects:read";
  sqlite = createMigratedDatabase();
  sqlite.exec(
    "INSERT INTO users(id,name,email,createdAt,updatedAt,last_active_at) VALUES('owner','Pilot','owner@example.invalid','2026-10-20','2026-10-20','2099-01-01'),('other','Other','other@example.invalid','2026-10-20','2026-10-20','2099-01-01'); INSERT INTO oauthClient(id,clientId,redirectUris) VALUES('client','client','[]'); INSERT INTO oauthConsent(id,clientId,userId,scopes,resources,createdAt,updatedAt) VALUES('consent','client','owner','[\"mcp:read\",\"projects:read\"]','[\"https://trackdraw.app/api/mcp\"]','2026-10-20','2026-10-20');"
  );
  vi.mocked(getDatabase).mockResolvedValue(sqliteD1(sqlite));
  oauth.claims.mockImplementation(async () => ({
    active: true,
    iss: "https://trackdraw.app/api/auth",
    aud: endpoint,
    sub: "owner",
    client_id: "client",
    scope: scopes,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
  client = new Client({ name: "project-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(endpoint), {
      requestInit: { headers: { Authorization: "Bearer test" } },
      fetch: async (url, init) => {
        const r = new Request(url, init);
        return r.method === "POST" ? POST(r) : GET(r);
      },
    })
  );
});
afterEach(async () => {
  await client?.close();
  sqlite?.close();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("owned project MCP tools with real persistence, serializers and SDK", () => {
  it("advertises tools only for live project-read consent", async () => {
    expect((await client.listTools()).tools.map((t) => t.name)).toEqual([
      "get_account",
      ...PROJECT_READ_TOOLS,
    ]);
    expect((await data("get_account")).mcp).toMatchObject({
      project_reads: true,
      project_writes: false,
    });
    scopes = "mcp:read";
    expect((await client.listTools()).tools.map((t) => t.name)).toEqual([
      "get_account",
    ]);
    expect((await data("get_account")).mcp).toMatchObject({
      project_reads: false,
    });
    expect((await call("get_project", { project_id: "private" })).isError).toBe(
      true
    );
    scopes = "mcp:read projects:read";
    sqlite.exec("UPDATE oauthConsent SET scopes='[\"mcp:read\"]'");
    await expect(client.listTools()).rejects.toThrow();
  });
  it("paginates owned summaries using bounded SQL in REST order", async () => {
    save("b");
    save("a");
    save("c");
    save("secret", "other");
    save("archived", "owner", [gate], true);
    const queries: string[] = [];
    vi.mocked(getDatabase).mockResolvedValue(
      sqliteD1(sqlite, (query) => queries.push(query))
    );
    const first = await data("list_projects", { limit: 2 });
    const listingSql = queries.filter((query) => query.includes("field_width"));
    expect(listingSql).toHaveLength(1);
    expect(listingSql[0]).toMatch(/limit \?/i);
    expect(listingSql[0]).not.toContain("design_json");
    const page = first.pagination as { has_more: boolean; next_cursor: string };
    const all = await listProjectSummariesForUser("owner");
    expect(first.data).toEqual(all.slice(0, 2).map(toApiProjectSummaryLight));
    expect(page.has_more).toBe(true);
    const second = await data("list_projects", {
      limit: 2,
      cursor: page.next_cursor,
    });
    expect(second.data).toEqual(all.slice(2).map(toApiProjectSummaryLight));
    expect(second.pagination).toMatchObject({
      has_more: false,
      next_cursor: null,
    });
    expect(JSON.stringify(first)).not.toContain("design");
  });
  it.each(["secret", "archived", "deleted", "share-token"])(
    "conceals unavailable %s projects in every read",
    async (id) => {
      save("secret", "other");
      save("archived", "owner", [gate], true);
      for (const name of PROJECT_READ_TOOLS.filter(
        (n) => n !== "list_projects"
      )) {
        const r = await call(name, { project_id: id });
        expect(r.isError).toBe(true);
        expect(r.structuredContent).toMatchObject({
          error: { code: "not_found" },
        });
      }
    }
  );
  it("rejects bad and cross-account cursors without project disclosure", async () => {
    save("a");
    save("b");
    save("secret", "other");
    for (const cursor of [
      "!invalid",
      Buffer.from(JSON.stringify("secret")).toString("base64url"),
      Buffer.from(JSON.stringify("missing")).toString("base64url"),
    ])
      expect(
        (await call("list_projects", { cursor })).structuredContent
      ).toMatchObject({ error: { code: "invalid_cursor" } });
    const page = await data("list_projects", { limit: 1 });
    sqlite.exec("UPDATE projects SET archived_at='2026-10-20' WHERE id='a'");
    expect(
      (
        await call("list_projects", {
          cursor: (page.pagination as { next_cursor: string }).next_cursor,
        })
      ).isError
    ).toBe(true);
  });
  it("preserves REST metadata, shape geometry and derived package contracts", async () => {
    const route: Shape = {
      id: "route",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 10 },
      ],
    };
    save("course", "owner", [gate, route]);
    const project = (await getProjectForUser("course", "owner"))!;
    expect(
      (await data("get_project", { project_id: "course" })).project
    ).toEqual(toApiProjectSummary(project));
    const track = await data("get_track", { project_id: "course", limit: 1 });
    expect(track.shapes).toEqual(toApiTrackPackage(project).shapes.slice(0, 1));
    expect(await data("get_overlay", { project_id: "course" })).toEqual(
      toApiOverlayPackage(project)
    );
    expect(await data("get_viewer_snapshot", { project_id: "course" })).toEqual(
      toApiViewerSnapshotPackage(project)
    );
    const shapePage = await data("get_track", {
      project_id: "course",
      limit: 1,
      cursor: (track.pagination as { next_cursor: string }).next_cursor,
    });
    expect(shapePage.shapes).toMatchObject([
      { id: "route", point_count: 3, geometry_omitted: true },
    ]);
    expect((shapePage.shapes as object[])[0]).not.toHaveProperty("points");
    const points = await data("get_track", {
      project_id: "course",
      shape_id: "route",
      limit: 2,
    });
    const next = await data("get_track", {
      project_id: "course",
      shape_id: "route",
      limit: 2,
      cursor: (points.pagination as { next_cursor: string }).next_cursor,
    });
    expect([
      ...(points.shape as { points: unknown[] }).points,
      ...(next.shape as { points: unknown[] }).points,
    ]).toEqual(toApiTrackPackage(project).shapes[1].points);
  });
  it("rejects cursors reused for another project, shape or revision", async () => {
    save("course", "owner", [gate, { ...gate, id: "two" }]);
    save("another", "owner", [gate, { ...gate, id: "two" }]);
    const first = await data("get_track", { project_id: "course", limit: 1 });
    const cursor = (first.pagination as { next_cursor: string }).next_cursor;
    for (const args of [
      { project_id: "another", cursor },
      { project_id: "course", shape_id: "gate", cursor },
    ])
      expect((await call("get_track", args)).structuredContent).toMatchObject({
        error: { code: "invalid_cursor" },
      });
    const project = (await getProjectForUser("course", "owner"))!;
    project.design.updatedAt = "2026-10-20T11:00:00Z";
    sqlite
      .prepare("UPDATE projects SET design_json=? WHERE id='course'")
      .run(JSON.stringify(serializeDesign(project.design)));
    expect(
      (await call("get_track", { project_id: "course", cursor })).isError
    ).toBe(true);
  });
  it("keeps large geometry inspectable while refusing oversized complete snapshots", async () => {
    const route: Shape = {
      id: "route",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: Array.from({ length: 6000 }, (_, i) => ({ x: i, y: i % 20 })),
    };
    save("large", "owner", [route]);
    const summary = await data("get_track", { project_id: "large" });
    expect(summary.shapes).toMatchObject([{ point_count: 6000 }]);
    const points = await data("get_track", {
      project_id: "large",
      shape_id: "route",
      limit: 100,
    });
    expect((points.shape as { points: unknown[] }).points).toHaveLength(100);
    expect(
      new TextEncoder().encode(JSON.stringify(points)).length
    ).toBeLessThan(MCP_MAX_RESULT_BYTES);
    expect(
      (await call("get_viewer_snapshot", { project_id: "large" }))
        .structuredContent
    ).toMatchObject({ error: { code: "response_too_large" } });
  });
  it("returns an actionable error instead of truncating oversized shape pages", async () => {
    save(
      "dense",
      "owner",
      Array.from({ length: 100 }, (_, i) => ({
        ...gate,
        id: "gate-" + i,
        name: "x".repeat(1000),
      }))
    );
    const oversized = await call("get_track", {
      project_id: "dense",
      limit: 100,
    });
    expect(oversized.isError).toBe(true);
    expect(oversized.structuredContent).toMatchObject({
      error: { code: "response_too_large" },
    });
    const small = await data("get_track", { project_id: "dense", limit: 1 });
    expect(small.shapes).toHaveLength(1);
    expect(small.pagination).toMatchObject({ has_more: true });
    expect(new TextEncoder().encode(JSON.stringify(small)).length).toBeLessThan(
      MCP_MAX_RESULT_BYTES
    );
  });
  it("does not fetch or disclose private artwork through derived snapshots", async () => {
    save("art", "owner", [
      {
        ...gate,
        appearance: {
          source: "private",
          templateId: "gate-standard-v1",
          assetId: "other-user-private",
        },
        meta: { privateArtworkUrl: "https://private.invalid/secret" },
      },
    ]);
    const snapshot = await data("get_viewer_snapshot", { project_id: "art" });
    expect(snapshot.assets).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toContain("privateArtworkUrl");
    expect(JSON.stringify(snapshot)).not.toContain("private.invalid");
    expect(
      (snapshot.design as { appearances?: unknown }).appearances
    ).toBeUndefined();
  });
  it("bounds invalid requests and sanitizes malformed stored designs", async () => {
    expect((await call("list_projects", { limit: 1000 })).isError).toBe(true);
    expect((await call("get_project", { project_id: " " })).isError).toBe(true);
    save("broken");
    sqlite.exec(
      "UPDATE projects SET design_json='private malformed document' WHERE id='broken'"
    );
    const r = await call("get_project", { project_id: "broken" });
    expect(r.structuredContent).toMatchObject({
      error: { code: "unavailable" },
    });
    expect(JSON.stringify(r)).not.toContain("private malformed");
  });
});
