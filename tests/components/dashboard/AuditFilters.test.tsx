// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuditFilters from "@/components/dashboard/AuditFilters";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const allOption = [{ value: "__all__", label: "All" }];
const categoryOptions = [
  { value: "__all__", label: "All categories" },
  { value: "Account", label: "Account" },
  { value: "Gallery", label: "Gallery" },
];
const eventOptions = [
  { value: "__all__", label: "All events" },
  {
    value: "account.banned",
    label: "Account banned",
    category: "Account",
  },
  {
    value: "gallery.entry.hidden",
    label: "Gallery entry hidden",
    category: "Gallery",
  },
];

function renderFilters(range = "30d") {
  return render(
    <AuditFilters
      values={{
        range,
        category: "__all__",
        event: "__all__",
        actor: "__all__",
        target: "__all__",
      }}
      labels={{
        title: "Filters",
        search: "Search",
        searchPlaceholder: "Search events",
        range: "Period",
        category: "Category",
        event: "Event",
        actor: "Actor",
        target: "Target",
        dateRange: "Date range",
        chooseDates: "Choose dates",
        clearDates: "Clear dates",
        applyDateRange: "Apply range",
        clearAll: "Clear all",
        moreFilters: "More filters",
        filterDetails: "Activity and people",
        searchOptions: "Search options",
        noOptions: "No matching options",
        removeFilter: "Remove filter",
      }}
      rangeOptions={[
        { value: "30d", label: "Last 30 days" },
        { value: "custom", label: "Custom dates" },
      ]}
      categoryOptions={categoryOptions}
      eventOptions={eventOptions}
      actorOptions={allOption}
      targetOptions={allOption}
      activeFilters={[]}
      locale="en-US"
    />
  );
}

describe("AuditFilters", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
  });

  it("only reveals the date range for a custom period", async () => {
    const user = userEvent.setup();
    renderFilters();

    expect(screen.queryByText("Date range")).toBeNull();
    await user.click(screen.getByRole("combobox", { name: "Period" }));
    await user.click(screen.getByRole("option", { name: "Custom dates" }));

    expect(screen.getByText("Date range")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Date range: Choose dates" })
    ).toBeTruthy();
  });

  it("applies search changes after a short delay", async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.type(screen.getByRole("searchbox", { name: "Search" }), "role");
    expect(pushMock).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard/audit?q=role");
    });
  });

  it("clears an incompatible event when its category changes", async () => {
    const user = userEvent.setup();
    const { container } = renderFilters();

    await user.click(screen.getByRole("combobox", { name: "Category" }));
    await user.click(screen.getByRole("option", { name: "Gallery" }));
    await user.click(screen.getByRole("combobox", { name: "Event" }));
    await user.click(
      screen.getByRole("option", { name: "Gallery entry hidden" })
    );
    expect(
      container.querySelector<HTMLInputElement>('input[name="event"]')?.value
    ).toBe("gallery.entry.hidden");

    await user.click(screen.getByRole("combobox", { name: "Category" }));
    await user.click(screen.getByRole("option", { name: "Account" }));
    expect(
      container.querySelector<HTMLInputElement>('input[name="event"]')?.value
    ).toBe("__all__");
  });

  it("applies selection changes immediately", async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.click(screen.getByRole("combobox", { name: "Period" }));
    await user.click(screen.getByRole("option", { name: "Custom dates" }));
    expect(pushMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("combobox", { name: "Category" }));
    await user.click(screen.getByRole("option", { name: "Gallery" }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard/audit?category=Gallery");
  });

  it("keeps a newer selection when the search debounce finishes", async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.type(screen.getByRole("searchbox", { name: "Search" }), "role");
    await user.click(screen.getByRole("combobox", { name: "Category" }));
    await user.click(screen.getByRole("option", { name: "Gallery" }));

    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenLastCalledWith(
        "/dashboard/audit?q=role&category=Gallery"
      );
    });
    expect(pushMock).not.toHaveBeenCalledWith("/dashboard/audit?q=role");
  });
});
