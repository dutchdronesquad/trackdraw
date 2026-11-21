// @vitest-environment happy-dom
import {
  fireEvent,
  render,
  screen,
  within,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YearInNumbersView } from "@/components/dashboard/YearInNumbersView";
import { getYearInNumbers } from "@/lib/year-in-numbers";
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(cleanup);
const report = () =>
  getYearInNumbers(
    2026,
    [
      {
        day_utc: "2026-08-16",
        metric: "elements",
        total: 123,
        contributors: 5,
        source: "product-events-v1",
        updated_at: "2026-08-17T00:00:00.000Z",
      },
      {
        day_utc: "2026-08-16",
        metric: "sessions",
        total: 10,
        contributors: 5,
        source: "product-events-v1",
        updated_at: "2026-08-17T00:00:00.000Z",
      },
    ],
    new Date("2026-11-21T13:00:00Z")
  );
describe("Year in numbers", () => {
  it("shows six chosen metrics, underlying coverage and no copy action", () => {
    render(<YearInNumbersView report={report()} currentYear={2026} />);
    expect(
      within(
        screen.getByRole("region", { name: "Element placements" })
      ).getByText("123")
    ).toBeTruthy();
    expect(
      within(
        screen.getByRole("region", { name: "Active design sessions" })
      ).getByText("10")
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "New accounts" })).getByText(
        "—"
      )
    ).toBeTruthy();
    expect(screen.queryByText("Gate placements")).toBeNull();
    expect(screen.queryByText("Design imports")).toBeNull();
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
    expect(
      screen.getAllByText(/1 of 324 reporting days aggregated/)
    ).toHaveLength(2);
  });
  it("opens a read-only recap with only reportable figures and their measurement limitations", () => {
    render(<YearInNumbersView report={report()} currentYear={2026} />);
    fireEvent.click(screen.getByRole("button", { name: "View recap" }));
    const recap = screen.getByRole("dialog");
    expect(within(recap).getByText("123")).toBeTruthy();
    expect(within(recap).getByText("10")).toBeTruthy();
    expect(within(recap).queryByText("New accounts")).toBeNull();
    expect(
      within(recap).getByText(/Partial figures cover the measured interval/)
    ).toBeTruthy();
  });
  it("navigates to the selected year and opens the empty recap without inventing zeros", () => {
    render(
      <YearInNumbersView
        report={getYearInNumbers(2026, [], new Date("2027-01-01"))}
        currentYear={2027}
      />
    );
    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "2027" },
    });
    expect(push).toHaveBeenCalledWith(
      "/dashboard/metrics/year-in-numbers?year=2027"
    );
    fireEvent.click(screen.getByRole("button", { name: "View recap" }));
    expect(
      within(screen.getByRole("dialog")).getByText(
        "No reportable figures are available for this year."
      )
    ).toBeTruthy();
  });
});
