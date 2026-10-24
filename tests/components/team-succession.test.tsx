// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, it, expect, vi } from "vitest";
import { TeamSuccession } from "@/components/teams/TeamSuccession";
import type { SuccessionCase } from "@/lib/team-succession";
const base: SuccessionCase = {
  id: "case",
  teamId: "team",
  teamName: "Club",
  state: "recovery",
  removalAt: "2026-11-01",
  purgeAt: "2027-01-30",
  canApply: true,
  viewerId: "editor",
  applications: [],
  memberCount: 2,
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows read-only consequences and requires explicit confirmation before requesting ownership", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn(
    async (_url: unknown, options?: RequestInit) =>
      new Response(
        JSON.stringify(
          options?.method === "POST"
            ? { ok: true }
            : { ok: true, cases: [base] }
        ),
        { status: 200 }
      )
  );
  vi.stubGlobal("fetch", fetcher);
  render(<TeamSuccession teamId="team" />);
  await user.click(
    await screen.findByRole("button", { name: "Request ownership" })
  );
  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByText(/accept responsibility/)).toBeTruthy();
  expect(
    fetcher.mock.calls.filter((c) => c[1]?.method === "POST")
  ).toHaveLength(0);
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(
    fetcher.mock.calls.filter((c) => c[1]?.method === "POST")
  ).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Request ownership" }));
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Request ownership",
    })
  );
  expect(
    fetcher.mock.calls.filter((c) => c[1]?.method === "POST")
  ).toHaveLength(1);
  expect(screen.getByText(/Projects are read-only/)).toBeTruthy();
});
it("shows the waiting period without member voting or administrator approval", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            cases: [
              {
                ...base,
                canApply: false,
                applications: [
                  {
                    id: "app",
                    userId: "editor",
                    name: "Pilot",
                    requestedAt: "2026-10-22",
                    responseAt: null,
                    withdrawnAt: null,
                    eligible: true,
                  },
                ],
              },
            ],
          })
        )
    )
  );
  render(<TeamSuccession admin teamId="team" />);
  expect(await screen.findByText("Pilot requested ownership")).toBeTruthy();
  expect(
    screen.getByText(/30-day waiting period starts after notices/)
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: /Approve|Agree|objection/ })
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Request ownership" })
  ).toBeNull();
});
it("closes review actions after the recovery deadline while explaining a pending notice hold", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            cases: [{ ...base, purgeAt: "2020-01-01", canApply: false }],
          })
        )
    )
  );
  render(<TeamSuccession teamId="team" />);
  expect(
    await screen.findByText(/new requests and ownership changes are closed/)
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Request ownership" })
  ).toBeNull();
});
it("groups pending delivery by event and reveals an uncertain reference only on request", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          ok: true,
          cases: [
            {
              ...base,
              notices: [
                {
                  id: "pending",
                  event: "risk",
                  sentAt: null,
                  uncertain: 0,
                  recipient: "editor@example.invalid",
                  deliveryKey: "pending-provider-reference",
                },
                {
                  id: "uncertain",
                  event: "application",
                  sentAt: null,
                  uncertain: 1,
                  recipient: "owner@example.invalid",
                  deliveryKey: "uncertain-provider-reference",
                },
              ],
            },
          ],
        })
      )
  );
  vi.stubGlobal("fetch", fetcher);
  render(<TeamSuccession admin teamId="team" />);
  await user.click(
    await screen.findByRole("button", { name: "Notice delivery 2 pending" })
  );
  expect(
    screen.getByRole("heading", { name: "Ownership warning" })
  ).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Ownership request" })
  ).toBeTruthy();
  expect(screen.getByText("Pending", { exact: true })).toBeTruthy();
  expect(screen.getByText("Check delivery", { exact: true })).toBeTruthy();
  expect(screen.queryByText("pending-provider-reference")).toBeNull();
  expect(screen.queryByText("uncertain-provider-reference")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Delivery reference" }));
  expect(screen.getByText("uncertain-provider-reference")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Confirm provider delivery" })
  ).toBeTruthy();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
