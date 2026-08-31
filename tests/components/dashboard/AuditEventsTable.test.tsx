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
        actorCount={3}
        targetCount={2}
        page={1}
        pageCount={2}
        previousHref={null}
        nextHref="/dashboard/audit?page=2"
      />
    );

    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(screen.getByText("26")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Next" }).getAttribute("href")
    ).toBe("/dashboard/audit?page=2");

    await user.click(
      screen.getByRole("row", { name: "Inspect System Event 1" })
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
        actorCount={0}
        targetCount={0}
        page={1}
        pageCount={1}
        previousHref={null}
        nextHref={null}
      />
    );

    expect(screen.getByText("former@trackdraw.local")).toBeTruthy();
    await user.click(
      screen.getByRole("row", { name: "Inspect System Event 3" })
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
        actorCount={1}
        targetCount={0}
        page={1}
        pageCount={1}
        previousHref={null}
        nextHref={null}
      />
    );

    await user.click(
      screen.getByRole("row", { name: "Inspect System Event 4" })
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
});
