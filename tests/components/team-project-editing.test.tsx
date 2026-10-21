// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";
import { createMemoryStorage } from "../helpers/storage";
const mocks = vi.hoisted(() => ({ read: vi.fn(), edit: vi.fn() }));
vi.mock("@/components/teams/team-project-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  teamProjectRequest: mocks.read,
  teamEditingRequest: mocks.edit,
}));
import { TeamProjectRequestError } from "@/components/teams/team-project-client";
import { useTeamProjectEditing } from "@/components/teams/useTeamProjectEditing";
const design = { ...createDefaultDesign(), id: "race", title: "Server" };
const lease = {
  sessionId: "00000000-0000-4000-a000-000000000001",
  expiresAt: "2099-01-01",
};
let latest: ReturnType<typeof useTeamProjectEditing>;
function Harness({ user = "owner" }: { user?: string }) {
  const current = useTeamProjectEditing(user, "club", "race");
  useEffect(() => {
    latest = current;
  });
  return (
    <>
      <p>{current.status}</p>
      <p>{current.recovery?.title}</p>
      <button onClick={() => void current.acquire()}>Edit</button>
      <button onClick={() => void current.reload()}>Reload</button>
      <button onClick={() => void current.release()}>Finish</button>
    </>
  );
}
beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({}));
  mocks.read.mockResolvedValue({
    team: { id: "club", name: "Club", role: "owner" },
    project: { design, revision: 7 },
    editing: null,
  });
  mocks.edit.mockImplementation(async (c) =>
    c.action === "acquire"
      ? {
          lease,
          project: {
            design: { ...design, title: "Latest at acquisition" },
            revision: 8,
          },
        }
      : c.action === "save"
        ? { revision: c.revision + 1 }
        : { lease }
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function start() {
  render(<Harness />);
  await screen.findByText("viewing");
  fireEvent.click(screen.getByText("Edit"));
  await screen.findByText("editing");
}
it("viewing never claims a lease and acquisition replaces the draft with latest server data", async () => {
  render(<Harness />);
  await screen.findByText("viewing");
  expect(mocks.edit).not.toHaveBeenCalled();
  act(() => useEditor.getState().updateDesignMeta({ title: "Stale local" }));
  fireEvent.click(screen.getByText("Edit"));
  await screen.findByText("editing");
  expect(useEditor.getState().track.design.title).toBe("Latest at acquisition");
  expect(useEditor.temporal.getState().pastStates).toHaveLength(0);
  expect(localStorage.getItem("trackdraw-design")).toBeNull();
});
it("serializes saves by revision and does not mark later edits as saved by an earlier response", async () => {
  await start();
  let resolve!: (value: unknown) => void;
  mocks.edit.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  act(() => useEditor.getState().updateDesignMeta({ title: "First edit" }));
  let saving!: Promise<void>;
  act(() => {
    saving = latest.save();
  });
  act(() => useEditor.getState().updateDesignMeta({ title: "Second edit" }));
  await act(async () => {
    resolve({ revision: 9 });
    await saving;
  });
  expect(latest.dirty).toBe(true);
  await act(async () => latest.save());
  expect(mocks.edit.mock.calls.at(-1)?.[0]).toMatchObject({
    action: "save",
    revision: 9,
    design: { title: "Second edit" },
  });
  expect(latest.dirty).toBe(false);
});
it("offline immediately stops editing, preserves unsaved changes and never replays them on reload/reacquire", async () => {
  await start();
  act(() => useEditor.getState().updateDesignMeta({ title: "Recovery draft" }));
  act(() => window.dispatchEvent(new Event("offline")));
  expect(latest.editing).toBe(false);
  expect(latest.recovery?.title).toBe("Recovery draft");
  const calls = mocks.edit.mock.calls.length;
  await act(async () => latest.save());
  expect(mocks.edit).toHaveBeenCalledTimes(calls);
  fireEvent.click(screen.getByText("Edit"));
  expect(mocks.edit).toHaveBeenCalledTimes(calls);
  fireEvent.click(screen.getByText("Reload"));
  await screen.findByText("viewing");
  expect(latest.recovery).toBeNull();
  expect(useEditor.getState().track.design.title).toBe("Server");
  fireEvent.click(screen.getByText("Edit"));
  await screen.findByText("editing");
  expect(useEditor.getState().track.design.title).toBe("Latest at acquisition");
  expect(
    mocks.edit.mock.calls.filter(([c]) => c.action === "save")
  ).toHaveLength(0);
});
it("revision conflict locks the editor and preserves the draft without force-writing", async () => {
  await start();
  act(() =>
    useEditor.getState().updateDesignMeta({ title: "Unsaved conflict" })
  );
  mocks.edit.mockRejectedValueOnce(new TeamProjectRequestError("conflict"));
  await act(async () => latest.save());
  expect(latest.status).toBe("conflict");
  expect(latest.editing).toBe(false);
  expect(latest.recovery?.title).toBe("Unsaved conflict");
});
it("keeps history during solo editing and saves before explicit release", async () => {
  await start();
  act(() => useEditor.getState().updateDesignMeta({ title: "One" }));
  expect(useEditor.temporal.getState().pastStates.length).toBeGreaterThan(0);
  await act(async () => latest.release());
  expect(mocks.edit.mock.calls.map(([c]) => c.action)).toEqual([
    "acquire",
    "save",
    "release",
  ]);
  expect(latest.editing).toBe(false);
});
it("late save completion cannot re-enable a lost editing session", async () => {
  await start();
  let resolve!: (value: unknown) => void;
  mocks.edit.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  act(() => useEditor.getState().updateDesignMeta({ title: "Uncertain save" }));
  let pending!: Promise<void>;
  act(() => {
    pending = latest.save();
  });
  act(() => window.dispatchEvent(new Event("offline")));
  await act(async () => {
    resolve({ revision: 9 });
    await pending;
  });
  expect(latest.editing).toBe(false);
  expect(latest.recovery?.title).toBe("Uncertain save");
});
it("does not expose a previous account recovery copy while a different account loads", async () => {
  const view = render(<Harness />);
  await screen.findByText("viewing");
  fireEvent.click(screen.getByText("Edit"));
  await screen.findByText("editing");
  act(() =>
    useEditor.getState().updateDesignMeta({ title: "Owner private draft" })
  );
  act(() => window.dispatchEvent(new Event("offline")));
  mocks.read.mockImplementation(() => new Promise(() => {}));
  view.rerender(<Harness user="other" />);
  expect(latest.loaded).toBeNull();
  expect(latest.recovery).toBeNull();
  expect(screen.queryByText("Owner private draft")).toBeNull();
});
it("renewal failure on role loss stops writes and retains pending changes", async () => {
  vi.useFakeTimers();
  await act(async () => {
    render(<Harness />);
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Edit"));
  });
  act(() => useEditor.getState().beginInteraction());
  act(() =>
    useEditor.getState().updateDesignMeta({ title: "Role lost draft" })
  );
  mocks.edit.mockRejectedValueOnce(new TeamProjectRequestError("lease_lost"));
  await act(async () => vi.advanceTimersByTimeAsync(20_000));
  expect(latest.editing).toBe(false);
  expect(latest.recovery?.title).toBe("Role lost draft");
  act(() => useEditor.getState().endInteraction());
});
it("blocks same-tab navigation while a draft needs saving or recovery", async () => {
  await start();
  const anchor = document.createElement("a");
  anchor.href = "/";
  document.body.append(anchor);
  act(() => useEditor.getState().updateDesignMeta({ title: "Do not lose" }));
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  anchor.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  anchor.remove();
});
it("runs a delayed heartbeat immediately after a save instead of starving renewal", async () => {
  vi.useFakeTimers();
  await act(async () => {
    render(<Harness />);
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Edit"));
  });
  let resolve!: (value: unknown) => void;
  mocks.edit.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  act(() => useEditor.getState().updateDesignMeta({ title: "Saving" }));
  let pending!: Promise<void>;
  act(() => {
    pending = latest.save();
  });
  await act(async () => vi.advanceTimersByTimeAsync(20_000));
  expect(
    mocks.edit.mock.calls.filter(([c]) => c.action === "renew")
  ).toHaveLength(0);
  await act(async () => {
    resolve({ revision: 9 });
    await pending;
  });
  expect(mocks.edit.mock.calls.at(-1)?.[0]).toMatchObject({ action: "renew" });
});

it("allows recovery download links while blocking navigation", async () => {
  await start();
  act(() =>
    useEditor.getState().updateDesignMeta({ title: "Recovery export" })
  );
  const anchor = document.createElement("a");
  anchor.href = "blob:https://trackdraw.app/recovery";
  anchor.download = "recovery.json";
  document.body.append(anchor);
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  const preventNavigation = (e: Event) => {
    expect(e.defaultPrevented).toBe(false);
    e.preventDefault();
  };
  anchor.addEventListener("click", preventNavigation);
  anchor.dispatchEvent(event);
  anchor.remove();
});
