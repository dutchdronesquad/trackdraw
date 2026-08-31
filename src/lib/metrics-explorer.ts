import type {
  ProductMetricDailyRow,
  ProductMetricId,
  ProductMetricMeasurementState,
} from "@/lib/server/product-metric-aggregates";

export type MetricsExplorerQuality =
  ProductMetricDailyRow["quality_status"] | "not_started";

export type MetricsExplorerRow = {
  dimension: string;
  day: string;
  numerator: number;
  denominator: number | null;
  sampleSize: number | null;
  value: number | null;
  quality: MetricsExplorerQuality;
  previousValue: number | null;
  comparisonReady: boolean;
};

export type MetricsExplorerMetric = {
  id: ProductMetricId;
  windowDays: 7 | 28 | 30;
  measuredSince: string | null;
  quality: MetricsExplorerQuality;
  rows: MetricsExplorerRow[];
};

export type MetricsExplorerData = {
  generatedAt: string;
  acquisition: MetricsExplorerMetric;
  adoption: MetricsExplorerMetric;
  retention: MetricsExplorerMetric;
  failures: MetricsExplorerMetric;
};

type MetricDefinition = {
  id: "MTR-005" | "MTR-008" | "MTR-009" | "MTR-010";
  windowDays: 7 | 28 | 30;
  minimumVolume: number;
  valueKind: "count" | "rate";
};

const EXPLORER_DEFINITIONS: readonly MetricDefinition[] = [
  {
    id: "MTR-005",
    windowDays: 30,
    minimumVolume: 20,
    valueKind: "rate",
  },
  {
    id: "MTR-008",
    windowDays: 28,
    minimumVolume: 30,
    valueKind: "rate",
  },
  {
    id: "MTR-009",
    windowDays: 28,
    minimumVolume: 20,
    valueKind: "rate",
  },
  {
    id: "MTR-010",
    windowDays: 7,
    minimumVolume: 30,
    valueKind: "rate",
  },
] as const;

function addUtcDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function rowValue(row: ProductMetricDailyRow, valueKind: "count" | "rate") {
  if (valueKind === "count") return row.numerator;
  if (row.denominator === null || row.denominator === 0) return null;
  return row.numerator / row.denominator;
}

function rowQuality(
  row: ProductMetricDailyRow | null,
  minimumVolume: number
): MetricsExplorerQuality {
  if (!row) return "not_started";
  if (row.completeness_state !== "complete") return "building";
  if (row.quality_status !== "healthy") return row.quality_status;
  if ((row.sample_size ?? row.denominator ?? 0) < minimumVolume) {
    return "low_volume";
  }
  return "healthy";
}

function stateQuality(
  state: ProductMetricMeasurementState | undefined
): MetricsExplorerQuality {
  if (!state || state.completeness_state === "not_started") {
    return "not_started";
  }
  if (state.completeness_state === "invalid") return "invalid";
  if (
    state.completeness_state === "building" ||
    state.completeness_state === "incomplete"
  ) {
    return "building";
  }
  return "healthy";
}

function qualityPriority(quality: MetricsExplorerQuality) {
  return {
    invalid: 5,
    degraded: 4,
    building: 3,
    not_started: 3,
    low_volume: 2,
    healthy: 1,
  }[quality];
}

function metricQuality(
  rows: MetricsExplorerRow[],
  state: ProductMetricMeasurementState | undefined
) {
  if (rows.length === 0) return stateQuality(state);
  return rows.reduce<MetricsExplorerQuality>(
    (worst, row) =>
      qualityPriority(row.quality) > qualityPriority(worst)
        ? row.quality
        : worst,
    "healthy"
  );
}

