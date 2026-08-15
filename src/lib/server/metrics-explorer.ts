import "server-only";

import { buildMetricsExplorerData } from "@/lib/metrics-explorer";
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
];

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return utcDay(date);
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

  return buildMetricsExplorerData(Object.fromEntries(seriesPairs), states, now);
}
