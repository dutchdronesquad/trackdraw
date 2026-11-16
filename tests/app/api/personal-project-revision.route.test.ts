import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET as readStudioProject } from "@/app/api/projects/[projectId]/route";
import { GET as readTrackPackage } from "@/app/api/v1/projects/[projectId]/track/route";
import {
  getApiIdentityFromBearerKey,
  type ApiIdentity,
} from "@/lib/server/api-keys";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getDatabase } from "@/lib/server/db";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import { routeContext, testUser } from "../../helpers/api-routes";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/api-keys", () => ({
  getApiIdentityFromBearerKey: vi.fn(),
  trackReadPermission: { tracks: ["read"] },
}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn() }));

let sqlite: ReturnType<typeof createMigratedDatabase>;
const projectId = "race";
const design = serializeDesign({
  ...createDefaultDesign(projectId),
  title: "Race layout",
});

function authenticateKey(metadata: ApiIdentity["key"]["metadata"] = null) {
  vi.mocked(getApiIdentityFromBearerKey).mockResolvedValue({
    ok: true,
    identity: { user: testUser, key: { metadata } as ApiIdentity["key"] },
  });
}

beforeEach(() => {
  sqlite = createMigratedDatabase();
  vi.mocked(getDatabase).mockResolvedValue(sqliteD1(sqlite));
  vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(testUser);
  authenticateKey();
  const insertUser = sqlite.prepare(
    "INSERT INTO users (id, email, createdAt, updatedAt) VALUES (?, ?, '2026', '2026')"
  );
  insertUser.run(testUser.id, testUser.email);
  insertUser.run("other", "other@example.invalid");
  sqlite
    .prepare(
      "INSERT INTO projects (id, owner_user_id, title, design_json, revision, created_at, updated_at) VALUES (?, ?, ?, ?, 2, '2026', '2026')"
    )
    .run(projectId, testUser.id, design.title, JSON.stringify(design));
});

afterEach(() => sqlite.close());

function studio(revision?: string) {
  const url = new URL(`http://localhost:3000/api/projects/${projectId}`);
  if (revision !== undefined) url.searchParams.set("knownRevision", revision);
  return readStudioProject(new Request(url), routeContext({ projectId }));
}

function rest(revision?: string, teamId?: string) {
  const url = new URL(
    `http://localhost:3000/api/v1/projects/${projectId}/track`
  );
  if (revision !== undefined) url.searchParams.set("known_revision", revision);
  if (teamId) url.searchParams.set("team_id", teamId);
  return readTrackPackage(new Request(url), routeContext({ projectId }));
}

it("returns the stored revision without a design on a Studio match", async () => {
  const unchanged = await studio("2");
  expect(unchanged.status).toBe(200);
  expect(unchanged.headers.get("cache-control")).toBe("no-store");
  expect(unchanged.headers.get("vary")).toBe("Cookie");
  await expect(unchanged.json()).resolves.toEqual({
    ok: true,
    revision: 2,
    project: null,
  });

  const regular = await studio();
  const full = await regular.json();
  expect(full).toMatchObject({ ok: true, project: { revision: 2 } });
  expect(full).not.toHaveProperty("revision");
  const changed = await studio("1");
  await expect(changed.json()).resolves.toEqual({ ...full, revision: 2 });
});

it("returns the current REST revision and packages the track only when it differs", async () => {
  const unchanged = await rest("2");
  expect(unchanged.status).toBe(200);
  expect(unchanged.headers.get("cache-control")).toBe("no-store");
  await expect(unchanged.json()).resolves.toEqual({
    data: { revision: 2, track: null },
    meta: { api_version: "v1" },
  });
  const regular = await rest();
  const full = await regular.json();
  expect(full.data).toMatchObject({ title: design.title, shapes: [] });
  // A client which knows a different revision can use the returned snapshot.
  const changed = await rest("3");
  await expect(changed.json()).resolves.toEqual({
    ...full,
    data: { revision: 2, track: full.data },
  });
});

it.each(["", "0", "1.5", "-2", "2e0", "9007199254740992"])(
  "rejects invalid known revisions (%j)",
  async (value) => {
    expect((await studio(value)).status).toBe(400);
    expect((await rest(value)).status).toBe(400);
  }
);

function storedRevision() {
  return String(
    sqlite.prepare("SELECT revision FROM projects WHERE id = ?").get(projectId)
      ?.revision
  );
}

it("rechecks access and archive state even with a matching revision", async () => {
  vi.mocked(getCurrentUserFromHeaders).mockResolvedValueOnce(null);
  expect((await studio("2")).status).toBe(401);

  vi.mocked(getCurrentUserFromHeaders).mockResolvedValueOnce({
    ...testUser,
    id: "other",
  });
  expect((await studio("2")).status).toBe(404);

  authenticateKey({
    projectAccess: { mode: "selected", projectIds: ["other"] },
  });
  expect((await rest("2")).status).toBe(404);
  authenticateKey({
    projectAccess: { mode: "selected", projectIds: [projectId] },
  });
  expect((await rest("2")).status).toBe(200);

  sqlite
    .prepare("UPDATE projects SET archived_at = '2026' WHERE id = ?")
    .run(projectId);
  const revision = storedRevision();
  expect((await studio(revision)).status).toBe(404);
  expect((await rest(revision)).status).toBe(404);
});

it("restricts the conditional response to personal context with current ownership", async () => {
  sqlite.exec(
    "INSERT INTO teams (id, name, slug, createdAt) VALUES ('club', 'Club', 'club', '2026')"
  );
  sqlite
    .prepare(
      "UPDATE projects SET owner_user_id = NULL, owner_team_id = 'club' WHERE id = ?"
    )
    .run(projectId);
  const revision = storedRevision();
  expect((await studio(revision)).status).toBe(404);
  expect((await rest(revision)).status).toBe(404);
  authenticateKey({ projectAccess: { mode: "all", teamId: "club" } });
  expect((await rest("2", "club")).status).toBe(400);
});
