import { describe, expect, it, vi } from "vitest";
import { createD1Statement, installD1Statements } from "../../helpers/d1";

vi.mock("server-only", () => ({}));

import {
  getProductMetricSeries,
  runProductMetricMaintenance,
} from "@/lib/server/product-metric-aggregates";

describe("product metric aggregates", () => {
  it("backfills complete UTC days with retry-safe anonymous metric rows", async () => {
    const prepare = vi.fn();
    const activation = createD1Statement({ run: { meta: { changes: 1 } } });
    const state = createD1Statement({
      first: {
        measured_since: "2026-08-13",
        last_aggregated_day: null,
      },
    });
    const aggregate = createD1Statement({
      run: { meta: { changes: 12 } },
    });
    const updateState = createD1Statement({ run: {} });
    const cleanup = createD1Statement({ run: { meta: { changes: 2 } } });
    installD1Statements(prepare, [
      activation,
      state,
      aggregate,
      updateState,
      cleanup,
    ]);

    const result = await runProductMetricMaintenance(
      { prepare } as Parameters<typeof runProductMetricMaintenance>[0],
      new Date("2026-08-14T03:17:00.000Z")
    );

    expect(activation.sql).toContain("product_metric_creator_activations");
    expect(activation.sql).toContain("min(created_at)");
    expect(aggregate.sql).toContain("contract_version = '1.0.0'");
    expect(aggregate.sql).toContain(
      "on conflict(metric_id, day_utc, dimension) do update"
    );
    expect(aggregate.sql).toContain(
      "when bounds.is_complete_day = 0 then 'incomplete'"
    );
    expect(aggregate.sql).toContain(
      "datetime((select end_at from bounds), '+30 days')"
    );
    expect(aggregate.sql).not.toContain("project_id as");
    expect(aggregate.bind).toHaveBeenCalledWith(
      "2026-08-13",
      "2026-08-13T00:00:00.000Z",
      "2026-08-14T00:00:00.000Z",
      "2026-08-14T03:17:00.000Z",
      1
    );
    expect(result.health).toEqual({
      aggregated_days: 1,
      aggregate_rows: 12,
      last_aggregated_day: "2026-08-13",
      remaining_backfill_days: 0,
      unrecoverable_backfill_days: 0,
      deleted_rows: 2,
    });
  });

  it("keeps each run bounded when scheduled aggregation has fallen behind", async () => {
    const prepare = vi.fn();
    const statements = [
      createD1Statement({ run: {} }),
      createD1Statement({
        first: {
          measured_since: "2026-01-01",
          last_aggregated_day: "2026-06-30",
        },
      }),
      ...Array.from({ length: 7 }, () => createD1Statement({ run: {} })),
      createD1Statement({ run: {} }),
      createD1Statement({ run: {} }),
    ];
    installD1Statements(prepare, statements);

    const result = await runProductMetricMaintenance(
      { prepare } as Parameters<typeof runProductMetricMaintenance>[0],
      new Date("2026-08-14T03:17:00.000Z")
    );

    expect(result.health.aggregated_days).toBe(7);
    expect(result.health.last_aggregated_day).toBe("2026-07-07");
    expect(result.health.remaining_backfill_days).toBe(37);
  });

  it("marks history invalid instead of inventing a gap beyond raw retention", async () => {
    const prepare = vi.fn();
    const activation = createD1Statement({ run: {} });
    const state = createD1Statement({
      first: {
        measured_since: "2025-01-01",
        last_aggregated_day: "2025-01-01",
      },
    });
    const invalidate = createD1Statement({ run: {} });
    const cleanup = createD1Statement({ run: { meta: { changes: 1 } } });
    installD1Statements(prepare, [activation, state, invalidate, cleanup]);

    const result = await runProductMetricMaintenance(
      { prepare } as Parameters<typeof runProductMetricMaintenance>[0],
      new Date("2026-08-14T03:17:00.000Z")
    );

    expect(invalidate.sql).toContain("completeness_state = 'invalid'");
    expect(result.health).toMatchObject({
      aggregated_days: 0,
      remaining_backfill_days: 0,
      unrecoverable_backfill_days: expect.any(Number),
      deleted_rows: 1,
    });
    expect(result.health.unrecoverable_backfill_days).toBeGreaterThan(0);
  });

  it("combines stored complete days with only today's live raw window", async () => {
    const prepare = vi.fn();
    const historical = createD1Statement({
      all: {
        results: [
          {
            metric_id: "MTR-001",
            day_utc: "2026-08-13",
            dimension: "",
            numerator: 4,
          },
        ],
      },
    });
    const live = createD1Statement({
      all: {
        results: [
          {
            metric_id: "MTR-001",
            day_utc: "2026-08-14",
            dimension: "",
            numerator: 2,
          },
        ],
      },
    });
    installD1Statements(prepare, [historical, live]);

    const rows = await getProductMetricSeries(
      { prepare } as Parameters<typeof getProductMetricSeries>[0],
      "MTR-001",
      "2026-08-13",
      "2026-08-15",
      new Date("2026-08-14T12:00:00.000Z")
    );

    expect(historical.sql).toContain("product_metric_daily_aggregates");
    expect(historical.bind).toHaveBeenCalledWith(
      "MTR-001",
      "2026-08-13",
      "2026-08-14"
    );
    expect(live.sql).toContain(
      "created_at >= datetime(bounds.start_at, '-27 days')"
    );
    expect(live.bind).toHaveBeenCalledWith(
      "2026-08-14",
      "2026-08-14T00:00:00.000Z",
      "2026-08-14T12:00:00.000Z",
      "2026-08-14T12:00:00.000Z",
      0,
      "MTR-001"
    );
    expect(rows.map((row) => row.numerator)).toEqual([4, 2]);
  });
});
