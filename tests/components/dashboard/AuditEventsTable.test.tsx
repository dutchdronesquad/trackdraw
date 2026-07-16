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

  it("paginates audit events after sorting", async () => {
    const user = userEvent.setup();
    const events = Array.from({ length: 12 }, (_, index) =>
      createEvent(index + 1)
    );

    render(<DashboardAuditEventsTable events={events} />);

    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(screen.queryByText("System Event 2")).toBeNull();
    expect(screen.getByText("12")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByText("System Event 2")).toBeTruthy();
  });

  it("counts actor facet options in the filtered row set", async () => {
    const user = userEvent.setup();
    const moderatorEvent = {
      ...createEvent(3),
      actorUserId: "moderator-1",
      actor: {
        id: "moderator-1",
        name: "Moderator",
        email: "moderator@trackdraw.local",
      },
    };

    render(
      <DashboardAuditEventsTable
        events={[createEvent(1), createEvent(2), moderatorEvent]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Actor" }));

    expect(
      screen.getByRole("button", {
        name: "Admin (admin@trackdraw.local) 2",
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Moderator (moderator@trackdraw.local) 1",
      })
    ).toBeTruthy();
  });
});
