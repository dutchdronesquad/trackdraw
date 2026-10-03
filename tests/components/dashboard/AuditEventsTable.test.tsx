// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { DashboardAuditEvent } from "@/app/dashboard/audit/columns";
import DashboardAuditEventsTable from "@/components/dashboard/tables/AuditEventsTable";

function createEvent(index: number): DashboardAuditEvent {
  return {
    id: `event-${index}`,
    actorUserId: "admin-1",
    targetUserId: null,
    eventType: `system.event.${index}`,
    entityType: "system",
    entityId: null,
    metadata: null,
    createdAt: `2026-07-${String(index).padStart(2, "0")}T10:00:00.000Z`,
    actorKind: "user",
    actorLabel: null,
    targetLabel: null,
    actor: {
      id: "admin-1",
      name: "Admin",
      email: "admin@trackdraw.local",
    },
    target: null,
  };
}

describe("DashboardAuditEventsTable", () => {
  afterEach(cleanup);

  it("opens the complete lifecycle history using its reference after account deletion", async () => {
    const user = userEvent.setup();
    const reference = "random-account-reference";
    render(
      <DashboardAuditEventsTable
        events={[
          {
            ...createEvent(1),
            eventType: "account.deleted",
            entityType: "account_lifecycle",
            entityId: reference,
            actorUserId: null,
            actorKind: "system",
            actor: null,
            targetLabel: `Deleted account (${reference})`,
            metadata: { initiatedBy: "inactivity" },
          },
        ]}
        total={1}
        page={1}
        pageCount={1}
        previousHref={null}
        nextHref={null}
      />
    );
    await user.click(
      screen.getByRole("button", { name: "Inspect Account deleted" })
    );
    expect(
      screen
        .getByRole("link", {
          name: "View account warning and deletion history",
        })
        .getAttribute("href")
    ).toBe(`/dashboard/audit?q=${reference}&range=all`);
    expect(screen.getByText("inactivity")).toBeTruthy();
  });

  it("renders server pagination and opens event details", async () => {
    const user = userEvent.setup();
    const events = [
      {
        ...createEvent(1),
        metadata: { operation: "maintenance" },
      },
    ];

    render(
      <DashboardAuditEventsTable
        events={events}
        total={26}
        page={1}
        pageCount={2}
        previousHref={null}
        nextHref="/dashboard/audit?page=2"
      />
    );

    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(screen.getByText(/26 events/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Next" }).getAttribute("href")
    ).toBe("/dashboard/audit?page=2");

    await user.click(
      screen.getByRole("button", { name: "Inspect System Event 1" })
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Event ID")).toBeTruthy();
    expect(screen.getAllByText("Operation").length).toBeGreaterThan(0);
    expect(screen.getByText("maintenance")).toBeTruthy();
  });

  it("shows the recorded label for an actor whose account no longer exists", async () => {
    const user = userEvent.setup();
    const deletedAccountEvent = {
      ...createEvent(3),
      actorUserId: null,
      actor: null,
      actorLabel: "former@trackdraw.local",
    };

    render(
      <DashboardAuditEventsTable
        events={[deletedAccountEvent]}
        total={1}
        page={1}
        pageCount={1}
        previousHref={null}
        nextHref={null}
      />
    );

    expect(screen.getByText("former@trackdraw.local")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Inspect System Event 3" })
    );

    expect(
      screen.getAllByText("former@trackdraw.local").length
    ).toBeGreaterThan(1);
  });

  it("keeps copy actions safe when the Clipboard API is unavailable", async () => {
    const user = userEvent.setup();
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "clipboard"
    );

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    render(
      <DashboardAuditEventsTable
        events={[createEvent(4)]}
        total={1}
        page={1}
        pageCount={1}
        previousHref={null}
        nextHref={null}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Inspect System Event 4" })
    );

    const copyEventId = screen.getByRole("button", {
      name: /copy event id/i,
    });
    await expect(user.click(copyEventId)).resolves.toBeUndefined();

    if (clipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("shows before and after values for recorded changes", async () => {
    const user = userEvent.setup();
    render(
      <DashboardAuditEventsTable
        events={[
          {
            ...createEvent(5),
            eventType: "account.role.changed",
            metadata: {
              previousRole: "user",
              nextRole: "moderator",
              reason: "promotion",
            },
          },
        ]}
        total={1}
        page={1}
        pageCount={1}
        previousHref={null}
        nextHref={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Inspect / }));

    expect(screen.getByText("What changed")).toBeTruthy();
    expect(screen.getByText("Role")).toBeTruthy();
    expect(screen.getByText("user")).toBeTruthy();
    expect(screen.getByText("moderator")).toBeTruthy();
    expect(screen.getByText("promotion")).toBeTruthy();
  });
});
