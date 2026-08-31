import "server-only";

import { buildMetricsExplorerData } from "@/lib/metrics-explorer";
import type { MetricsExplorerFailureAttempt } from "@/lib/metrics-explorer";
import {
  productEventExportFailureReasons,
  productEventExportFormats,
  productEventFailureCategories,
} from "@/lib/product-events";
import { getDatabase } from "@/lib/server/db";
import {
  getProductMetricMeasurementStates,
  getProductMetricSeries,
  type ProductMetricId,
} from "@/lib/server/product-metric-aggregates";

const EXPLORER_METRICS: readonly ProductMetricId[] = [
  "MTR-005",
  "MTR-008",
  "MTR-009",
  "MTR-010",
];

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return utcDay(date);
}

type FailureAttemptRow = {
  occurred_at: string;
  operation: string;
  category: string;
  export_format: string | null;
  reason: string | null;
};

function isOneOf<T extends string>(
  value: string | null,
  options: readonly T[]
): value is T {
  return value !== null && options.includes(value as T);
}

async function getRecentFailureAttempts(
  db: Awaited<ReturnType<typeof getDatabase>>,
  windowEnd: string | null
): Promise<MetricsExplorerFailureAttempt[]> {
  if (!windowEnd) return [];
  const windowStart = addUtcDays(windowEnd, -6);
  const endExclusive = addUtcDays(windowEnd, 1);
  const result = await db
    .prepare(
      `
        select
          created_at as occurred_at,
          case
            when event_type = 'export.failed' then 'export'
            else json_extract(metadata_json, '$.operation')
          end as operation,
          json_extract(metadata_json, '$.category') as category,
          case
            when event_type = 'export.failed' then json_extract(metadata_json, '$.format')
            else null
          end as export_format,
          case
            when event_type = 'export.failed' then json_extract(metadata_json, '$.reason')
            else null
          end as reason
        from product_events
        where contract_version in ('1.0.0', '1.1.0')
          and created_at >= ?
          and created_at < ?
          and (
            event_type = 'export.failed'
            or (
              event_type = 'operation.failed'
              and json_extract(metadata_json, '$.operation') in ('export', 'gallery_publish')
            )
          )
        order by created_at desc
        limit 50
      `
    )
    .bind(`${windowStart}T00:00:00.000Z`, `${endExclusive}T00:00:00.000Z`)
    .all<FailureAttemptRow>();

  return result.results.flatMap((row) => {
    if (
      (row.operation !== "export" && row.operation !== "gallery_publish") ||
      !isOneOf(row.category, productEventFailureCategories)
    ) {
      return [];
    }
    const exportFormat = isOneOf(row.export_format, productEventExportFormats)
      ? row.export_format
      : null;
    const reason = isOneOf(row.reason, productEventExportFailureReasons)
      ? row.reason
      : null;
    return [
      {
        occurredAt: row.occurred_at,
        operation: row.operation,
        category: row.category,
        exportFormat,
        reason,
      },
    ];
  });
}

export async function getMetricsExplorerData(now = new Date()) {
  const db = await getDatabase();
  const today = utcDay(now);
  const [seriesPairs, states] = await Promise.all([
    Promise.all(
      EXPLORER_METRICS.map(
        async (metricId) =>
          [
            metricId,
            await getProductMetricSeries(
              db,
              metricId,
              addUtcDays(today, -280),
              addUtcDays(today, 1),
              now
            ),
          ] as const
      )
    ),
    getProductMetricMeasurementStates(db),
  ]);

  const explorer = buildMetricsExplorerData(
    Object.fromEntries(seriesPairs),
    states,
    now
  );
  const failureWindowEnd = explorer.failures.rows[0]?.day ?? null;
  return {
    ...explorer,
    recentFailures: await getRecentFailureAttempts(db, failureWindowEnd),
  };
}
