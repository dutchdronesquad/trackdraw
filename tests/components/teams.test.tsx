// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render as renderComponent,
  screen,
  waitFor,
  within,
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
const toastSuccess = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));
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
  toastSuccess.mockClear();
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
  await user.click(await screen.findByRole("button", { name: "Create team" }));
  await user.type(
    await screen.findByRole("textbox", { name: "Team name" }),
    "Race team"
  );
  await user.click(screen.getByRole("button", { name: "Create team" }));
  expect(await screen.findByRole("heading", { name: "Members" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Invite member" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Email address" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Leave team" })).toBeNull();
});
it("requires confirmation to remove a member and does not offer owner promotion", async () => {
  const action = vi.fn();
  render(<TeamManagement team={team} busy={false} onCommand={action} />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("combobox", { name: "Role for pilot@example.invalid" })
  );
  expect(
    screen.getAllByRole("option").map((option) => option.textContent)
  ).not.toContain("Owner");
  await user.click(screen.getByRole("option", { name: "Viewer" }));
  expect(action).toHaveBeenCalledWith({
    action: "role",
    teamId: "team",
    userId: "pilot",
    role: "viewer",
  });
  action.mockClear();
  await user.click(
    screen.getByRole("button", { name: "Actions for pilot@example.invalid" })
  );
  await user.click(await screen.findByRole("menuitem", { name: "Remove" }));
  expect(action).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Confirm removal" }));
  expect(action).toHaveBeenCalledWith({
    action: "remove",
    teamId: "team",
    userId: "pilot",
  });
});
it("offers a member only their own role and a confirmed leave action", async () => {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return response({ ok: true, teamId: "team" });
    return response(
      url.includes("teamId=")
        ? { ok: true, team: { ...team, role: "viewer", members: [] } }
        : {
            ok: true,
            teams: [{ id: "team", name: "Race team", role: "viewer" }],
            invitations: [],
          }
    );
  });
  vi.stubGlobal("fetch", fetch);
  render(<TeamsView />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Race team/ }));
  expect(await screen.findByText("Your role: Viewer")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Invite member" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Team actions" }));
  await user.click(await screen.findByRole("menuitem", { name: "Leave team" }));
  expect(fetch.mock.calls.some((call) => call[1]?.method === "POST")).toBe(
    false
  );
  await user.click(screen.getByRole("button", { name: "Leave team" }));
  await waitFor(() =>
    expect(
      fetch.mock.calls.some(
        (call) =>
          call[1]?.body === JSON.stringify({ action: "leave", teamId: "team" })
      )
    ).toBe(true)
  );
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

it("keeps the directory lean and preserves the invitation screen and draft across responsive remounts", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      response(
        url.includes("teamId=")
          ? { ok: true, team }
          : {
              ok: true,
              teams: [{ id: team.id, name: team.name, role: "owner" }],
              invitations: [],
            }
      )
    )
  );
  const { rerender } = render(<TeamsView key="desktop" />);
  const user = userEvent.setup();
  await screen.findByRole("button", { name: /Race team/ });
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByText("owner@example.invalid")).toBeNull();
  await user.click(screen.getByRole("button", { name: /Race team/ }));
  await user.click(
    await screen.findByRole("button", { name: "Invite member" })
  );
  await user.type(
    await screen.findByRole("textbox", { name: "Email address" }),
    "draft@example.invalid"
  );
  await user.click(screen.getByRole("combobox", { name: /^Role$/ }));
  await user.click(screen.getByRole("option", { name: "Viewer" }));
  rerender(<TeamsView key="mobile" />);
  expect(
    (screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement)
      .value
  ).toBe("draft@example.invalid");
  expect(
    screen.getByRole("combobox", { name: /^Role$/ }).textContent
  ).toContain("Viewer");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(await screen.findByRole("heading", { name: "Members" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Team actions" }));
  await user.click(
    await screen.findByRole("menuitem", { name: "Rename team" })
  );
  const input = screen.getByRole("textbox", { name: "Team name" });
  await user.clear(input);
  await user.type(input, "Unsent rename");
  rerender(<TeamsView key="desktop-again" />);
  expect(
    (screen.getByRole("textbox", { name: "Team name" }) as HTMLInputElement)
      .value
  ).toBe("Unsent rename");
});
it("returns to the team after sending an invitation and exposes resend and revoke in its menu", async () => {
  const fetch = vi.fn(async (url: string, init?: RequestInit) =>
    response(
      init?.method === "POST"
        ? { ok: true, teamId: "team" }
        : url.includes("teamId=")
          ? {
              ok: true,
              team: {
                ...team,
                invitations: [{ ...invitation, email: "noor@example.invalid" }],
              },
            }
          : {
              ok: true,
              teams: [{ id: team.id, name: team.name, role: "owner" }],
              invitations: [],
            }
    )
  );
  vi.stubGlobal("fetch", fetch);
  render(<TeamsView />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Race team/ }));
  await user.click(
    await screen.findByRole("button", { name: "Invite member" })
  );
  await user.type(
    screen.getByRole("textbox", { name: "Email address" }),
    "noor@example.invalid"
  );
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  await waitFor(() =>
    expect(toastSuccess).toHaveBeenCalledWith("Changes saved.")
  );
  expect(screen.queryByRole("textbox", { name: "Email address" })).toBeNull();
  expect(
    fetch.mock.calls.some(
      (call) =>
        call[1]?.body ===
        JSON.stringify({
          action: "invite",
          teamId: "team",
          email: "noor@example.invalid",
          role: "editor",
        })
    )
  ).toBe(true);
  await user.click(
    screen.getByRole("button", {
      name: "Invitation actions for noor@example.invalid",
    })
  );
  expect(
    await screen.findByRole("menuitem", { name: "Send new invitation" })
  ).toBeTruthy();
  expect(screen.getByRole("menuitem", { name: "Revoke" })).toBeTruthy();
});
it("keeps the form draft and offers retry after an invitation delivery failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? response({ ok: false, code: "delivery" }, 502)
        : response(
            url.includes("teamId=")
              ? { ok: true, team }
              : {
                  ok: true,
                  teams: [{ id: team.id, name: team.name, role: "owner" }],
                  invitations: [],
                }
          )
    )
  );
  render(<TeamsView />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Race team/ }));
  await user.click(
    await screen.findByRole("button", { name: "Invite member" })
  );
  await user.type(
    screen.getByRole("textbox", { name: "Email address" }),
    "draft@example.invalid"
  );
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    (screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement)
      .value
  ).toBe("draft@example.invalid");
  expect(screen.getByRole("button", { name: "Send invitation" })).toBeTruthy();
});

