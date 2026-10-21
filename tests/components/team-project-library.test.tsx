// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TeamLibrary } from "@/components/dialogs/ProjectManager/TeamLibrary";
import { useProjectLibrary } from "@/store/project-library";
const mocks = vi.hoisted(() => ({ teams: vi.fn(), projects: vi.fn() }));
vi.mock("@/components/teams/team-client", () => ({ teamRequest: mocks.teams }));
vi.mock("@/components/teams/team-project-client", () => ({
  teamProjectRequest: mocks.projects,
  TeamProjectRequestError: class extends Error {},
}));
const club = { id: "club", name: "Drone Club", role: "viewer" };
beforeEach(() => {
  useProjectLibrary.setState({ byUser: { alice: "club" } });
  mocks.teams.mockResolvedValue({ teams: [club] });
  mocks.projects.mockResolvedValue({
    projects: [
      {
        id: "race",
        title: "Private race",
        shapeCount: 2,
        updatedAt: new Date().toISOString(),
      },
    ],
    nextCursor: null,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("restores the selected team, opens the same project read-only and offers viewers no create action", async () => {
  render(<TeamLibrary userId="alice" personal={<p>Personal library</p>} />);
  const link = await screen.findByRole("link", { name: /Private race/ });
  expect(link.getAttribute("href")).toBe(
    "/studio?teamId=club&teamProject=race"
  );
  expect(screen.queryByText("Personal library")).toBeNull();
  expect(screen.queryByRole("button", { name: "New project" })).toBeNull();
  expect(screen.getByText("Read-only")).toBeTruthy();
});
it("falls back after membership removal without reusing a team draft", async () => {
  mocks.teams.mockResolvedValue({ teams: [] });
  render(<TeamLibrary userId="alice" personal={<p>Personal library</p>} />);
  await screen.findByText("Personal library");
  expect(useProjectLibrary.getState().byUser.alice).toBe("personal");
  expect(mocks.projects).not.toHaveBeenCalled();
});
it("does not apply a late team response after switching to another account", async () => {
  let resolve!: (value: unknown) => void;
  mocks.projects.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  const rendered = render(
    <TeamLibrary key="alice" userId="alice" personal={<p>Alice personal</p>} />
  );
  await waitFor(() => expect(mocks.projects).toHaveBeenCalled());
  rendered.rerender(
    <TeamLibrary key="bob" userId="bob" personal={<p>Bob personal</p>} />
  );
  await act(async () =>
    resolve({
      projects: [{ id: "private", title: "Alice private", shapeCount: 4 }],
      nextCursor: null,
    })
  );
  expect(screen.queryByText("Alice private")).toBeNull();
  expect(screen.getByText("Bob personal")).toBeTruthy();
  expect(useProjectLibrary.getState().byUser.bob).toBeUndefined();
});

it("switches between team and personal scopes without opening or saving a project", async () => {
  mocks.teams.mockResolvedValue({
    teams: [club, { id: "weekend", name: "Weekend Racers", role: "editor" }],
  });
  const createPersonal = vi.fn();
  render(
    <TeamLibrary
      userId="alice"
      personal={<p>Personal library</p>}
      onNewPersonalProject={createPersonal}
    />
  );
  await screen.findByRole("link", { name: /Private race/ });
  await act(async () =>
    screen.getByRole("button", { name: "Weekend Racers" }).click()
  );
  await waitFor(() =>
    expect(useProjectLibrary.getState().byUser.alice).toBe("weekend")
  );
  expect(
    screen
      .getByRole("button", { name: "Weekend Racers" })
      .getAttribute("aria-current")
  ).toBe("page");
  await screen.findByRole("button", { name: "New project" });
  await act(async () =>
    screen.getByRole("button", { name: "Personal projects" }).click()
  );
  await screen.findByText("Personal library");
  await act(async () =>
    screen.getByRole("button", { name: "New project" }).click()
  );
  expect(createPersonal).toHaveBeenCalledOnce();
  expect(mocks.teams).toHaveBeenCalledOnce();
  expect(
    mocks.projects.mock.calls.every(([, command]) => command === undefined)
  ).toBe(true);
});
