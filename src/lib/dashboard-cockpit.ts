import type {
  ProductMetricDailyRow,
  ProductMetricId,
} from "@/lib/server/product-metric-aggregates";

export type CockpitMetricQuality =
  ProductMetricDailyRow["quality_status"] | "not_started";

export type CockpitMetricDefinition = {
  id: "MTR-001" | "MTR-004" | "MTR-005" | "MTR-006";
  windowDays: 7 | 30;
  minimumVolume: number;
  valueKind: "count" | "rate";
  unfavorableDirection: "down";
  drilldown: string;
};

export const COCKPIT_METRICS: readonly CockpitMetricDefinition[] = [
  {
    id: "MTR-001",
    windowDays: 7,
    minimumVolume: 30,
    valueKind: "count",
    unfavorableDirection: "down",
    drilldown: "/dashboard/metrics#creators",
  },
  {
    id: "MTR-004",
    windowDays: 7,
    minimumVolume: 30,
    valueKind: "rate",
    unfavorableDirection: "down",
    drilldown: "/dashboard/metrics#creation",
  },
  {
    id: "MTR-005",
    windowDays: 30,
    minimumVolume: 20,
    valueKind: "rate",
    unfavorableDirection: "down",
    drilldown: "/dashboard/metrics#creators",
  },
  {
    id: "MTR-006",
    windowDays: 7,
    minimumVolume: 30,
    valueKind: "count",
    unfavorableDirection: "down",
    drilldown: "/dashboard/metrics#distribution",
  },
] as const;

export type CockpitHeadlineMetric = CockpitMetricDefinition & {
  current: ProductMetricDailyRow | null;
  live: ProductMetricDailyRow | null;
  previous: ProductMetricDailyRow | null;
  comparisonReady: boolean;
  quality: CockpitMetricQuality;
};

export type ReliableProductWarning = {
  metricId: ProductMetricId;
  dimension: string;
  currentValue: number;
  historicalMedian: number;
  absoluteChange: number;
  score: number;
};

function addUtcDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function rowValue(row: ProductMetricDailyRow) {
  if (row.denominator === null) return row.numerator;
  if (row.denominator === 0) return 0;
  return row.numerator / row.denominator;
}

function effectiveQuality(
  row: ProductMetricDailyRow | null,
  minimumVolume: number
): CockpitMetricQuality {
  if (!row) return "not_started";
  if (row.completeness_state !== "complete") return "building";
  if (row.quality_status !== "healthy") return row.quality_status;
  if ((row.sample_size ?? row.denominator ?? 0) < minimumVolume) {
    return "low_volume";
  }
  return "healthy";
}

function findRow(rows: ProductMetricDailyRow[], day: string, dimension = "") {
  return (
    rows.find((row) => row.day_utc === day && row.dimension === dimension) ??
    null
  );
}

function latestCompleteRow(
  rows: ProductMetricDailyRow[],
  throughDay: string,
  dimension = ""
) {
  return (
    rows
      .filter(
        (row) =>
          row.day_utc <= throughDay &&
          row.dimension === dimension &&
          row.completeness_state === "complete"
      )
      .sort((left, right) => right.day_utc.localeCompare(left.day_utc))[0] ??
    null
  );
}

function historicalPeriodRows(
  rows: ProductMetricDailyRow[],
  current: ProductMetricDailyRow,
  windowDays: number,
  count = 8
) {
  return Array.from({ length: count }, (_, index) =>
    findRow(
      rows,
      addUtcDays(current.day_utc, -(index + 1) * windowDays),
      current.dimension
    )
  );
}

