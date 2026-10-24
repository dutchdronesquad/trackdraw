// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MoveProject as MoveReviewDialog } from "@/components/dialogs/ProjectManager/MoveProject";
import { useProjectMove } from "@/components/dialogs/ProjectManager/useProjectMove";
function MoveProject({
  projectId,
  userId,
  onCancel,
}: {
  projectId: string;
  userId: string;
  onCancel: () => void;
}) {
  const review = useProjectMove(projectId, userId);
  return <MoveReviewDialog review={review} onCancel={onCancel} />;
}
import { useProjectLibrary } from "@/store/project-library";
const mocks = vi.hoisted(() => ({
  teams: vi.fn(),
  projects: vi.fn(),
  forget: vi.fn(),
  isMobile: false,
}));
vi.mock("@/components/teams/team-client", () => ({ teamRequest: mocks.teams }));
vi.mock("@/components/teams/team-project-client", () => ({
  teamProjectRequest: mocks.projects,
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mocks.isMobile }));
vi.mock("@/lib/projects", () => ({ forgetMovedProject: mocks.forget }));
const preview = {
  projectId: "race",
  title: "Practice layout",
  revision: 3,
  publicationVersion: "current",
  shareCount: 2,
  galleryCount: 1,
};
beforeEach(() => {
  mocks.isMobile = false;
  mocks.teams.mockResolvedValue({
    teams: [
      { id: "club", name: "Drone Club", role: "owner", projectCount: 0 },
      { id: "other", name: "Other club", role: "editor", projectCount: 0 },
    ],
  });
  mocks.projects.mockResolvedValue({ preview });
  useProjectLibrary.setState({ byUser: { alice: "personal" } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
async function chooseTeam(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("combobox", { name: "Destination team" })
  );
  expect(screen.queryByRole("option", { name: "Other club" })).toBeNull();
  await user.click(await screen.findByRole("option", { name: "Drone Club" }));
}
it("explains the move, limits destinations to owned teams and cancels without moving", async () => {
  const cancel = vi.fn();
  const user = userEvent.setup();
  render(<MoveProject projectId="race" userId="alice" onCancel={cancel} />);
  expect(
    screen.getByRole("dialog", { name: "Move project to a team" })
  ).toBeTruthy();
  await screen.findByText("Practice layout");
  expect(
    (
      screen.getByRole("button", {
        name: "Move project",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  expect(screen.getByText("You can’t move it back.")).toBeTruthy();
  expect(
    screen.getByText("Your local device copy and snapshots will be removed.")
  ).toBeTruthy();
  await chooseTeam(user);
  await user.click(
    screen.getByRole("button", { name: /Public links and gallery entries/ })
  );
  expect(
    await screen.findByText(/2 active share links, 1 public gallery entry/)
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(mocks.projects).toHaveBeenCalledTimes(1);
  expect(mocks.forget).not.toHaveBeenCalled();
});
it("submits the reviewed revision once, blocks dismissal while pending and opens the team project", async () => {
  let resolve!: (value: unknown) => void;
  mocks.projects.mockImplementation((query, command) =>
    command
      ? new Promise((r) => {
          resolve = r;
        })
      : Promise.resolve({ preview })
  );
  const navigate = vi
    .spyOn(window.location, "assign")
    .mockImplementation(() => {});
  const cancel = vi.fn();
  const user = userEvent.setup();
  render(<MoveProject projectId="race" userId="alice" onCancel={cancel} />);
  await chooseTeam(user);
  const submit = screen.getByRole("button", {
    name: "Move project",
  });
  await user.dblClick(submit);
  await user.keyboard("{Escape}");
  expect(cancel).not.toHaveBeenCalled();
  expect(
    (
      screen.getByRole("button", {
        name: "Cancel",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  expect(mocks.projects).toHaveBeenCalledTimes(2);
  expect(mocks.projects).toHaveBeenLastCalledWith(
    {},
    {
      action: "move",
      projectId: "race",
      teamId: "club",
      revision: 3,
      publicationVersion: "current",
    }
  );
  await act(async () => resolve({ ok: true }));
  expect(mocks.forget).toHaveBeenCalledWith("race");
  expect(useProjectLibrary.getState().byUser.alice).toBe("club");
  expect(navigate).toHaveBeenCalledWith("/studio?teamId=club&teamProject=race");
});
it("requires a fresh preview after a failed move and keeps local content untouched", async () => {
  mocks.projects.mockImplementation((query, command) =>
    command ? Promise.reject(new Error("stale")) : Promise.resolve({ preview })
  );
  const user = userEvent.setup();
  render(<MoveProject projectId="race" userId="alice" onCancel={() => {}} />);
  await chooseTeam(user);
  await user.click(screen.getByRole("button", { name: "Move project" }));
  await screen.findByRole("alert");
  expect(
    (
      screen.getByRole("button", {
        name: "Move project",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  expect(mocks.forget).not.toHaveBeenCalled();
  expect(useProjectLibrary.getState().byUser.alice).toBe("personal");
  mocks.projects.mockResolvedValue({
    preview: { ...preview, revision: 4, publicationVersion: "fresh" },
  });
  await user.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText("Practice layout");
  await waitFor(() => expect(mocks.projects).toHaveBeenCalledTimes(3));
  expect(
    (
      screen.getByRole("button", {
        name: "Move project",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(false);
});
it("offers no move when no owned team is available", async () => {
  mocks.teams.mockResolvedValue({
    teams: [
      { id: "other", name: "Other club", role: "editor", projectCount: 0 },
    ],
  });
  render(<MoveProject projectId="race" userId="alice" onCancel={() => {}} />);
  expect(
    await screen.findByText("You must own a team to move a project into it.")
  ).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: "Move project",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
});

it("keeps the chosen team and reviewed details when switching to the mobile drawer", async () => {
  const user = userEvent.setup();
  const props = { projectId: "race", userId: "alice", onCancel: vi.fn() };
  const view = render(<MoveProject {...props} />);
  await chooseTeam(user);
  await user.click(
    screen.getByRole("button", { name: /Public links and gallery entries/ })
  );
  mocks.isMobile = true;
  view.rerender(<MoveProject {...props} />);
  expect(
    await screen.findByRole("dialog", { name: "Move project to a team" })
  ).toBeTruthy();
  expect(
    screen.getByRole("combobox", { name: "Destination team" }).textContent
  ).toContain("Drone Club");
  expect(
    screen.getByText(/2 active share links, 1 public gallery entry/)
  ).toBeTruthy();
  expect(mocks.projects).toHaveBeenCalledOnce();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(props.onCancel).toHaveBeenCalledOnce();
});

it("does not expose the previous account's review while another account loads", async () => {
  const props = { projectId: "race", userId: "alice", onCancel: vi.fn() };
  const view = render(<MoveProject {...props} />);
  await screen.findByText("Practice layout");
  mocks.projects.mockReturnValue(new Promise(() => {}));
  view.rerender(<MoveProject {...props} userId="bob" />);
  expect(screen.queryByText("Practice layout")).toBeNull();
  expect(screen.getByRole("status")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Move project" }) as HTMLButtonElement)
      .disabled
  ).toBe(true);
});
