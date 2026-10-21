// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render as renderComponent,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamsView } from "@/components/teams/TeamsView";
import { TeamManagement } from "@/components/teams/TeamManagement";
import { InvitationPage } from "@/components/teams/InvitationPage";
import { TeamDialogState } from "@/components/teams/TeamDialogState";
import type { ReactElement } from "react";
import type { TeamDetails } from "@/lib/teams";
const render = (ui: ReactElement) => {
  const wrap = (child: ReactElement) => (
    <TeamDialogState>{child}</TeamDialogState>
  );
  const result = renderComponent(wrap(ui));
  return {
    ...result,
    rerender: (child: ReactElement) => result.rerender(wrap(child)),
  };
};
const state = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  signOut: vi.fn(),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: state.user ? { user: state.user } : null,
      isPending: false,
    }),
    signOut: state.signOut,
  },
}));
const team: TeamDetails = {
  id: "team",
  name: "Race team",
  role: "owner",
  members: [
    {
      userId: "owner",
      name: "Owner",
      email: "owner@example.invalid",
      role: "owner",
    },
    {
      userId: "pilot",
      name: "Pilot",
      email: "pilot@example.invalid",
      role: "editor",
    },
  ],
  invitations: [],
};
const invitation = {
  id: "invite",
  teamId: "team",
  teamName: "Race team",
  role: "editor",
  status: "pending",
  expiresAt: "2099-01-01",
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
beforeEach(() => {
  state.user = null;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("creates a team in the account surface and loads its owner controls", async () => {
  let created = false;
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      expect(JSON.parse(String(init.body))).toEqual({
        action: "create",
        name: "Race team",
      });
      created = true;
      return response({ ok: true, teamId: "team" });
    }
    return response(
      url.includes("teamId=")
        ? { ok: true, team }
        : {
            ok: true,
            enabled: true,
            teams: created
              ? [{ id: "team", name: "Race team", role: "owner" }]
              : [],
            invitations: [],
          }
    );
  });
  vi.stubGlobal("fetch", fetch);
  render(<TeamsView />);
  const user = userEvent.setup();
  await user.type(
    await screen.findByRole("textbox", { name: "Team name" }),
    "Race team"
  );
  await user.click(screen.getByRole("button", { name: "Create team" }));
  expect(await screen.findByRole("heading", { name: "Members" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Send invitation" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Leave team" })).toBeNull();
});
it("requires confirmation to remove a member and does not offer owner promotion", async () => {
  const action = vi.fn();
  render(<TeamManagement team={team} busy={false} onCommand={action} />);
  const user = userEvent.setup();
  expect(
    screen.getAllByRole("option").map((option) => option.textContent)
  ).not.toContain("Owner");
  await user.click(screen.getByRole("button", { name: "Remove" }));
  expect(action).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Confirm removal" }));
  expect(action).toHaveBeenCalledWith({
    action: "remove",
    teamId: "team",
    userId: "pilot",
  });
});
it("offers a member only their own role and a confirmed leave action", async () => {
  const action = vi.fn();
  render(
    <TeamManagement
      team={{ ...team, role: "viewer", members: [] }}
      busy={false}
      onCommand={action}
    />
  );
  const user = userEvent.setup();
  expect(screen.queryByRole("button", { name: "Send invitation" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Leave team" }));
  expect(action).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Leave team" }));
  expect(action).toHaveBeenCalledWith({ action: "leave", teamId: "team" });
});
it("preserves the invitation through sign-in and never accepts it on page load", async () => {
  const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
    response(
      init?.method === "POST"
        ? { ok: true, teamId: "team" }
        : { ok: true, invitation }
    )
  );
  vi.stubGlobal("fetch", fetch);
  const { rerender } = render(<InvitationPage invitationId="invite" />);
  const link = screen.getByRole("link", {
    name: "Sign in or create an account",
  });
  expect(
    new URL(
      link.getAttribute("href")!,
      "https://trackdraw.app"
    ).searchParams.get("callbackURL")
  ).toBe("/teams/invitation/invite");
  expect(fetch).not.toHaveBeenCalled();
  state.user = { id: "pilot", email: "pilot@example.invalid" };
  rerender(<InvitationPage invitationId="invite" />);
  const accept = await screen.findByRole("button", {
    name: "Accept invitation",
  });
  expect(fetch.mock.calls.every((call) => call[1]?.method !== "POST")).toBe(
    true
  );
  await userEvent.setup().click(accept);
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("You have joined")
  );
  expect(
    fetch.mock.calls.find((call) => call[1]?.method === "POST")?.[1]?.body
  ).toBe(JSON.stringify({ action: "accept", invitationId: "invite" }));
});
it("does not reveal an invitation to the wrong account and offers account switching", async () => {
  state.user = { id: "outsider", email: "outsider@example.invalid" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response({ ok: false, code: "not_found" }, 404))
  );
  render(<InvitationPage invitationId="invite" />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Accept invitation" })
  ).toBeNull();
  expect(screen.queryByText("Race team")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Use another account" })
  ).toBeTruthy();
});
it("shows expired invitations without an accept action", async () => {
  state.user = { id: "pilot", email: "pilot@example.invalid" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      response({ ok: true, invitation: { ...invitation, status: "expired" } })
    )
  );
  render(<InvitationPage invitationId="invite" />);
  expect(await screen.findByText(/Expired/)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Accept invitation" })
  ).toBeNull();
});

it("preserves team selection and unsent form drafts when responsive content remounts", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      response(
        url.includes("teamId=")
          ? { ok: true, team }
          : {
              ok: true,
              enabled: true,
              teams: [{ id: team.id, name: team.name, role: "owner" }],
              invitations: [],
            }
      )
    )
  );
  const { rerender } = render(<TeamsView key="desktop" />);
  const user = userEvent.setup();
  await user.selectOptions(
    await screen.findByRole("combobox", { name: "Choose a team" }),
    "team"
  );
  await user.type(
    await screen.findByRole("textbox", { name: "Email address" }),
    "draft@example.invalid"
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: /^Role$/ }),
    "viewer"
  );
  await user.clear(screen.getAllByRole("textbox", { name: "Team name" })[0]);
  await user.type(
    screen.getAllByRole("textbox", { name: "Team name" })[0],
    "Unsent rename"
  );
  rerender(<TeamsView key="mobile" />);
  expect(
    (
      screen.getByRole("combobox", {
        name: "Choose a team",
      }) as HTMLSelectElement
    ).value
  ).toBe("team");
  expect(
    (screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement)
      .value
  ).toBe("draft@example.invalid");
  expect(
    (
      screen.getByRole("combobox", {
        name: /^Role$/,
      }) as HTMLSelectElement
    ).value
  ).toBe("viewer");
  expect(
    (
      screen.getAllByRole("textbox", {
        name: "Team name",
      })[0] as HTMLInputElement
    ).value
  ).toBe("Unsent rename");
});