it("reviews team deletion impact and requires the exact team name", async () => {
  const impact = {
    projects: 3,
    members: 2,
    invitations: 1,
    shares: 2,
    galleryEntries: 1,
    editingSessions: 1,
  };
  let deleted = false;
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      expect(JSON.parse(String(init.body))).toEqual({
        action: "delete",
        teamId: "team",
        confirmation: "Race team",
        impact,
      });
      deleted = true;
      return response({ ok: true, teamId: "team" });
    }
    return response(
      url.includes("teamId=")
        ? { ok: true, team: { ...team, deletionImpact: impact } }
        : {
            ok: true,
            teams: deleted
              ? []
              : [{ id: "team", name: "Race team", role: "owner" }],
            invitations: [],
          }
    );
  });
  vi.stubGlobal("fetch", fetch);
  render(<TeamsView />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Race team/ }));
  await user.click(await screen.findByRole("button", { name: "Team actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Delete team" }));
  expect(screen.getByText("Projects, including archived")).toBeTruthy();
  const remove = screen.getByRole("button", {
    name: "Delete team",
  }) as HTMLButtonElement;
  expect(remove.disabled).toBe(true);
  await user.type(
    screen.getByLabelText("Type “Race team” to confirm"),
    "Race team"
  );
  expect(remove.disabled).toBe(false);
  await user.click(remove);
  await waitFor(() => expect(deleted).toBe(true));
});

it("requires explicit confirmation before transferring ownership to an accepted member", async () => {
  const send = vi.fn();
  render(<TeamManagement team={team} busy={false} onCommand={send} />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Actions for pilot@example.invalid" })
  );
  await user.click(
    screen.getByRole("menuitem", { name: "Transfer ownership" })
  );
  expect(send).not.toHaveBeenCalled();
  const dialog = screen.getByRole("alertdialog", {
    name: "Transfer ownership",
  });
  await waitFor(() =>
    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: "Cancel" })
    )
  );
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(send).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Actions for pilot@example.invalid" })
  );
  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Transfer ownership", "Remove"]);
  await user.click(
    screen.getByRole("menuitem", { name: "Transfer ownership" })
  );
  await user.click(screen.getByRole("button", { name: "Transfer ownership" }));
  expect(send).toHaveBeenCalledWith({
    action: "transfer-owner",
    teamId: "team",
    userId: "pilot",
  });
});

it("uses a toast after changing a member role without adding a saved notice to the roster", async () => {
  const fetch = vi.fn(async (url: string, init?: RequestInit) =>
    response(
      init?.method === "POST"
        ? { ok: true, teamId: "team" }
        : url.includes("teamId=")
          ? { ok: true, team }
          : {
              ok: true,
              teams: [{ id: team.id, name: team.name, role: "owner" }],
              invitations: [],
            }
    )
  );
  vi.stubGlobal("fetch", fetch);
  render(<TeamsView />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Race team/ }));
  await user.click(
    screen.getByRole("combobox", { name: "Role for pilot@example.invalid" })
  );
  await user.click(screen.getByRole("option", { name: "Viewer" }));
  await waitFor(() =>
    expect(toastSuccess).toHaveBeenCalledWith("Role updated")
  );
  expect(screen.queryByText("Changes saved.")).toBeNull();
});
