import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createD1AllStatement,
  createD1Statement,
  installD1Statements,
} from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({
    prepare: mocks.prepare,
  })),
}));

import {
  getAdminMetrics,
  getGrowthByRange,
  getGrowthTimeline,
  getOverviewStats,
} from "@/lib/server/metrics";

beforeEach(() => {
  mocks.prepare.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("dashboard metrics", () => {
  it("counts new users this month by calendar month instead of rolling 30 days", async () => {
    installD1Statements(mocks.prepare, [
      createD1Statement({
        first: { total: 12, new_this_week: 2, new_this_month: 4 },
      }),
      createD1Statement({ first: { count: 3 } }),
      createD1Statement({ first: { count: 5 } }),
      createD1Statement({
        first: { total: 8, active: 7, archived: 1 },
      }),
      createD1Statement({
        first: { avg_per_user: 1.2, max_per_user: 4 },
      }),
      createD1Statement({
        first: { total_active: 6, revoked: 2 },
      }),
      createD1Statement({
        first: { avg_per_user: 0.8, max_per_user: 3 },
      }),
      createD1Statement({ first: { total: 4 } }),
      createD1Statement({
        first: { avg_per_user: 0.5, max_per_user: 2 },
      }),
      createD1Statement({
        first: { total: 3, listed: 2, featured: 1, hidden: 0 },
      }),
      createD1Statement({ first: { active: 1, total: 2 } }),
      createD1AllStatement([{ proj_cnt: 1, share_cnt: 0, preset_cnt: 0 }]),
    ]);

    const metrics = await getAdminMetrics();

    expect(metrics.users.newThisMonth).toBe(4);
    expect(String(mocks.prepare.mock.calls[0][0])).toContain(
      "createdAt >= date('now', 'start of month')"
    );
    expect(String(mocks.prepare.mock.calls[0][0])).not.toContain("-30 days");
  });

  it("uses calendar month buckets in overview stats and tolerates incomplete recent user rows", async () => {
    installD1Statements(mocks.prepare, [
      createD1Statement({
        first: { total: 12, new_this_month: 4, new_last_month: 3 },
      }),
      createD1Statement({
        first: { count: 7, new_this_month: 3, new_last_month: 2 },
      }),
      createD1Statement({
        first: { count: 5, new_this_month: 2, new_last_month: 4 },
      }),
      createD1AllStatement([
        {
          id: "user-1",
          name: null,
          email: null,
          createdAt: "2026-07-07T10:00:00.000Z",
        },
      ]),
    ]);

    const stats = await getOverviewStats();

    expect(stats.newUsersThisMonth).toBe(4);
    expect(stats.newUsersLastMonth).toBe(3);
    expect(stats.newActiveProjectsThisMonth).toBe(3);
    expect(stats.newActiveProjectsLastMonth).toBe(2);
    expect(stats.newActiveSharesThisMonth).toBe(2);
    expect(stats.newActiveSharesLastMonth).toBe(4);
    expect(stats.recentUsers[0]).toMatchObject({
      id: "user-1",
      name: null,
      email: null,
    });
    expect(String(mocks.prepare.mock.calls[0][0])).toContain(
      "createdAt >= date('now', 'start of month')"
    );
    expect(String(mocks.prepare.mock.calls[0][0])).toContain(
      "createdAt >= date('now', 'start of month', '-1 month')"
    );
    expect(String(mocks.prepare.mock.calls[0][0])).not.toContain("-30 days");
    expect(String(mocks.prepare.mock.calls[1][0])).toContain(
      "coalesce(sum(case"
    );
    expect(String(mocks.prepare.mock.calls[1][0])).toContain(
      "created_at >= date('now', 'start of month')"
    );
    expect(String(mocks.prepare.mock.calls[2][0])).toContain(
      "coalesce(sum(case"
    );
    expect(String(mocks.prepare.mock.calls[2][0])).toContain(
      "created_at >= date('now', 'start of month', '-1 month')"
    );
  });

  it("separates rolling ranges from calendar-year growth buckets with empty periods filled", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));

    installD1Statements(mocks.prepare, [
      createD1AllStatement([{ period: "2026-06-29", users: 1 }]),
      createD1Statement({ first: { count: 4 } }),
      createD1AllStatement([]),
      createD1Statement({ first: { count: 3 } }),
      createD1AllStatement([
        { period: "2025-08-01", users: 2 },
        { period: "2025-10-01", users: 1 },
      ]),
      createD1Statement({ first: { count: 10 } }),
      createD1AllStatement([{ period: "2026-02-01", users: 3 }]),
      createD1Statement({ first: { count: 11 } }),
      createD1AllStatement([
        { period: "2025-01-01", users: 4 },
        { period: "2025-12-01", users: 2 },
      ]),
      createD1Statement({ first: { count: 5 } }),
    ]);

    const growthByRange = await getGrowthByRange();

    expect(growthByRange["3m"].bucket).toBe("week");
    expect(growthByRange["3m"].userGrowth).toHaveLength(13);
    expect(growthByRange["3m"].userGrowth.at(-1)).toMatchObject({
      period: "2026-07-06",
      users: 0,
    });

    expect(growthByRange["12m"].bucket).toBe("month");
    expect(growthByRange["12m"].userGrowth).toHaveLength(12);
    expect(growthByRange["12m"].userGrowth[0]).toMatchObject({
      period: "2025-08-01",
      label: "Aug 2025",
      users: 2,
    });
    expect(growthByRange["12m"].userGrowth[1]).toMatchObject({
      period: "2025-09-01",
      users: 0,
    });
    expect(growthByRange["12m"].userGrowthCumulative[0]?.users).toBe(12);
    expect(growthByRange["12m"].userGrowthCumulative[1]?.users).toBe(12);
    expect(growthByRange["12m"].userGrowthCumulative[2]?.users).toBe(13);

    expect(growthByRange.ytd.userGrowth).toHaveLength(7);
    expect(growthByRange.ytd.userGrowth[0]).toMatchObject({
      period: "2026-01-01",
      users: 0,
    });
    expect(growthByRange.ytd.userGrowth[1]).toMatchObject({
      period: "2026-02-01",
      users: 3,
    });

    expect(growthByRange.previousYear.userGrowth).toHaveLength(12);
    expect(growthByRange.previousYear.userGrowth[0]).toMatchObject({
      period: "2025-01-01",
      users: 4,
    });
    expect(growthByRange.previousYear.userGrowth.at(-1)).toMatchObject({
      period: "2025-12-01",
      users: 2,
    });

    expect(String(mocks.prepare.mock.calls[0][0])).toContain(
      "printf('-%d days'"
    );
    expect(String(mocks.prepare.mock.calls[4][0])).toContain(
      "date(createdAt, 'start of month')"
    );
    expect(String(mocks.prepare.mock.calls[8][0])).toContain(
      "date(createdAt, 'start of month')"
    );
  });

  it("returns sparse daily growth rows for client-side custom ranges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));

    installD1Statements(mocks.prepare, [
      createD1AllStatement([
        { date: "2026-07-01", users: 2 },
        { date: "2026-07-04", users: 1 },
      ]),
      createD1Statement({ first: { count: 9 } }),
    ]);

    const timeline = await getGrowthTimeline();

    expect(timeline).toEqual({
      dailyGrowth: [
        { date: "2026-07-01", users: 2 },
        { date: "2026-07-04", users: 1 },
      ],
      totalUsers: 9,
      today: "2026-07-09",
    });
    expect(String(mocks.prepare.mock.calls[0][0])).toContain(
      "select date(createdAt) as date"
    );
  });
});
