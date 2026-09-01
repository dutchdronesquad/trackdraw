// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import AuditDateRangeFilter from "@/components/dashboard/AuditDateRangeFilter";

describe("AuditDateRangeFilter", () => {
  afterEach(cleanup);

  it("keeps both GET form values in sync when a range is cleared", async () => {
    const user = userEvent.setup();
    function ControlledRange() {
      const [range, setRange] = React.useState({
        from: "2026-09-01",
        to: "2026-09-30",
      });
      return (
        <form>
          <AuditDateRangeFilter
            id="date-range"
            from={range.from}
            to={range.to}
            label="Date range"
            placeholder="Choose dates"
            clearLabel="Clear dates"
            applyLabel="Apply range"
            locale="en-US"
            onChange={(from, to) => setRange({ from, to })}
          />
          <input type="hidden" name="from" value={range.from} />
          <input type="hidden" name="to" value={range.to} />
        </form>
      );
    }
    const { container } = render(<ControlledRange />);

    const fromValue =
      container.querySelector<HTMLInputElement>('input[name="from"]');
    const toValue =
      container.querySelector<HTMLInputElement>('input[name="to"]');
    expect(fromValue?.value).toBe("2026-09-01");
    expect(toValue?.value).toBe("2026-09-30");

    await user.click(
      screen.getByRole("button", {
        name: "Date range: Sep 1, 2026 – Sep 30, 2026",
      })
    );
    expect(screen.getAllByRole("gridcell").length).toBeGreaterThanOrEqual(35);
    await user.click(screen.getByRole("button", { name: "Clear dates" }));

    expect(fromValue?.value).toBe("");
    expect(toValue?.value).toBe("");
    expect(
      screen.getByRole("button", { name: "Date range: Choose dates" })
    ).toBeTruthy();
  });
});
