import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import { apiKeyProjectAccess } from "@/lib/api/project-access";
import type { ApiKeyProjectAccess } from "@/lib/api/project-access";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  authenticateApiRequest: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/server/api-v1", async (original) => ({
  ...(await original<typeof import("@/lib/server/api-v1")>()),
  authenticateApiRequest: mocks.authenticateApiRequest,
}));
import {
  getProjectForUser,
  listProjectSummariesForUser,
} from "@/lib/server/projects";
import { GET as list } from "@/app/api/v1/projects/route";
import { GET as detail } from "@/app/api/v1/projects/[projectId]/route";
import { GET as track } from "@/app/api/v1/projects/[projectId]/track/route";
import { GET as overlay } from "@/app/api/v1/projects/[projectId]/overlay/route";
import { GET as viewer } from "@/app/api/v1/projects/[projectId]/viewer-snapshot/route";

let sqlite: ReturnType<typeof createMigratedDatabase>;
const selected: ApiKeyProjectAccess = {
  mode: "selected",
  projectIds: ["allowed", "foreign", "archived"],
};
function addProject(id: string, owner = "owner", archived = false) {
  const design = serializeDesign(createDefaultDesign());
  sqlite
    .prepare(
      `insert into projects (id, owner_user_id, title, design_json, created_at, updated_at, archived_at) values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      owner,
      id,
      JSON.stringify(design),
      "2026-10-20",
      "2026-10-20",
      archived ? "2026-10-20" : null
    );
}
function authenticate(access?: ApiKeyProjectAccess) {
  mocks.authenticateApiRequest.mockResolvedValue({
    ok: true,
    identity: {
      user: { id: "owner" },
      key: { metadata: access ? { projectAccess: access } : null },
    },
  });
}
beforeEach(() => {
  sqlite = createMigratedDatabase();
  sqlite.exec(
    `insert into users (id, email, createdAt, updatedAt) values ('owner', 'owner@example.com', '2026-10-20', '2026-10-20'), ('other', 'other@example.com', '2026-10-20', '2026-10-20')`
  );
  mocks.getDatabase.mockResolvedValue(sqliteD1(sqlite));
  addProject("allowed");
  addProject("unselected");
  addProject("foreign", "other");
  addProject("archived", "owner", true);
  authenticate(selected);
});
afterEach(() => sqlite.close());

describe("project access metadata", () => {
  it("explicitly preserves legacy keys and rejects invalid explicit boundaries", () => {
    expect(apiKeyProjectAccess(null)).toEqual({ mode: "all" });
    expect(apiKeyProjectAccess({})).toEqual({ mode: "all" });
    for (const value of [null, {}, { mode: "unknown" }, { mode: "selected" }]) {
      expect(apiKeyProjectAccess({ projectAccess: value })).toEqual({
        mode: "selected",
        projectIds: [],
      });
    }
    expect(
      apiKeyProjectAccess({
        projectAccess: { mode: "selected", projectIds: [] },
      })
    ).toEqual({ mode: "selected", projectIds: [] });
  });
});

describe("real project queries", () => {
  it("filters selected IDs and ownership in SQL", async () => {
    expect(
      (await listProjectSummariesForUser("owner", selected)).map((p) => p.id)
    ).toEqual(["allowed"]);
    expect(
      await listProjectSummariesForUser("owner", {
        mode: "selected",
        projectIds: [],
      })
    ).toEqual([]);
    expect(await getProjectForUser("unselected", "owner", selected)).toBeNull();
    expect(await getProjectForUser("foreign", "owner", selected)).toBeNull();
    expect(await getProjectForUser("archived", "owner", selected)).toBeNull();
  });
  it("only all-project and legacy keys include newly created projects", async () => {
    addProject("new");
    expect(
      (await listProjectSummariesForUser("owner", selected)).map((p) => p.id)
    ).toEqual(["allowed"]);
    for (const access of [
      { mode: "all" } as const,
      apiKeyProjectAccess(null),
    ]) {
      expect(
        (await listProjectSummariesForUser("owner", access)).map((p) => p.id)
      ).toEqual(["allowed", "new", "unselected"]);
      expect(await getProjectForUser("new", "owner", access)).not.toBeNull();
      expect(await getProjectForUser("foreign", "owner", access)).toBeNull();
    }
  });
});

describe("API routes with real query authorization", () => {
  it("filters before pagination and refuses unselected cursors", async () => {
    const response = await list(
      new Request("http://localhost/api/v1/projects?limit=1")
    );
    expect(await response.json()).toMatchObject({
      data: [{ id: "allowed" }],
      pagination: { has_more: false, next_cursor: null },
    });
    const cursor = Buffer.from("unselected").toString("base64url");
    expect(
      (
        await list(
          new Request(`http://localhost/api/v1/projects?cursor=${cursor}`)
        )
      ).status
    ).toBe(400);
  });
  it("includes a future project through the all-project list endpoint", async () => {
    authenticate({ mode: "all" });
    addProject("future");
    const payload = await (
      await list(new Request("http://localhost/api/v1/projects"))
    ).json();
    expect(payload.data.map((p: { id: string }) => p.id)).toEqual([
      "allowed",
      "future",
      "unselected",
    ]);
  });
  it.each([detail, track, overlay, viewer])(
    "applies selection, ownership, archive and share boundaries to each representation",
    async (route) => {
      for (const id of [
        "unselected",
        "foreign",
        "archived",
        "public-share-token",
      ]) {
        const response = await route(
          new Request("http://localhost/api/v1/projects/" + id),
          { params: Promise.resolve({ projectId: id }) }
        );
        expect(response.status).toBe(404);
      }
      expect(
        (
          await route(new Request("http://localhost/api/v1/projects/allowed"), {
            params: Promise.resolve({ projectId: "allowed" }),
          })
        ).status
      ).toBe(200);
    }
  );
});
