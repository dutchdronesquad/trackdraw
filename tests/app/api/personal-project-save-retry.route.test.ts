import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/projects/route";
import { PUT } from "@/app/api/v1/projects/[projectId]/route";
import {
  getApiIdentityFromBearerKey,
  type ApiIdentity,
} from "@/lib/server/api-keys";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getDatabase } from "@/lib/server/db";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import { jsonRequest, routeContext, testUser } from "../../helpers/api-routes";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/api-keys", () => ({
  getApiIdentityFromBearerKey: vi.fn(),
}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/server/audit", () => ({ recordAuditEvent: vi.fn() }));

let sqlite: ReturnType<typeof createMigratedDatabase>;

beforeEach(() => {
  sqlite = createMigratedDatabase();
  sqlite
    .prepare(
      "INSERT INTO users (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, '2026', '2026')"
    )
    .run(testUser.id, testUser.name, testUser.email);
  vi.mocked(getDatabase).mockResolvedValue(sqliteD1(sqlite));
  vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(testUser);
});

afterEach(() => sqlite.close());

function save(body: object) {
  return POST(
    new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify(body),
    })
  );
}

async function prepareUpdate() {
  const design = createDefaultDesign();
  const projectId = design.id;
  const created = await save({ projectId, design: serializeDesign(design) });
  expect(created.status).toBe(200);
  const initial = (await created.json()).project;
  return {
    projectId,
    design: serializeDesign({
      ...design,
      title: "Saved layout",
      updatedAt: "2026-11-16T12:00:00.000Z",
    }),
    baseRevision: initial.revision as number,
    baseDesignUpdatedAt: initial.designUpdatedAt as string,
  };
}

it("acknowledges an identical personal cloud save after the first response is lost", async () => {
  const update = await prepareUpdate();
  const first = await save(update);
  expect(first.status).toBe(200);
  const committed = (await first.json()).project;
  const retry = await save(update);
  expect(retry.status).toBe(200);
  const confirmed = (await retry.json()).project;
  expect(confirmed).toEqual(committed);
  expect(confirmed.revision).toBe(update.baseRevision + 1);

  const differentMetadata = await save({ ...update, title: "Other title" });
  expect(differentMetadata.status).toBe(409);

  const invalidFutureBase = await save({
    ...update,
    baseRevision: confirmed.revision + 1,
  });
  expect(invalidFutureBase.status).toBe(409);

  const newerSave = await save({
    ...update,
    design: { ...update.design, title: "Changed on web" },
    baseRevision: confirmed.revision,
    baseDesignUpdatedAt: confirmed.designUpdatedAt,
  });
  expect(newerSave.status).toBe(200);
  const staleRetry = await save(update);
  expect(staleRetry.status).toBe(409);
  await expect(staleRetry.json()).resolves.toMatchObject({
    code: "project_version_conflict",
    project: { title: "Changed on web", revision: confirmed.revision + 1 },
  });
});

it("acknowledges concurrent identical saves with the same single revision", async () => {
  const update = await prepareUpdate();
  const responses = await Promise.all([save(update), save(update)]);
  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  const [one, two] = await Promise.all(
    responses.map(async (response) => (await response.json()).project)
  );
  expect(one.revision).toBe(update.baseRevision + 1);
  expect(two).toEqual(one);
});

it("returns the same revision when a personal REST update is retried", async () => {
  vi.mocked(getApiIdentityFromBearerKey).mockResolvedValue({
    ok: true,
    identity: { user: testUser, key: { metadata: null } as ApiIdentity["key"] },
  });
  const update = await prepareUpdate();
  const put = () =>
    PUT(
      jsonRequest(
        `http://localhost:3000/api/v1/projects/${update.projectId}`,
        "PUT",
        { design: update.design, base_revision: update.baseRevision }
      ),
      routeContext({ projectId: update.projectId })
    );

  const first = await put();
  const retry = await put();
  expect([first.status, retry.status]).toEqual([200, 200]);
  const expected = { id: update.projectId, revision: update.baseRevision + 1 };
  await expect(first.json()).resolves.toMatchObject({ data: expected });
  await expect(retry.json()).resolves.toMatchObject({ data: expected });
});
