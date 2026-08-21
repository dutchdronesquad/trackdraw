import "server-only";

import {
  buildCockpitHeadlineMetrics,
  selectReliableProductWarning,
  type CockpitHeadlineMetric,
  type ReliableProductWarning,
} from "@/lib/dashboard-cockpit";
import { getDatabase } from "@/lib/server/db";
import {
  getProductMetricMeasurementStates,
  getProductMetricSeries,
  type ProductMetricDailyRow,
  type ProductMetricId,
  type ProductMetricMeasurementState,
} from "@/lib/server/product-metric-aggregates";

export type DailyCockpitOperations = {
  missingGalleryPreviews: number;
  exportFailures: number;
  publicationFailures: number;
  unusedApiKeys: number;
  expiredApiKeys: number;
  analyticsPipelineGaps: number;
  buildingMetrics: number;
  availability: {
    failures: boolean;
    pipeline: boolean;
  };
};

export type DailyCockpitHeadlineMetric = CockpitHeadlineMetric & {
  measuredSince: string | null;
};

export type DailyCockpitData = {
  generatedAt: string;
  headlines: DailyCockpitHeadlineMetric[];
  warning: ReliableProductWarning | null;
  operations: DailyCockpitOperations;
};

const SERIES_RANGES: ReadonlyArray<{
  metricId: ProductMetricId;
  historyDays: number;
}> = [
  { metricId: "MTR-001", historyDays: 70 },
  { metricId: "MTR-004", historyDays: 70 },
  { metricId: "MTR-005", historyDays: 260 },
  { metricId: "MTR-006", historyDays: 70 },
  { metricId: "MTR-010", historyDays: 70 },
];
const UNUSED_API_KEY_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const PRODUCT_METRIC_PIPELINE_SUCCESS_SLA_MS = 25 * 60 * 60 * 1000;

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return utcDay(date);
}

function latestCompleteRows(rows: ProductMetricDailyRow[]) {
  const day = rows
    .filter((row) => row.completeness_state === "complete")
    .sort((left, right) =>
      right.day_utc.localeCompare(left.day_utc)
    )[0]?.day_utc;
  return day ? rows.filter((row) => row.day_utc === day) : [];
}

function failureCount(rows: ProductMetricDailyRow[], operation: string) {
  return latestCompleteRows(rows)
    .filter((row) => row.dimension.startsWith(`${operation}:`))
    .reduce((total, row) => total + row.numerator, 0);
}

function hasPipelineIssue(states: ProductMetricMeasurementState[], now: Date) {
  const activeStates = states.filter(
    (state) => state.measured_since <= utcDay(now)
  );
  if (activeStates.length === 0) return false;
  if (
    activeStates.some(
      (state) =>
        state.completeness_state === "invalid" ||
        state.completeness_state === "incomplete"
    )
  ) {
    return true;
  }

  const lastSuccessTimes = activeStates.flatMap((state) => {
    if (!state.last_success_at) return [];
    const time = new Date(state.last_success_at).getTime();
    return Number.isFinite(time) ? [time] : [];
  });
  if (lastSuccessTimes.length === 0) return false;

  return (
    now.getTime() - Math.min(...lastSuccessTimes) >
    PRODUCT_METRIC_PIPELINE_SUCCESS_SLA_MS
  );
}

export async function getDailyCockpit(
  now = new Date()
): Promise<DailyCockpitData> {
  const db = await getDatabase();
  const today = utcDay(now);
  const toExclusive = addUtcDays(today, 1);
  const unusedApiKeyCutoff = new Date(
    now.getTime() - UNUSED_API_KEY_AGE_MS
  ).toISOString();

  const [seriesPairs, states, previewRow, apiKeyRow] = await Promise.all([
    Promise.all(
      SERIES_RANGES.map(
        async ({ metricId, historyDays }) =>
          [
            metricId,
            await getProductMetricSeries(
              db,
              metricId,
              addUtcDays(today, -historyDays),
              toExclusive,
              now
            ),
          ] as const
      )
    ),
    getProductMetricMeasurementStates(db),
    db
      .prepare(
        `select count(*) as count
         from gallery_entries
         where gallery_state in ('listed', 'featured')
           and (gallery_preview_image is null or trim(gallery_preview_image) = '')`
      )
      .first<{ count: number }>(),
    db
      .prepare(
        `select
           coalesce(sum(case
             when enabled = 1
               and (expiresAt is null or expiresAt > ?)
               and lastRequest is null
               and createdAt <= ?
             then 1 else 0 end), 0) as unused,
           coalesce(sum(case
             when enabled = 1 and expiresAt is not null and expiresAt <= ?
             then 1 else 0 end), 0) as expired
         from apikey`
      )
      .bind(now.toISOString(), unusedApiKeyCutoff, now.toISOString())
      .first<{ unused: number; expired: number }>(),
  ]);

  const series = Object.fromEntries(seriesPairs) as Partial<
    Record<ProductMetricId, ProductMetricDailyRow[]>
  >;
  const builtHeadlines = buildCockpitHeadlineMetrics(series, now);
  const headlines = builtHeadlines.map((headline) => {
    const state = states.find((entry) => entry.metric_id === headline.id);
    if (state?.completeness_state === "invalid") {
      return {
        ...headline,
        current: null,
        previous: null,
        comparisonReady: false,
        quality: "invalid" as const,
        measuredSince: state.measured_since,
      };
    }
    if (state?.completeness_state === "incomplete") {
      return {
        ...headline,
        previous: null,
        comparisonReady: false,
        quality: "degraded" as const,
        measuredSince: state.measured_since,
      };
    }
    return {
      ...headline,
      measuredSince: state?.measured_since ?? null,
    };
  });
  const failureRows = series["MTR-010"] ?? [];
  const failureMetricsAvailable = latestCompleteRows(failureRows).length > 0;
  const pipelineAvailable = states.length > 0;
  const warningSeries = failureMetricsAvailable
    ? series
    : { ...series, "MTR-010": [] };

  return {
    generatedAt: now.toISOString(),
    headlines,
    warning: selectReliableProductWarning(warningSeries, headlines),
    operations: {
      missingGalleryPreviews: Number(previewRow?.count ?? 0),
      exportFailures: failureCount(failureRows, "export"),
      publicationFailures: failureCount(failureRows, "gallery_publish"),
      unusedApiKeys: Number(apiKeyRow?.unused ?? 0),
      expiredApiKeys: Number(apiKeyRow?.expired ?? 0),
      analyticsPipelineGaps: hasPipelineIssue(states, now) ? 1 : 0,
      buildingMetrics: states.filter(
        (state) =>
          state.completeness_state === "building" ||
          state.completeness_state === "not_started"
      ).length,
      availability: {
        failures: failureMetricsAvailable,
        pipeline: pipelineAvailable,
      },
    },
  };
}
