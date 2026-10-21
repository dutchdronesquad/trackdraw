// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";
import { createMemoryStorage } from "../helpers/storage";
const mocks = vi.hoisted(() => ({ request: vi.fn(), session: vi.fn() }));
vi.mock("@/components/teams/team-project-client", () => ({
  teamProjectRequest: mocks.request,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: mocks.session },
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
