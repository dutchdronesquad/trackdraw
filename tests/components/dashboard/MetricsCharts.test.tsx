// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { UserGrowthCard } from "@/components/dashboard/MetricsCharts";
import type { GrowthByRange } from "@/lib/server/metrics";

const growthData = {
  bucket: "month" as const,
  from: "2026-04-01",
  to: "2026-07-09",
  userGrowth: [{ period: "2026-07-01", label: "Jul 2026", users: 2 }],
  userGrowthCumulative: [
    { period: "2026-07-01", label: "Jul 2026", users: 12 },
  ],
};

const growthByRange: GrowthByRange = {
  "3m": growthData,
  "6m": growthData,
  "12m": growthData,
  ytd: growthData,
  previousYear: growthData,
};

describe("UserGrowthCard", () => {
  afterEach(cleanup);

  it("opens the desktop range popover from its custom trigger", async () => {
    const user = userEvent.setup();
    render(
      <UserGrowthCard
        growthByRange={growthByRange}
        growthTimeline={{
          dailyGrowth: [{ date: "2026-07-01", users: 2 }],
          totalUsers: 12,
          today: "2026-07-09",
        }}
      />
    );

    const desktopTrigger = screen
      .getAllByRole("button", { name: "Range Last 3 months" })
      .find((button) => button.getAttribute("aria-haspopup") === "dialog");

    expect(desktopTrigger).toBeTruthy();
    expect(desktopTrigger?.className).toContain("hover:bg-muted");
    expect(desktopTrigger?.className).not.toContain("hover:bg-accent");

    await user.click(desktopTrigger!);

    expect(screen.getByText("Presets")).toBeTruthy();
    expect(desktopTrigger?.getAttribute("aria-expanded")).toBe("true");
  });
});
