// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";

const accountId = "pilot";
const projectId = "existing-project";

function testBridge() {
  const rows = new Map<string, Record<string, unknown>>();
  const saveCloudProject = vi.fn();
  vi.stubGlobal("trackdrawDesktop", {
    saveCloudProject,
    cloudCache: vi.fn(
      async (
        account: string,
        project?: string,
        team?: string,
        record?: Record<string, unknown>
      ) => {
        if (!project)
          return structuredClone(
            [...rows.values()].filter((row) => row.accountId === account)
          );
        const key = JSON.stringify([account, team ?? null, project]);
        if (record) rows.set(key, structuredClone(record));
        return structuredClone(rows.get(key) ?? null);
      }
    ),
  });
  return saveCloudProject;
}

async function openStorage() {
  const storage =
    await import("../../experiments/tauri-desktop/renderer/storage/cloud-projects.mjs");
  storage.setSyncAccount(accountId);
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("replays the exact pending save after restart and keeps newer edits queued", async () => {
  const send = testBridge();
  let storage = await openStorage();
  const design = createDefaultDesign(projectId);
  const record = await storage.cacheCloudProject(accountId, projectId, {
    accountId,
    design,
    team: null,
    revision: 7,
    canEdit: true,
  });
  await storage.saveCloudDraft(record, { ...design, title: "First edit" });
  send.mockRejectedValueOnce("unavailable");
  await storage.syncCloudProjects(accountId);
  const first = send.mock.calls[0][1];
  expect(first).toMatchObject({
    projectId,
    revision: 7,
    design: { title: "First edit" },
  });
  await storage.saveCloudDraft(record, { ...design, title: "Second edit" });

  vi.resetModules();
  storage = await openStorage();
  expect(
    await storage.openCachedCloudProject(accountId, projectId, null)
  ).toMatchObject({
    design: { title: "Second edit" },
    pending: { revision: first.revision, design: first.design },
  });
  send
    .mockResolvedValueOnce({ revision: 8 })
    .mockResolvedValueOnce({ revision: 9 });
  await storage.syncCloudProjects(accountId);
  expect(send.mock.calls[1][1]).toEqual(first);
  expect(
    await storage.cachedCloudProject(accountId, projectId, null)
  ).toMatchObject({ dirty: true, revision: 8 });
  await storage.syncCloudProjects(accountId);
  expect(send.mock.calls[2][1]).toMatchObject({
    projectId,
    revision: 8,
    design: { title: "Second edit" },
  });
  expect(
    await storage.cachedCloudProject(accountId, projectId, null)
  ).toMatchObject({ dirty: false, revision: 9, pending: null });
});

it("preserves edits on a conflict and stops uploads for the signed-out account", async () => {
  const send = testBridge();
  const storage = await openStorage();
  const design = createDefaultDesign(projectId);
  const record = await storage.cacheCloudProject(accountId, projectId, {
    accountId,
    design,
    team: { id: "club", role: "editor", name: "Club" },
    revision: 3,
    canEdit: true,
  });
  await storage.saveCloudDraft(record, {
    ...design,
    title: "Keep these edits",
  });
  storage.setSyncAccount("another-account");
  await storage.syncCloudProjects(accountId);
  expect(send).not.toHaveBeenCalled();
  storage.setSyncAccount(accountId);
  send.mockRejectedValueOnce("conflict");
  await storage.syncCloudProjects(accountId);
  await storage.syncCloudProjects(accountId);
  expect(send).toHaveBeenCalledTimes(1);
  expect(
    await storage.cachedCloudProject(accountId, projectId, "club")
  ).toMatchObject({
    problem: "conflict",
    dirty: true,
    design: { title: "Keep these edits" },
  });
});
