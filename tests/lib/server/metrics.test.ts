import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { getAdminMetrics, getOverviewStats } from "@/lib/server/metrics";

beforeEach(() => {
  mocks.prepare.mockReset();
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
      createD1Statement({ first: { count: 7 } }),
      createD1Statement({ first: { count: 5 } }),
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
  });
});
