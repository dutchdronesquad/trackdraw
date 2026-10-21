// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";
import { createMemoryStorage } from "../helpers/storage";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  session: vi.fn(),
  editing: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@/components/teams/team-project-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  teamProjectRequest: mocks.request,
  teamEditingRequest: mocks.editing,
}));
vi.mock("@/lib/export/download-json", () => ({
  downloadJsonFile: mocks.download,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: mocks.session },
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function Viewer({ privateProject }: { privateProject: boolean }) {
      return <p>{privateProject ? "Private viewer" : "Public viewer"}</p>;
    },
}));
import TeamProjectWorkspace from "@/components/teams/TeamProjectWorkspace";
const privateDesign = {
  ...createDefaultDesign(),
  id: "private-race",
  title: "Private race",
};
beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
  mocks.session.mockReturnValue({
    data: { user: { id: "alice" } },
    isPending: false,
  });
  mocks.request.mockResolvedValue({
    project: { design: privateDesign },
    team: { id: "club", name: "Club", role: "viewer" },
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it("loads only into the private viewer, without persisting the design or exposing a share action", async () => {
  render(
    <TeamProjectWorkspace
      teamId="club"
      projectId="private-race"
      initialTab="2d"
    />
  );
  await screen.findByText("Private viewer");
  expect(screen.getByText("Private team project · Read-only")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /share/i })).toBeNull();
  expect(useEditor.getState().track.design.id).toBe("private-race");
  expect(localStorage.getItem("trackdraw-design")).toBeNull();
  expect(localStorage.getItem("trackdraw-project-private-race")).toBeNull();
});
it("clears the canvas and history when membership revalidation fails", async () => {
  render(
    <TeamProjectWorkspace
      teamId="club"
      projectId="private-race"
      initialTab="2d"
    />
  );
  await screen.findByText("Private viewer");
  mocks.request.mockRejectedValue(new Error("not_found"));
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  await screen.findByRole("alert");
  expect(screen.queryByText("Private viewer")).toBeNull();
  expect(useEditor.getState().track.design.id).not.toBe("private-race");
  expect(useEditor.temporal.getState().pastStates).toHaveLength(0);
});
it("hides the previous account's content immediately on sign-out", async () => {
  const rendered = render(
    <TeamProjectWorkspace
      teamId="club"
      projectId="private-race"
      initialTab="2d"
    />
  );
  await screen.findByText("Private viewer");
  mocks.session.mockReturnValue({ data: null, isPending: false });
  rendered.rerender(
    <TeamProjectWorkspace
      teamId="club"
      projectId="private-race"
      initialTab="2d"
    />
  );
  expect(screen.queryByText("Private viewer")).toBeNull();
  await waitFor(() =>
    expect(useEditor.getState().track.design.id).not.toBe("private-race")
  );
  expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
});

it("exports the unsaved recovery design rather than the older server design", async () => {
  mocks.request.mockResolvedValue({
    project: { design: privateDesign, revision: 1 },
    team: { id: "club", name: "Club", role: "editor" },
    editing: null,
  });
  mocks.editing.mockResolvedValue({
    lease: {
      sessionId: "00000000-0000-4000-a000-000000000001",
      expiresAt: "2099-01-01",
    },
    project: { design: privateDesign, revision: 1 },
  });
  render(
    <TeamProjectWorkspace
      teamId="club"
      projectId="private-race"
      initialTab="2d"
    />
  );
  fireEvent.click(await screen.findByRole("button", { name: "Edit project" }));
  await screen.findByRole("button", { name: "Finish editing" });
  act(() =>
    useEditor.getState().updateDesignMeta({ title: "My unsaved draft" })
  );
  act(() => window.dispatchEvent(new Event("offline")));
  fireEvent.click(
    await screen.findByRole("button", { name: "Export unsaved changes" })
  );
  expect(mocks.download).toHaveBeenCalledWith(
    "My unsaved draft-recovery.json",
    expect.objectContaining({ id: "private-race", title: "My unsaved draft" })
  );
  expect(screen.queryByRole("button", { name: "Finish editing" })).toBeNull();
  expect(
    mocks.editing.mock.calls.filter(([c]) => c.action === "save")
  ).toHaveLength(0);
});
