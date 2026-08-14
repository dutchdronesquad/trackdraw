// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  ActivationFunnel,
  EmbedReachTable,
  GrowthTabs,
  PlanLimitSimulator,
  UsageTabs,
  UserGrowthCard,
} from "@/components/dashboard/MetricsCharts";
import type { GrowthByRange, ProductInsights } from "@/lib/server/metrics";

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
    const { container } = render(
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
    expect(container.querySelectorAll("[data-chart]")).toHaveLength(1);

    await user.click(desktopTrigger!);

    expect(screen.getByText("Presets")).toBeTruthy();
    expect(desktopTrigger?.getAttribute("aria-expanded")).toBe("true");
  });
});

const usage = {
  totalEvents30d: 20,
  eventTypes30d: [{ eventType: "editor.session_started", count: 10 }],
  eventTypesPrevious30d: [],
  trackingStartedAt: "2026-07-01T00:00:00.000Z",
  trackingDays: 30,
  anonymousSessions30d: 4,
  accountSessions30d: 6,
  shareViews30d: 12,
  exports30d: 5,
  preview3dOpens30d: 3,
  imports30d: 1,
  elementPlacements30d: 8,
  apiKeysUsed30d: 0,
  exportFormats30d: [{ format: "png", count: 5 }],
  elementTypes30d: [{ kind: "gate", count: 8 }],
  shareSurfaces30d: [
    { surface: "share", count: 5 },
    { surface: "embed", count: 7 },
  ],
  embedReferrers30d: [
    {
      shareToken: "race-layout",
      shareTitle: "Race day layout",
      hostname: "events.example.org",
      views: 7,
      previousViews: 4,
      lastSeen: "2026-07-20",
    },
  ],
  embedReferrerSummary30d: {
    hostnames: 2,
    views: 10,
    rows: 2,
  },
  importedShapes30d: 4,
  avgShapesPerImport30d: 4,
} satisfies ProductInsights["usage"];

describe("metrics decision views", () => {
  afterEach(cleanup);

  it("shows step and overall conversion in the account journey", () => {
    render(
      <ActivationFunnel
        activation={{
          registered: 100,
          createdProject: 50,
          createdShare: 20,
          publishedToGallery: 5,
        }}
      />
    );

    expect(screen.getByText("50% from previous · 50% overall")).toBeTruthy();
    expect(screen.getByText("40% from previous · 20% overall")).toBeTruthy();
    expect(screen.getAllByRole("progressbar")).toHaveLength(4);
  });

  it("keeps usage compact behind keyboard-accessible tabs", async () => {
    const user = userEvent.setup();
    render(<UsageTabs usage={usage} />);

    expect(
      screen.getByRole("tab", { name: "Editor" }).getAttribute("aria-selected")
    ).toBe("true");
    await user.click(screen.getByRole("tab", { name: "Sharing" }));
    expect(screen.getByText("Viewing sessions")).toBeTruthy();
    expect(screen.getByText("events.example.org")).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Detected embed websites" })
    ).toBeTruthy();
  });

  it("keeps user and content growth in one switchable panel", async () => {
    const user = userEvent.setup();
    render(
      <GrowthTabs
        growthByRange={growthByRange}
        growthTimeline={{
          dailyGrowth: [{ date: "2026-07-01", users: 2 }],
          totalUsers: 12,
          today: "2026-07-09",
        }}
        contentGrowth={[
          { period: "2026-07", projects: 3, shares: 2, presets: 1 },
        ]}
      />
    );

    expect(screen.getByRole("tab", { name: "Users" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Content" }));
    expect(screen.getByText("Content growth")).toBeTruthy();
  });

  it("presents thresholded embed reach as a labelled data table", () => {
    render(<EmbedReachTable usage={usage} />);

    expect(screen.getByRole("columnheader", { name: "Website" })).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Last seen" })
    ).toBeTruthy();
    expect(screen.getByText("events.example.org")).toBeTruthy();
    expect(screen.getByText("Up 75%")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("70%")).toBeTruthy();
    expect(
      screen.getByText(
        "Showing the top 1 of 2 qualifying track and website combinations."
      )
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Race day layout" }).getAttribute("href")
    ).toBe("/share/race-layout");
  });

  it("labels both controls in every plan-limit simulator", () => {
    render(
      <PlanLimitSimulator
        userDistribution={[
          [1, 2, 3],
          [6, 7, 8],
        ]}
      />
    );

    expect(
      screen.getByRole("slider", { name: "Projects free-plan limit slider" })
    ).toBeTruthy();
    expect(
      screen.getByRole("spinbutton", {
        name: "Projects free-plan limit value",
      })
    ).toBeTruthy();
  });
});
