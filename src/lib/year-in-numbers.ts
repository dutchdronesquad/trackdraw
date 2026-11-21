export const yearNumberMetrics = [
  "elements",
  "exports",
  "sessions",
  "shares",
  "views",
  "accounts",
] as const;

export type YearNumberMetric = (typeof yearNumberMetrics)[number];
export type YearNumberDailyTotal = {
  day_utc: string;
  metric: YearNumberMetric;
  total: number;
  contributors: number;
  source: "product-events-v1" | "registration-trigger";
  updated_at: string;
};

export function getYearInNumbers(
  year: number,
  rows: YearNumberDailyTotal[],
  now = new Date()
) {
  if (!Number.isInteger(year) || year < 2026 || year > now.getUTCFullYear()) {
    throw new Error("Invalid reporting year");
  }
  const from = `${year}-01-01`;
  const toExclusive =
    year === now.getUTCFullYear()
      ? now.toISOString().slice(0, 10)
      : `${year + 1}-01-01`;
  const expectedDays = Math.round(
    (Date.parse(toExclusive) - Date.parse(from)) / 86_400_000
  );
  const to =
    expectedDays > 0
      ? new Date(Date.parse(toExclusive) - 86_400_000)
          .toISOString()
          .slice(0, 10)
      : null;
  const eligible = rows.filter(
    (row) => row.day_utc >= from && row.day_utc < toExclusive
  );
  return {
    year,
    from,
    to,
    coverageDays: eligible
      .filter((row) => row.metric === "elements")
      .map((row) => row.day_utc),
    updatedAt: eligible.reduce<string | null>(
      (latest, row) =>
        !latest || row.updated_at > latest ? row.updated_at : latest,
      null
    ),
    yearToDate: year === now.getUTCFullYear(),
    metrics: yearNumberMetrics.map((metric) => {
      const days = eligible
        .filter((row) => row.metric === metric)
        .sort((a, b) => a.day_utc.localeCompare(b.day_utc));
      const receivedTotal = days.reduce((sum, day) => sum + day.total, 0);
      // Account insertions are distinct accounts. For events, require one day with
      // five distinct contributors: summing daily distinct counts would overstate it.
      const safeToReport =
        metric === "accounts"
          ? receivedTotal >= 5
          : days.some((day) => day.contributors >= 5);
      // Event instrumentation is best effort, even when every day was aggregated.
      const status =
        days.length === 0 || !safeToReport
          ? "unavailable"
          : metric === "accounts" && days.length === expectedDays
            ? "verified"
            : "partial";
      return {
        metric,
        total: days.length > 0 && safeToReport ? receivedTotal : null,
        reason:
          days.length === 0 ? "noData" : !safeToReport ? "lowVolume" : null,
        status,
        from: days[0]?.day_utc ?? null,
        to: days.at(-1)?.day_utc ?? null,
        days: days.length,
        expectedDays,
        updatedAt: days.reduce<string | null>(
          (last, day) =>
            !last || day.updated_at > last ? day.updated_at : last,
          null
        ),
      };
    }),
  };
}

export type YearInNumbers = ReturnType<typeof getYearInNumbers>;
