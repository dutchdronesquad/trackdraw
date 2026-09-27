"use client";

import { MetricDetails } from "@/components/dashboard/MetricDetails";
import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { addUtcDays, formatUtcDateKey } from "@/lib/metrics-growth";
import type {
  ProductActivityAnalysis,
  WeeklyProductActivity,
} from "@/lib/metrics-analysis";
import type { ProductUsageMetrics } from "@/lib/server/metrics";

function useAnalysisFormat() {
  const locale = useLocale();
  const t = useTranslations("dashboard.metrics.analysis");
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const date = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    t,
    date: (day: string) => date.format(new Date(`${day}T00:00:00Z`)),
    number: (value: number) => number.format(value),
    rate: (numerator: number, denominator: number) =>
      denominator ? percent.format(numerator / denominator) : "—",
    duration: (seconds: number | null) =>
      seconds === null
        ? "—"
        : seconds < 60
          ? t("seconds", { value: number.format(seconds) })
          : t("minutes", { value: number.format(seconds / 60) }),
  };
}

function isFullWeek(
  row: WeeklyProductActivity,
  coverage: ProductUsageMetrics["coverage"]
) {
  return (
    row.from === row.week &&
    row.to ===
      formatUtcDateKey(addUtcDays(new Date(`${row.week}T00:00:00Z`), 6)) &&
    Boolean(coverage?.from && row.from >= coverage.from)
  );
}

