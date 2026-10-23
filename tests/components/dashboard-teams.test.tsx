// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, it, expect, vi } from "vitest";
import TeamsManager from "@/components/dashboard/TeamsManager";
const responsive = vi.hoisted(() => ({ mobile: false }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => responsive.mobile }));
vi.mock("@/components/teams/TeamSuccession", () => ({
  TeamSuccession: () => null,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  responsive.mobile = false;
});
function mockFetch() {
  const fetcher = vi.fn(
    async (url: unknown, options?: RequestInit) =>
      new Response(
        JSON.stringify(
          options?.method === "POST"
            ? { ok: true }
            : String(url).includes("teamId=")
              ? {
                  members: [
                    {
                      id: "owner",
                      name: "Old Owner",
                      role: "owner",
                      canOwn: false,
                    },
                    {
                      id: "editor",
                      name: "Alex Pilot",
                      role: "editor",
                      canOwn: true,
                    },
                    {
                      id: "viewer",
                      name: "Robin Pilot",
                      role: "viewer",
                      canOwn: false,
                    },
                  ],
                }
              : {
                  teams: [
                    {
                      id: "team",
                      name: "Practice collective",
                      ownerId: "owner",
                      ownerName: "Old Owner",
                      state: "open",
                      memberCount: 3,
                      projectCount: 8,
                      deadline: "2026-11-21",
                    },
                  ],
                  next: null,
                }
        )
      )
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
it("opens team details from another cell in the row and requires explicit owner correction", async () => {
  const user = userEvent.setup(),
    fetcher = mockFetch();
  render(<TeamsManager />);
  await user.click(await screen.findByRole("cell", { name: "Old Owner" }));
  await screen.findByText("Alex Pilot");
  await user.click(screen.getByRole("button", { name: "Change owner" }));
  const confirmation = screen.getByRole("alertdialog");
  expect(
    within(confirmation)
      .getByRole("button", { name: "Change owner" })
      .hasAttribute("disabled")
  ).toBe(true);
  await user.click(within(confirmation).getByRole("combobox"));
  expect(screen.queryByRole("option", { name: "Robin Pilot" })).toBeNull();
  await user.click(screen.getByRole("option", { name: "Alex Pilot" }));
  await user.type(
    within(confirmation).getByRole("textbox", { name: "Reason (required)" }),
    "Reviewed support request"
  );
  expect(
    fetcher.mock.calls.filter((c) => c[1]?.method === "POST")
  ).toHaveLength(0);
  await user.click(
    within(confirmation).getByRole("button", { name: "Change owner" })
  );
  const posts = fetcher.mock.calls.filter((c) => c[1]?.method === "POST");
  expect(posts).toHaveLength(1);
  expect(JSON.parse(posts[0][1]!.body as string)).toEqual({
    teamId: "team",
    ownerId: "owner",
    targetId: "editor",
    reason: "Reviewed support request",
  });
});
it("uses a bottom drawer for mobile team details", async () => {
  responsive.mobile = true;
  mockFetch();
  const user = userEvent.setup();
  render(<TeamsManager />);
  await user.click(
    await screen.findByRole("button", { name: "Practice collective" })
  );
  await screen.findByText("Alex Pilot");
  expect(document.querySelector('[data-slot="drawer-content"]')).toBeTruthy();
  expect(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Close" })
  ).toBeTruthy();
});
