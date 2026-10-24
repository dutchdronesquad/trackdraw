import { afterEach, expect, it, vi } from "vitest";
const state = { designs: [], draft: null, restorePoints: [] };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("rejects unsupported team-move cleanup without deleting native or browser project data", async () => {
  const projects = vi.fn().mockResolvedValue(state);
  vi.stubGlobal("window", { trackdrawDesktop: { projects } });
  const repository =
    await import("../../experiments/electron-desktop/renderer/storage/projects.mjs");
  await repository.ready;
  projects.mockClear();
  expect(() => repository.forgetMovedProject("local-track")).toThrow(
    "Use the awaited desktop project repository."
  );
  expect(projects).not.toHaveBeenCalled();
  expect(repository.getState()).toBe(state);
});

it("does not dispatch a superseded document save after an earlier native request completes", async () => {
  const projects = vi.fn().mockResolvedValue(state);
  vi.stubGlobal("window", { trackdrawDesktop: { projects } });
  const repository =
    await import("../../experiments/electron-desktop/renderer/storage/projects.mjs");
  await repository.ready;
  projects.mockClear();
  let finish!: () => void;
  projects.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = () => resolve(state);
      })
  );
  const pending = repository.command("state", undefined);
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  let current = true;
  const oldSave = repository.command(
    "save",
    { design: { id: "old-document" } },
    () => current
  );
  current = false;
  finish();
  await Promise.all([pending, oldSave]);
  expect(projects).toHaveBeenCalledTimes(1);
  expect(projects).toHaveBeenCalledWith("state", undefined);
});

it("retains a failure until native acknowledgement and permits a subsequent retry", async () => {
  const projects = vi.fn().mockResolvedValue(state);
  vi.stubGlobal("window", { trackdrawDesktop: { projects } });
  const repository =
    await import("../../experiments/electron-desktop/renderer/storage/projects.mjs");
  await repository.ready;
  const failure = new Error("Disk full");
  projects.mockRejectedValueOnce(failure);
  await expect(repository.command("save", {})).rejects.toThrow("Disk full");
  expect(repository.getError()).toBe(failure);
  await repository.command("state", undefined);
  expect(repository.getError()).toBeNull();
});
