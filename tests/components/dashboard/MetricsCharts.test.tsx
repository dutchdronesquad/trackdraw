// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ActivationFunnel,
  EditorUsageBreakdown,
  EmbedReachTable,
  ExportUsageBreakdown,
  GrowthTabs,
  PlanLimitSimulator,
  UsageTabs,
  UserGrowthCard,
} from "@/components/dashboard/MetricsCharts";
import MetricsWorkspace from "@/components/dashboard/MetricsWorkspace";
import type { MetricsExplorerData } from "@/lib/metrics-explorer";
import type {
  AdminMetrics,
  GrowthByRange,
  ProductInsights,
} from "@/lib/server/metrics";
import type { DailyCockpitData } from "@/lib/server/dashboard-cockpit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {} }),
}));

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

    const rangeTriggers = screen.getAllByRole("button", {
      name: "Range Last 3 months",
    });
    const dialogTriggers = rangeTriggers.filter(
      (button) => button.getAttribute("aria-haspopup") === "dialog"
    );
    const desktopTrigger = dialogTriggers.at(-1);

    expect(desktopTrigger).toBeTruthy();
    expect(dialogTriggers).toHaveLength(2);
    expect(desktopTrigger?.className).toContain("hover:bg-muted");
    expect(desktopTrigger?.className).not.toContain("hover:bg-accent");
    expect(container.querySelectorAll("[data-chart]")).toHaveLength(1);

    await user.click(desktopTrigger!);

    expect(screen.getByText("Presets")).toBeTruthy();
    expect(desktopTrigger?.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen
        .getAllByRole("button", { name: "Last 3 months" })
        .some((button) => button.getAttribute("aria-pressed") === "true")
    ).toBe(true);
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
  creatorFunnel30d: {
    anonymous: { started: 4, edited: 3, valuable: 1 },
    account: { started: 6, edited: 5, valuable: 3 },
  },
  accountCreatorSegments30d: {
    newCreators: 2,
    returningCreators: 3,
  },
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

  it("sorts export usage from highest to lowest", () => {
    const { container } = render(
      <ExportUsageBreakdown
        usage={{
          ...usage,
          exports30d: 10,
          exportFormats30d: [
            { format: "png", count: 2 },
            { format: "json", count: 7 },
            { format: "custom", count: 1 },
          ],
        }}
      />
    );

    expect(
      Array.from(container.querySelectorAll(".text-foreground")).map(
        (row) => row.textContent
      )
    ).toEqual(["Project file (JSON)", "2D image (PNG)", "custom"]);
  });

  it("left-aligns creator-funnel journey steps", () => {
    render(<EditorUsageBreakdown usage={usage} />);

    const stepHeader = screen.getByRole("columnheader", {
      name: "Journey step",
    });
    expect(stepHeader.className).toContain("text-left");
    expect(stepHeader.closest("table")?.className).toContain("table-fixed");

    for (const name of [
      "Editor started",
      "Meaningful edit",
      "Valuable outcome",
    ]) {
      expect(screen.getByRole("rowheader", { name }).className).toContain(
        "text-left"
      );
    }
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
        activeCreators={2}
        userDistribution={[
          [1, 2, 3],
          [6, 7, 8],
          [25, 1, 1],
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
    const projectLimit = screen.getByRole("spinbutton", {
      name: "Projects free-plan limit value",
    });
    expect(projectLimit.getAttribute("max")).toBe("20");
    expect(projectLimit.className).toContain("h-11");
    expect(
      screen.getByRole("slider", { name: "Projects free-plan limit slider" })
        .className
    ).toContain("h-11");
    fireEvent.change(projectLimit, { target: { value: "999" } });
    expect((projectLimit as HTMLInputElement).value).toBe("5");
    expect(screen.getAllByText("21+")).toHaveLength(3);
    expect(screen.getByText("Free-plan impact")).toBeTruthy();
    expect(screen.getByText("Commercial signals")).toBeTruthy();
  });

  it("keeps cost and behavioral scenarios labelled as assumptions", async () => {
    const user = userEvent.setup();
    render(
      <PlanLimitSimulator
        activeCreators={10}
        userDistribution={[
          [4, 1, 1],
          [6, 1, 1],
        ]}
      />
    );

    expect(screen.getAllByText("Simulated").length).toBeGreaterThan(0);
    expect(screen.getByText("1 near limit")).toBeTruthy();
    expect(
      screen.getByText("100% of accounts with content · 1 near · 1 above")
    ).toBeTruthy();
    expect(screen.getAllByText("n/a").length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Monthly infrastructure cost").className
    ).toContain("h-11");

    await user.type(
      screen.getByLabelText("Monthly infrastructure cost"),
      "100"
    );
    await user.type(
      screen.getByLabelText("Source or evidence"),
      "July invoice"
    );

    expect(screen.getByText("Cost coverage estimate")).toBeTruthy();
    expect(screen.getByText("€10.00 per active creator")).toBeTruthy();
    expect(
      screen.getByText(
        "0.5 expected paid creators · €200.00 base cost per paid account"
      )
    ).toBeTruthy();
    expect(screen.getByText("€200.00")).toBeTruthy();
    const advanced = screen
      .getByText("Advanced assumptions")
      .closest("details");
    expect(advanced?.hasAttribute("open")).toBe(false);
    expect(
      screen.getByText(
        "Derived from July invoice and the observed 30-day active-creator count."
      )
    ).toBeTruthy();
    expect(screen.getByText("Conversion · unavailable")).toBeTruthy();
  });

  it("keeps existing growth and usage views inside the contract journey", async () => {
    const user = userEvent.setup();
    const metrics = {
      users: {
        total: 12,
        newThisWeek: 1,
        newThisMonth: 2,
        neverCreatedProject: 2,
        activeLastThirtyDays: 8,
      },
      projects: {
        total: 10,
        active: 8,
        archived: 2,
        avgPerUser: 1,
        maxPerUser: 3,
      },
      shares: {
        total: 5,
        expired: 1,
        revoked: 0,
        totalActive: 4,
        avgPerUser: 1,
        maxPerUser: 2,
      },
      presets: { total: 3, avgPerUser: 1, maxPerUser: 1 },
      gallery: {
        total: 2,
        listed: 1,
        featured: 1,
        hidden: 0,
        missingPreview: 0,
      },
      apiKeys: { active: 1, total: 1 },
      userDistribution: [],
    } satisfies AdminMetrics;
    const metricRow = {
      metric_id: "MTR-001" as const,
      day_utc: "2026-08-14",
      dimension: "",
      window_days: 7 as const,
      numerator: 8,
      denominator: null,
      sample_size: 10,
      completeness_state: "complete" as const,
      quality_status: "healthy" as const,
      updated_at: "2026-08-15T00:17:00.000Z",
    };
    const cockpit = {
      generatedAt: "2026-08-15T12:00:00.000Z",
      warning: null,
      operations: {
        missingGalleryPreviews: 0,
        exportFailures: 0,
        publicationFailures: 0,
        unusedApiKeys: 0,
        expiredApiKeys: 0,
        analyticsPipelineGaps: 0,
        buildingMetrics: 0,
        availability: { failures: true, pipeline: true },
      },
      headlines: [
        {
          id: "MTR-001",
          windowDays: 7,
          minimumVolume: 30,
          valueKind: "count",
          unfavorableDirection: "down",
          drilldown: "/dashboard/metrics#product-use",
          current: metricRow,
          live: null,
          previous: { ...metricRow, day_utc: "2026-08-07", numerator: 7 },
          comparisonReady: true,
          quality: "healthy",
          measuredSince: "2026-07-01",
        },
        ...(["MTR-004", "MTR-005", "MTR-006"] as const).map((id) => ({
          id,
          windowDays: id === "MTR-005" ? (30 as const) : (7 as const),
          minimumVolume: id === "MTR-005" ? 20 : 30,
          valueKind: "rate" as const,
          unfavorableDirection: "down" as const,
          drilldown: "/dashboard/metrics",
          current: {
            ...metricRow,
            metric_id: id,
            window_days: id === "MTR-005" ? (30 as const) : (7 as const),
            numerator: id === "MTR-004" ? 0 : 4,
            denominator: id === "MTR-004" ? 0 : 10,
          },
          live: null,
          previous: null,
          comparisonReady: false,
          quality: "building" as const,
          measuredSince: "2026-07-01",
        })),
      ],
    } satisfies DailyCockpitData;
    const emptyMetric = {
      id: "MTR-008" as const,
      windowDays: 28 as const,
      measuredSince: "2026-07-01",
      quality: "building" as const,
      rows: [],
    };
    const explorer = {
      generatedAt: "2026-08-15T12:00:00.000Z",
      acquisition: emptyMetric,
      adoption: {
        ...emptyMetric,
        id: "MTR-009",
        rows: [
          {
            dimension: "import",
            day: "2026-08-14",
            numerator: 2,
            denominator: 10,
            sampleSize: 10,
            value: 0.2,
            quality: "building",
            previousValue: null,
            comparisonReady: false,
          },
          {
            dimension: "preview_3d",
            day: "2026-08-14",
            numerator: 7,
            denominator: 10,
            sampleSize: 10,
            value: 0.7,
            quality: "building",
            previousValue: null,
            comparisonReady: false,
          },
        ],
      },
      retention: { ...emptyMetric, id: "MTR-005", windowDays: 30 },
    } satisfies MetricsExplorerData;

    const { container } = render(
      <MetricsWorkspace
        metrics={metrics}
        insights={{
          activation: {
            registered: 12,
            createdProject: 10,
            createdShare: 5,
            publishedToGallery: 2,
          },
          contentGrowth: [],
          usage,
          retention: [],
        }}
        growthByRange={growthByRange}
        growthTimeline={{
          dailyGrowth: [{ date: "2026-07-01", users: 2 }],
          totalUsers: 12,
          today: "2026-07-09",
        }}
        cockpit={cockpit}
        explorer={explorer}
        localizationDemand={{
          id: "L10N-001",
          windowDays: 28,
          measuredSince: "2026-06-01",
          quality: "building",
          comparisonReady: false,
          totalCreatorSessions: 27,
          unsupportedCreatorSessions: 5,
          languages: [
            {
              language: "en",
              creatorSessions: 18,
              previousCreatorSessions: 0,
              share: 18 / 27,
              supported: true,
              countries: [
                { country: "other", creatorSessions: 11 },
                { country: "US", creatorSessions: 7 },
              ],
            },
            {
              language: "other",
              creatorSessions: 9,
              previousCreatorSessions: 0,
              share: 9 / 27,
              supported: null,
              countries: [],
            },
          ],
          servedLocales: [
            { locale: "en", creatorSessions: 24, share: 24 / 27 },
            { locale: "zh-CN", creatorSessions: 2, share: 2 / 27 },
            { locale: "de", creatorSessions: 1, share: 1 / 27 },
          ],
        }}
        header={{
          title: "Product metrics",
          subtitle: "Aggregate product health",
          updatedLabel: "Updated",
          lastUpdated: "15 Aug 2026",
          dateTime: "2026-08-15T12:00:00.000Z",
        }}
      />
    );

    expect(container.querySelectorAll("[data-chart]")).toHaveLength(1);
    expect(screen.getByText("Completed exports")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^Acquisition Building/ })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^Activation Building — \d+\/28d 0%/ })
    ).toBeTruthy();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: "Creators" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Creation" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Distribution" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Localization" })).toBeNull();
    expect(
      screen.getAllByRole("button", { name: "Range Last 3 months" })
    ).toHaveLength(2);
    const journey = screen.getByRole("navigation", {
      name: "Product journey metrics",
    });
    const evidence = screen.getByRole("region", { name: "Journey evidence" });
    expect(within(journey).queryByText(/MTR-\d+/)).toBeNull();
    expect(within(evidence).queryByText(/MTR-\d+/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Close metric details" })
    ).toBeNull();
    expect(within(evidence).getByText("Active creators")).toBeTruthy();
    expect(within(evidence).queryByText(/Distinct signed-in users/)).toBeNull();
    expect(within(evidence).queryByText("Trend")).toBeNull();
    expect(within(evidence).getByRole("table").className).toContain("text-sm");
    expect(screen.queryByRole("button", { name: "Editor usage" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Sharing + Embed reach" })
    ).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Audience" }));
    expect(screen.getByRole("tab", { name: "Audience" }).className).toContain(
      "min-h-11"
    );
    const acquisitionHeading = screen.getByRole("heading", {
      name: "Acquisition source mix",
    });
    expect(acquisitionHeading).toBeTruthy();
    expect(acquisitionHeading.closest('[role="tabpanel"]')).toBeTruthy();
    expect(
      screen.queryByRole("navigation", { name: "Explore more views:" })
    ).toBeNull();
    expect(screen.getByText("No data for this period.")).toBeTruthy();

    expect(
      screen.getByRole("heading", { name: "Localization demand" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Preferred browser language" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Interface language used" })
    ).toBeTruthy();
    expect(screen.getByText("Grouped for privacy")).toBeTruthy();
    expect(
      screen.getByText("Translation candidates above threshold")
    ).toBeTruthy();
    expect(
      screen.getByText(/Previous-period comparison will appear/)
    ).toBeTruthy();
    expect(screen.queryByText("Previous 28d")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Creators" }));
    expect(screen.getByText("Creator retention")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Creation" }));
    expect(screen.getByText("Content growth")).toBeTruthy();
    const adoption = screen
      .getByRole("heading", { name: "Feature adoption" })
      .closest("section");
    expect(adoption).toBeTruthy();
    expect(
      within(adoption!)
        .getAllByRole("img")
        .map((row) => row.getAttribute("aria-label"))
    ).toEqual(["3D preview: 70%", "Import: 20%"]);

    await user.click(screen.getByRole("tab", { name: "Distribution" }));
    expect(screen.getByText("Export usage")).toBeTruthy();
    expect(screen.getByText("events.example.org")).toBeTruthy();
    expect(screen.getByText("Thresholded embed reach")).toBeTruthy();
  });
});