export function buildCockpitHeadlineMetrics(
  series: Partial<Record<ProductMetricId, ProductMetricDailyRow[]>>,
  now = new Date()
): CockpitHeadlineMetric[] {
  const today = now.toISOString().slice(0, 10);
  const lastCompleteDay = addUtcDays(today, -1);

  return COCKPIT_METRICS.map((definition) => {
    const rows = series[definition.id] ?? [];
    const current =
      definition.id === "MTR-005"
        ? latestCompleteRow(rows, lastCompleteDay)
        : findRow(rows, lastCompleteDay);
    const live = definition.id === "MTR-005" ? null : findRow(rows, today);
    const history = current
      ? historicalPeriodRows(rows, current, definition.windowDays)
      : [];
    const healthyHistory = history.every(
      (row) => effectiveQuality(row, definition.minimumVolume) === "healthy"
    );

    return {
      ...definition,
      current,
      live,
      previous: healthyHistory ? (history[0] ?? null) : null,
      comparisonReady:
        effectiveQuality(current, definition.minimumVolume) === "healthy" &&
        healthyHistory,
      quality: effectiveQuality(current, definition.minimumVolume),
    };
  });
}

function median(values: number[]) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle] ?? 0;
  return ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2;
}

function warningCandidate(
  rows: ProductMetricDailyRow[],
  current: ProductMetricDailyRow,
  options: {
    windowDays: number;
    minimumVolume: number;
    valueKind: "count" | "rate";
    unfavorableDirection: "up" | "down";
  }
): ReliableProductWarning | null {
  if (effectiveQuality(current, options.minimumVolume) !== "healthy") {
    return null;
  }

  const history = historicalPeriodRows(rows, current, options.windowDays);
  if (
    history.length !== 8 ||
    history.some(
      (row) => effectiveQuality(row, options.minimumVolume) !== "healthy"
    )
  ) {
    return null;
  }

  const historyValues = history.map((row) => rowValue(row!));
  const baseline = median(historyValues);
  const currentValue = rowValue(current);
  const signedChange = currentValue - baseline;
  const unfavorable =
    options.unfavorableDirection === "up" ? signedChange > 0 : signedChange < 0;
  if (!unfavorable) return null;

  const absoluteChange = Math.abs(signedChange);
  const deviations = historyValues.map((value) => Math.abs(value - baseline));
  const mad = median(deviations);
  const clearsMad = mad === 0 || absoluteChange >= 3 * mad;
  const clearsMeaningfulChange =
    options.valueKind === "rate"
      ? absoluteChange >= 0.1
      : baseline > 0 && absoluteChange / baseline >= 0.3;

  if (!clearsMad || !clearsMeaningfulChange) return null;

  const threshold = options.valueKind === "rate" ? 0.1 : baseline * 0.3;
  return {
    metricId: current.metric_id,
    dimension: current.dimension,
    currentValue,
    historicalMedian: baseline,
    absoluteChange,
    score: threshold > 0 ? absoluteChange / threshold : 0,
  };
}

export function selectReliableProductWarning(
  series: Partial<Record<ProductMetricId, ProductMetricDailyRow[]>>,
  headlines: CockpitHeadlineMetric[]
): ReliableProductWarning | null {
  const candidates: ReliableProductWarning[] = [];

  for (const metric of headlines) {
    if (!metric.current) continue;
    const candidate = warningCandidate(
      series[metric.id] ?? [],
      metric.current,
      metric
    );
    if (candidate) candidates.push(candidate);
  }

  const failureRows = series["MTR-010"] ?? [];
  const expectedCurrentDay = headlines.find((metric) => metric.id === "MTR-001")
    ?.current?.day_utc;
  const latestFailureDay = failureRows
    .filter((row) => row.completeness_state === "complete")
    .sort((left, right) =>
      right.day_utc.localeCompare(left.day_utc)
    )[0]?.day_utc;
  for (const current of failureRows.filter(
    (row) =>
      row.day_utc === latestFailureDay &&
      row.day_utc === expectedCurrentDay &&
      row.denominator !== null
  )) {
    const candidate = warningCandidate(failureRows, current, {
      windowDays: 7,
      minimumVolume: 30,
      valueKind: "rate",
      unfavorableDirection: "up",
    });
    if (candidate) candidates.push(candidate);
  }

  return candidates.sort((left, right) => right.score - left.score)[0] ?? null;
}

export function productMetricValue(row: ProductMetricDailyRow | null) {
  return row ? rowValue(row) : null;
}