export function WeeklyActivity({
  analysis,
  coverage,
}: {
  analysis: ProductActivityAnalysis;
  coverage: ProductUsageMetrics["coverage"];
}) {
  const { t, date, number } = useAnalysisFormat();
  const rows = analysis.weeks.map((row) => ({
    ...row,
    label: `${date(row.from)} – ${date(row.to)}`,
    observed: Boolean(
      coverage?.availableFrom && row.to >= coverage.availableFrom
    ),
    complete: isFullWeek(row, coverage),
  }));
  const config = {
    started: { label: t("starts"), color: "var(--chart-1)" },
    exports: { label: t("exports"), color: "var(--chart-2)" },
    views: { label: t("views"), color: "var(--chart-3)" },
  };
  if (!rows.length)
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  return (
    <div className="space-y-4">
      <MetricDetails>{t("weeksNote")}</MetricDetails>
      <ChartContainer config={config} className="h-64 w-full">
        <ComposedChart
          accessibilityLayer
          data={rows.map((row) => ({
            ...row,
            started: row.observed ? row.started : null,
            exports: row.observed ? row.exports : null,
            views: row.observed ? row.views : null,
          }))}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickFormatter={date} minTickGap={32} />
          <YAxis allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  payload[0]?.payload?.label ?? ""
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="linear"
            dataKey="started"
            stroke="var(--color-started)"
            dot={rows.length === 1}
            connectNulls={false}
          />
          <Line
            type="linear"
            dataKey="exports"
            stroke="var(--color-exports)"
            dot={rows.length === 1}
            connectNulls={false}
          />
          <Line
            type="linear"
            dataKey="views"
            stroke="var(--color-views)"
            dot={rows.length === 1}
            connectNulls={false}
          />
        </ComposedChart>
      </ChartContainer>
      <details className="border-t pt-3">
        <summary className="cursor-pointer text-sm">{t("weeklyTable")}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[38rem] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2" scope="col">
                  {t("week")}
                </th>
                {["starts", "exports", "views", "coverage"].map((key) => (
                  <th key={key} className="px-3 py-2 text-right" scope="col">
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.week} className="border-b last:border-0">
                  <th className="py-2 text-left font-normal" scope="row">
                    {row.label}
                  </th>
                  {[row.started, row.exports, row.views].map((value, index) => (
                    <td
                      key={index}
                      className="px-3 py-2 text-right tabular-nums"
                    >
                      {row.observed ? number(value) : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {t(
                      !row.observed
                        ? "unavailable"
                        : row.complete
                          ? "complete"
                          : "partial"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function JourneyDropoff({
  analysis,
}: {
  analysis: ProductActivityAnalysis;
}) {
  const { t, number, rate, date } = useAnalysisFormat();
  const journey = analysis.journey;
  const stages = [
    { key: "startToEdit", from: journey.started, to: journey.edited },
    { key: "editToResult", from: journey.edited, to: journey.valuable },
  ];
  return (
    <div className="space-y-4">
      <MetricDetails>{t("journeyNote")}</MetricDetails>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b text-left">
              {["step", "continued", "notContinued", "dropoff"].map((key) => (
                <th key={key} scope="col" className="px-3 py-2 first:pl-0">
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr className="border-b last:border-0" key={stage.key}>
                <th scope="row" className="py-3 text-left font-medium">
                  {t(stage.key)}
                </th>
                <td className="px-3 py-3">
                  {t("of", {
                    count: number(stage.to),
                    total: number(stage.from),
                  })}
                </td>
                <td className="px-3 py-3">{number(stage.from - stage.to)}</td>
                <td className="px-3 py-3">
                  {rate(stage.from - stage.to, stage.from)}
                  {stage.from > 0 && stage.from < 30 ? (
                    <p className="text-muted-foreground text-xs">
                      {t("limited")}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="border-t pt-3">
        <summary className="cursor-pointer text-sm">
          {t("weeklyJourney")}
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[38rem] text-sm">
            <thead>
              <tr className="border-b text-left">
                {["week", "starts", "edited", "result", "conversion"].map(
                  (key) => (
                    <th scope="col" key={key} className="px-3 py-2 first:pl-0">
                      {t(key)}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {analysis.weeks
                .filter((row) => row.started > 0)
                .map((row) => (
                  <tr className="border-b last:border-0" key={row.week}>
                    <th scope="row" className="py-2 text-left font-normal">
                      {date(row.from)} – {date(row.to)}
                    </th>
                    <td className="px-3">{number(row.started)}</td>
                    <td className="px-3">{number(row.edited)}</td>
                    <td className="px-3">{number(row.valuable)}</td>
                    <td className="px-3">
                      {rate(row.valuable, row.started)}
                      {row.started < 30 ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {t("limited")}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function TimeToResult({
  analysis,
}: {
  analysis: ProductActivityAnalysis;
}) {
  const { t, number, duration } = useAnalysisFormat();
  const timing = analysis.timeToResult;
  return (
    <div className="space-y-4">
      <MetricDetails>{t("timingNote")}</MetricDetails>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-xs">{t("median")}</dt>
          <dd className="mt-1 text-xl font-semibold">
            {duration(timing.medianSeconds)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t("p75")}</dt>
          <dd className="mt-1 text-xl font-semibold">
            {duration(timing.p75Seconds)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">
            {t("completedSessions")}
          </dt>
          <dd className="mt-1 text-xl font-semibold">
            {number(timing.samples)}
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground text-xs">
        {t("withoutResult", {
          count: number(analysis.journey.started - timing.samples),
        })}
      </p>
      {timing.samples === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noResults")}</p>
      ) : timing.samples < 30 ? (
        <p className="text-muted-foreground text-xs">{t("limited")}</p>
      ) : null}
    </div>
  );
}

export function ExportReliability({
  analysis,
}: {
  analysis: ProductActivityAnalysis;
}) {
  const { t, number, rate } = useAnalysisFormat();
  const formats = useTranslations(
    "dashboard.metrics.explorer.operations.formats"
  );
  return (
    <div className="space-y-4">
      {analysis.exportReliability.length > 0 ? (
        <MetricDetails>{t("exportNote")}</MetricDetails>
      ) : null}
      {analysis.exportReliability.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[35rem] text-sm">
            <thead>
              <tr className="border-b text-left">
                {["format", "successes", "failures", "failureRate"].map(
                  (key) => (
                    <th scope="col" key={key} className="px-3 py-2 first:pl-0">
                      {t(key)}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {analysis.exportReliability.map((row) => (
                <tr
                  key={`${row.legacy}:${row.format}`}
                  className="border-b last:border-0"
                >
                  <th scope="row" className="py-3 text-left font-medium">
                    {row.legacy
                      ? t("legacy")
                      : formats.has(row.format)
                        ? formats(row.format)
                        : t("unknownFormat")}
                  </th>
                  <td className="px-3 tabular-nums">{number(row.successes)}</td>
                  <td className="px-3 tabular-nums">{number(row.failures)}</td>
                  <td className="px-3 py-3 tabular-nums">
                    {row.failureRate === null
                      ? "—"
                      : rate(row.failures, row.successes + row.failures)}
                    {row.failureRate !== null &&
                    row.successes + row.failures < 30 ? (
                      <p className="text-muted-foreground text-xs">
                        {t("limited")}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