function buildMetric(
  definition: MetricDefinition,
  rows: ProductMetricDailyRow[],
  state: ProductMetricMeasurementState | undefined
): MetricsExplorerMetric {
  const completeRows = rows.filter(
    (row) => row.completeness_state === "complete"
  );
  const latestDay = completeRows
    .map((row) => row.day_utc)
    .sort((left, right) => right.localeCompare(left))[0];
  const latestRows = latestDay
    ? completeRows.filter((row) => row.day_utc === latestDay)
    : [];

  const builtRows = latestRows.map<MetricsExplorerRow>((current) => {
    const history = Array.from({ length: 8 }, (_, index) => {
      const day = addUtcDays(
        current.day_utc,
        -(index + 1) * definition.windowDays
      );
      return (
        completeRows.find(
          (row) => row.day_utc === day && row.dimension === current.dimension
        ) ?? null
      );
    });
    const quality = rowQuality(current, definition.minimumVolume);
    const comparisonReady =
      quality === "healthy" &&
      history.every(
        (row) => rowQuality(row, definition.minimumVolume) === "healthy"
      );
    const previous = comparisonReady ? history[0] : null;

    return {
      dimension: current.dimension,
      day: current.day_utc,
      numerator: current.numerator,
      denominator: current.denominator,
      sampleSize: current.sample_size,
      value:
        quality === "invalid" ? null : rowValue(current, definition.valueKind),
      quality,
      previousValue: previous ? rowValue(previous, definition.valueKind) : null,
      comparisonReady,
    };
  });

  return {
    id: definition.id,
    windowDays: definition.windowDays,
    measuredSince: state?.measured_since ?? null,
    quality: metricQuality(builtRows, state),
    rows: builtRows,
  };
}

function mergeLowVolumeAcquisitionRows(
  metric: MetricsExplorerMetric
): MetricsExplorerMetric {
  const visible = metric.rows.filter((row) => row.numerator >= 5);
  const hidden = metric.rows.filter((row) => row.numerator < 5);
  if (hidden.length === 0) return metric;

  const denominator = hidden[0]?.denominator ?? null;
  const numerator = hidden.reduce((sum, row) => sum + row.numerator, 0);
  const other: MetricsExplorerRow = {
    dimension: "other",
    day: hidden[0]?.day ?? "",
    numerator,
    denominator,
    sampleSize: hidden[0]?.sampleSize ?? null,
    value: denominator && denominator > 0 ? numerator / denominator : null,
    quality: metric.quality,
    previousValue: null,
    comparisonReady: false,
  };

  return { ...metric, rows: [...visible, other] };
}

export function buildMetricsExplorerData(
  series: Partial<Record<ProductMetricId, ProductMetricDailyRow[]>>,
  states: ProductMetricMeasurementState[],
  now = new Date()
): MetricsExplorerData {
  const metrics = Object.fromEntries(
    EXPLORER_DEFINITIONS.map((definition) => {
      const state = states.find((entry) => entry.metric_id === definition.id);
      return [
        definition.id,
        buildMetric(definition, series[definition.id] ?? [], state),
      ];
    })
  ) as Record<MetricDefinition["id"], MetricsExplorerMetric>;
  const retentionRows = (series["MTR-005"] ?? [])
    .filter(
      (row) =>
        row.dimension === "" &&
        row.completeness_state === "complete" &&
        row.denominator !== null &&
        row.quality_status !== "invalid"
    )
    .sort((left, right) => right.day_utc.localeCompare(left.day_utc))
    .slice(0, 8)
    .map((row) => ({
      dimension: row.dimension,
      day: row.day_utc,
      numerator: row.numerator,
      denominator: row.denominator,
      sampleSize: row.sample_size,
      value: rowValue(row, "rate"),
      quality: rowQuality(row, 20),
      previousValue: null,
      comparisonReady: false,
    }));
  const retentionState = states.find((entry) => entry.metric_id === "MTR-005");

  return {
    generatedAt: now.toISOString(),
    acquisition: mergeLowVolumeAcquisitionRows(metrics["MTR-008"]),
    adoption: metrics["MTR-009"],
    failures: metrics["MTR-010"],
    retention: {
      ...metrics["MTR-005"],
      quality: metricQuality(retentionRows, retentionState),
      rows: retentionRows,
    },
  };
}
