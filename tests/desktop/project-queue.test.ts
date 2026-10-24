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
  const design = { id: "track-one", title: "Unsaved work" };
  await expect(repository.command("save", { design })).rejects.toThrow(
    "Disk full"
  );
  expect(repository.getError()).toBe(failure);
  expect(
    repository.getErrorMessage(
      new Error(
        "Error invoking remote method 'desktop:projects': Error: Disk full"
      )
    )
  ).toBe("Disk full");
  await repository.command("state", undefined);
  await repository.command("save-copy", { design: { id: "other-track" } });
  expect(repository.getError("track-one")).toBe(failure);
  expect(repository.getSaveFailures()).toEqual([{ design, error: failure }]);
  await repository.command("save", {
    design: { ...design, title: "Latest edits" },
  });
  expect(repository.getError()).toBeNull();
  expect(repository.getSaveFailures()).toEqual([]);
});

it("retains independent failed project snapshots until each project is acknowledged", async () => {
  const projects = vi.fn().mockResolvedValue(state);
  vi.stubGlobal("window", { trackdrawDesktop: { projects } });
  const repository =
    await import("../../experiments/electron-desktop/renderer/storage/projects.mjs");
  await repository.ready;
  for (const id of ["one", "two"]) {
    projects.mockRejectedValueOnce(new Error("Read-only disk"));
    await expect(
      repository.command("save-copy", { design: { id } })
    ).rejects.toThrow("Read-only disk");
  }
  await repository.command("save-copy", { design: { id: "two" } });
  expect(repository.getSaveFailures().map(({ design }) => design.id)).toEqual([
    "one",
  ]);
  expect(repository.getError("two")).toBeNull();
});
