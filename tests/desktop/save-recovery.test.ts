// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createMemoryStorage } from "../helpers/storage";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("requires current backups for every unsaved document and retries the latest in-memory design", async () => {
  const storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
  let fail = false;
  let native = {
    designs: [] as ReturnType<typeof serializeDesign>[],
    draft: null as ReturnType<typeof serializeDesign> | null,
    restorePoints: [],
  };
  vi.stubGlobal("window", {
    localStorage: storage,
    trackdrawDesktop: {
      projects: vi.fn(async (name, payload) => {
        if (name === "state") return native;
        if (fail) throw new Error("Disk full");
        const design = payload.design;
        native = {
          ...native,
          designs: [
            ...native.designs.filter((saved) => saved.id !== design.id),
            design,
          ],
          draft: name === "save" ? design : native.draft,
        };
        return native;
      }),
    },
  });
  const repository =
    await import("../../experiments/electron-desktop/renderer/storage/projects.mjs");
  const workspace =
    await import("../../experiments/electron-desktop/renderer/workspace/workspace.mjs");
  await repository.ready;
  workspace.initializeWorkspace();
  const one = createDefaultDesign();
  const two = { ...createDefaultDesign(), id: "second-track" };
  await workspace.createDocument(one);
  await workspace.createDocument(two);
  const first = workspace.getDocument(one.id)!;
  const second = workspace.getDocument(two.id)!;
  first.store.getState().updateDesignMeta({ title: "Unsaved first" });
  second.store.getState().updateDesignMeta({ title: "Unsaved second" });
  fail = true;
  for (const document of [first, second])
    await expect(
      repository.saveCopy(document.store.getState().track.design)
    ).rejects.toThrow("Disk full");
  expect(workspace.canCloseWithBackups()).toBe(false);
  vi.spyOn(storage, "setItem").mockImplementation(() => {
    throw new Error("Browser storage full");
  });
  workspace.markProjectBackup(first.store.getState().track.design);
  expect(workspace.canCloseWithBackups()).toBe(false);
  workspace.markProjectBackup(second.store.getState().track.design);
  expect(workspace.canCloseWithBackups()).toBe(true);
  first.store.getState().updateDesignMeta({ title: "Latest first" });
  expect(workspace.canCloseWithBackups()).toBe(false);
  fail = false;
  await workspace.retryDocumentSave(one.id);
  expect(repository.loadProject(one.id)?.title).toBe("Latest first");
  expect(repository.getError(one.id)).toBeNull();
  expect(repository.getError(two.id)?.message).toBe("Disk full");
  expect(workspace.canCloseWithBackups()).toBe(true);
  await workspace.retryDocumentSave(two.id);
  expect(repository.getSaveFailures()).toEqual([]);
  expect(workspace.canCloseWithBackups()).toBe(false);
  fail = true;
  await expect(workspace.flushDocuments()).resolves.toBeUndefined();
  const failedCopy = {
    ...createDefaultDesign(),
    id: "unopened-copy",
    title: "Unopened recovery",
  };
  await expect(repository.saveCopy(failedCopy)).rejects.toThrow("Disk full");
  await expect(workspace.flushDocuments()).rejects.toThrow("Disk full");
  expect(workspace.getRecoveryDesign(failedCopy.id)?.title).toBe(
    failedCopy.title
  );
  expect(workspace.canCloseWithBackups()).toBe(false);
  workspace.markProjectBackup(failedCopy);
  expect(workspace.canCloseWithBackups()).toBe(true);
  fail = false;
  await workspace.flushDocuments();
  expect(repository.loadProject(failedCopy.id)?.title).toBe(failedCopy.title);
});
