"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import MetricsTooltipCard from "@/components/dashboard/MetricsTooltipCard";
import {
  isoWeekNumber,
  MetricsEmpty,
  MetricsInlineBar,
  MetricsLegend,
  MetricsStackedBar,
  MetricsSwatch,
  metricsTableClassNames as tableClass,
} from "@/components/dashboard/MetricsVisuals";
import {
  TIME_TO_RESULT_BUCKETS,
  type ProductActivityAnalysis,
} from "@/lib/metrics-analysis";
import type { MetricsExplorerMetric } from "@/lib/metrics-explorer";
import type {
  AdminMetrics,
  ContentGrowthPoint,
  ProductUsageMetrics,
} from "@/lib/server/metrics";
import { cn } from "@/lib/utils";

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };
const tooltipCursor = { strokeDasharray: "3 3", stroke: "var(--border)" };
const barCursor = { fill: "var(--muted)", opacity: 0.5 };

function useVisualFormats() {
  const locale = useLocale();
  const t = useTranslations("dashboard.metrics.visuals");
  return useMemo(() => {
    const number = new Intl.NumberFormat(locale);
    const compact = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    });
    const percent = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 0,
    });
    const precisePercent = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    });
    const day = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    return {
      t,
      locale,
      number: (value: number) => number.format(value),
      compact: (value: number) => compact.format(value),
      percent: (value: number) => percent.format(value),
      precisePercent: (value: number) => precisePercent.format(value),
      day: (key: string) => day.format(new Date(`${key}T00:00:00Z`)),
    };
  }, [locale, t]);
}

export function JourneyFunnel({
  analysis,
}: {
  analysis: ProductActivityAnalysis;
}) {
  const { t, number, percent } = useVisualFormats();
  const { journey } = analysis;
  if (journey.started === 0) {
    return <MetricsEmpty>{t("empty")}</MetricsEmpty>;
  }
  const steps = [
    { key: "started", value: journey.started },
    { key: "edited", value: journey.edited },
    { key: "valuable", value: journey.valuable },
  ] as const;
  const drops = steps.slice(1).map((step, index) => {
    const previous = steps[index].value;
    return previous ? (previous - step.value) / previous : 0;
  });
  const largest = drops.indexOf(Math.max(...drops));

  return (
    <div className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_64px] items-center gap-x-3 gap-y-2 text-sm">
      {steps.map((step, index) => (
        <Fragment key={step.key}>
          {index > 0 ? (
            <>
              <span aria-hidden="true" />
              <span
                className={cn(
                  "text-xs",
                  index - 1 === largest && drops[index - 1] > 0
                    ? "font-medium text-rose-700 dark:text-rose-300"
                    : "text-muted-foreground"
                )}
              >
                {t(
                  index - 1 === largest && drops[index - 1] > 0
                    ? "journey.largestDrop"
                    : "journey.drop",
                  { rate: percent(drops[index - 1]) }
                )}
              </span>
              <span aria-hidden="true" />
            </>
          ) : null}
          <span className="min-w-0">{t(`journey.steps.${step.key}`)}</span>
          <span
            role="img"
            aria-label={`${t(`journey.steps.${step.key}`)}: ${number(step.value)}`}
            className="h-7 rounded-md bg-[var(--chart-1)]"
            style={{
              width: `${Math.max(2, (step.value / journey.started) * 100)}%`,
            }}
          />
          <span className="text-right tabular-nums">{number(step.value)}</span>
        </Fragment>
      ))}
    </div>
  );
}

export function TimeToResultHistogram({
  analysis,
}: {
  analysis: ProductActivityAnalysis;
}) {
  const { t, number } = useVisualFormats();
  const { buckets, medianSeconds, samples } = analysis.timeToResult;
  if (samples === 0) {
    return <MetricsEmpty>{t("timing.empty")}</MetricsEmpty>;
  }
  const data = TIME_TO_RESULT_BUCKETS.map((_, index) => ({
    key: `b${index}`,
    label: t(`timing.buckets.b${index}`),
    sessions: buckets[index] ?? 0,
  }));
  const medianBucket =
    medianSeconds === null
      ? null
      : TIME_TO_RESULT_BUCKETS.findIndex(
          (bound) => bound === null || medianSeconds < bound
        );
  const config = {
    sessions: { label: t("timing.sessions"), color: "var(--chart-4)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          allowDecimals={false}
          width={36}
        />
        <ChartTooltip
          cursor={barCursor}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as
              (typeof data)[number] | undefined;
            if (!active || !row) return null;
            return (
              <MetricsTooltipCard
                label={row.label}
                rows={[
                  {
                    key: "sessions",
                    label: config.sessions.label,
                    value: number(row.sessions),
                  },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="sessions" fill="var(--color-sessions)" radius={3}>
          <LabelList
            dataKey="sessions"
            position="top"
            className="fill-muted-foreground"
            fontSize={12}
          />
        </Bar>
        {medianBucket !== null && medianBucket >= 0 ? (
          <ReferenceLine
            x={data[medianBucket].label}
            stroke="var(--foreground)"
            strokeDasharray="4 3"
            label={{
              value: t("timing.median"),
              position: "insideTopRight",
              fontSize: 12,
              fill: "var(--foreground)",
            }}
          />
        ) : null}
      </BarChart>
    </ChartContainer>
  );
}

export function EditorSplit({ usage }: { usage: ProductUsageMetrics }) {
  const { t, number, percent, locale } = useVisualFormats();
  const total = usage.anonymousSessions + usage.accountSessions;
  if (total === 0) {
    return <MetricsEmpty>{t("editor.empty")}</MetricsEmpty>;
  }
  const segments = [
    {
      key: "anonymous",
      value: usage.anonymousSessions,
      color: "var(--muted-foreground)",
      muted: true,
    },
    {
      key: "account",
      value: usage.accountSessions,
      color: "var(--chart-1)",
    },
  ];
  const rate = (funnel: { started: number; valuable: number }) =>
    funnel.started ? funnel.valuable / funnel.started : 0;
  const anonymousRate = rate(usage.creatorFunnel.anonymous);
  const accountRate = rate(usage.creatorFunnel.account);
  const ratio = anonymousRate > 0 ? accountRate / anonymousRate : null;

  return (
    <div className="flex flex-col gap-3.5">
      <MetricsStackedBar
        label={segments
          .map(
            (segment) =>
              `${t(`editor.${segment.key}`)} ${percent(segment.value / total)}`
          )
          .join(", ")}
        segments={segments}
      />
      <div className="grid grid-cols-2 gap-3">
        {segments.map((segment) => (
          <div key={segment.key}>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <MetricsSwatch
                color={segment.color}
                className={segment.muted ? "opacity-45" : undefined}
              />
              {t(`editor.${segment.key}`)}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {number(segment.value)}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                {percent(segment.value / total)}
              </span>
            </p>
          </div>
        ))}
      </div>
      {ratio !== null && Number.isFinite(ratio) && ratio > 0 ? (
        <p className="text-sm leading-5">
          {t(
            ratio >= 1
              ? "editor.accountMoreLikely"
              : "editor.accountLessLikely",
            {
              ratio: new Intl.NumberFormat(locale, {
                maximumFractionDigits: 1,
              }).format(ratio >= 1 ? ratio : 1 / ratio),
            }
          )}
        </p>
      ) : null}
    </div>
  );
}

const FAILURE_RATE_SCALE = 0.05;
const FAILURE_RATE_WARNING = 0.02;

export function ExportFormatTable({
  analysis,
}: {
  analysis: ProductActivityAnalysis;
}) {
  const { t, number, precisePercent } = useVisualFormats();
  const formats = useTranslations(
    "dashboard.metrics.explorer.operations.formats"
  );
  if (analysis.exportReliability.length === 0) {
    return <MetricsEmpty>{t("empty")}</MetricsEmpty>;
  }
  const label = (row: ProductActivityAnalysis["exportReliability"][number]) =>
    row.legacy
      ? t("exports.legacy")
      : formats.has(row.format)
        ? formats(row.format)
        : t("exports.unknownFormat");
  const rows = [...analysis.exportReliability].sort(
    (left, right) =>
      Number(left.failureRate === null) - Number(right.failureRate === null) ||
      right.successes - left.successes
  );

  return (
    <div className="overflow-x-auto">
      <table className={cn(tableClass.table, "min-w-[480px]")}>
        <thead>
          <tr className={tableClass.headRow}>
            <th scope="col" className={tableClass.head}>
              {t("exports.format")}
            </th>
            <th scope="col" className={cn(tableClass.head, "text-right")}>
              {t("exports.completed")}
            </th>
            <th scope="col" className={cn(tableClass.head, "text-right")}>
              {t("exports.failed")}
            </th>
            <th scope="col" className={cn(tableClass.head, "w-[34%]")}>
              {t("exports.failureRate")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const warning =
              row.failureRate !== null &&
              row.failureRate >= FAILURE_RATE_WARNING;
            return (
              <tr
                key={`${row.legacy}:${row.format}`}
                className={tableClass.row}
              >
                <td className={cn(tableClass.cell, "font-medium")}>
                  {label(row)}
                </td>
                <td className={cn(tableClass.cell, "text-right tabular-nums")}>
                  {number(row.successes)}
                </td>
                <td
                  className={cn(
                    tableClass.cell,
                    "text-right tabular-nums",
                    warning && "font-medium text-amber-700 dark:text-amber-300"
                  )}
                >
                  {number(row.failures)}
                </td>
                <td className={tableClass.cell}>
                  {row.failureRate === null ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    <MetricsInlineBar
                      ratio={row.failureRate / FAILURE_RATE_SCALE}
                      value={precisePercent(row.failureRate)}
                      color={warning ? "#f59e0b" : "var(--chart-2)"}
                      valueClassName={
                        warning
                          ? "font-medium text-amber-700 dark:text-amber-300"
                          : undefined
                      }
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function WeeklyViewsChart({
  analysis,
  split = false,
}: {
  analysis: ProductActivityAnalysis;
  split?: boolean;
}) {
  const { t, number, compact, day } = useVisualFormats();
  const data = analysis.weeks.map((row) => ({
    week: row.week,
    label: t("weekShort", { week: isoWeekNumber(row.week) }),
    range: `${day(row.from)} – ${day(row.to)}`,
    views: row.views,
    share: Math.max(0, row.views - row.embedViews),
    embed: row.embedViews,
  }));
  if (data.every((row) => row.views === 0)) {
    return <MetricsEmpty>{t("views.empty")}</MetricsEmpty>;
  }
  const config = {
    views: { label: t("views.total"), color: "var(--chart-4)" },
    share: { label: t("views.share"), color: "var(--chart-1)" },
    embed: { label: t("views.embed"), color: "var(--chart-4)" },
  } satisfies ChartConfig;
  const keys = split ? (["share", "embed"] as const) : (["views"] as const);

  return (
    <div>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            allowDecimals={false}
            tickFormatter={compact}
            width={40}
          />
          <ChartTooltip
            cursor={barCursor}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as
                (typeof data)[number] | undefined;
              if (!active || !row) return null;
              return (
                <MetricsTooltipCard
                  label={row.range}
                  rows={keys.map((key) => ({
                    key,
                    label: config[key].label,
                    value: number(row[key]),
                  }))}
                />
              );
            }}
          />
          {keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="views"
              fill={`var(--color-${key})`}
              radius={
                split ? (index === keys.length - 1 ? [2, 2, 0, 0] : 0) : 3
              }
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ChartContainer>
      {split ? (
        <MetricsLegend
          items={keys.map((key) => ({
            key,
            label: config[key].label,
            color: config[key].color,
          }))}
        />
      ) : null}
    </div>
  );
}

export function RetentionTrend({ metric }: { metric: MetricsExplorerMetric }) {
  const { t, percent, day } = useVisualFormats();
  const data = metric.rows
    .filter((row) => row.value !== null)
    .map((row) => ({
      day: row.day,
      label: t("weekShort", { week: isoWeekNumber(row.day) }),
      range: t("retentionTrend.cohort", { date: day(row.day) }),
      rate: row.value ?? 0,
    }));
  if (data.length === 0) {
    return <MetricsEmpty>{t("retentionTrend.empty")}</MetricsEmpty>;
  }
  const config = {
    rate: { label: t("retentionTrend.rate"), color: "var(--chart-5)" },
  } satisfies ChartConfig;
  const last = data[data.length - 1];

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          minTickGap={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          tickFormatter={percent}
          domain={[0, "auto"]}
          width={44}
        />
        <ChartTooltip
          cursor={tooltipCursor}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as
              (typeof data)[number] | undefined;
            if (!active || !row) return null;
            return (
              <MetricsTooltipCard
                label={row.range}
                rows={[
                  {
                    key: "rate",
                    label: config.rate.label,
                    value: percent(row.rate),
                  },
                ]}
              />
            );
          }}
        />
        <Area
          type="linear"
          dataKey="rate"
          stroke="none"
          fill="var(--color-rate)"
          fillOpacity={0.12}
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="rate"
          stroke="var(--color-rate)"
          strokeWidth={2.5}
          dot={(props: {
            cx?: number;
            cy?: number;
            payload?: { day: string };
          }) =>
            props.payload?.day === last.day ? (
              <circle
                key="last"
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill="var(--color-rate)"
              />
            ) : (
              <g key={props.payload?.day} />
            )
          }
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

export function ContentTrend({ points }: { points: ContentGrowthPoint[] }) {
  const { t, number, locale } = useVisualFormats();
  const month = new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const data = points.map((row) => ({
    ...row,
    label: month.format(new Date(`${row.period}-01T00:00:00Z`)),
  }));
  if (data.length === 0) {
    return <MetricsEmpty>{t("content.empty")}</MetricsEmpty>;
  }
  const config = {
    projects: { label: t("content.projects"), color: "var(--chart-1)" },
    shares: { label: t("content.shares"), color: "var(--chart-4)" },
    presets: { label: t("content.presets"), color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const keys = ["projects", "shares", "presets"] as const;

  return (
    <div>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            allowDecimals={false}
            width={36}
          />
          <ChartTooltip
            cursor={tooltipCursor}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as
                (typeof data)[number] | undefined;
              if (!active || !row) return null;
              return (
                <MetricsTooltipCard
                  label={row.label}
                  rows={keys.map((key) => ({
                    key,
                    label: config[key].label,
                    value: number(row[key]),
                  }))}
                />
              );
            }}
          />
          {keys.map((key) => (
            <Line
              key={key}
              type="linear"
              dataKey={key}
              stroke={`var(--color-${key})`}
              strokeWidth={2.5}
              dot={data.length === 1}
            />
          ))}
        </ComposedChart>
      </ChartContainer>
      <MetricsLegend
        items={keys.map((key) => ({
          key,
          label: config[key].label,
          color: config[key].color,
        }))}
      />
    </div>
  );
}

export function SharingHealthGrid({
  shares,
  gallery,
}: {
  shares: AdminMetrics["shares"];
  gallery: AdminMetrics["gallery"];
}) {
  const { t, number } = useVisualFormats();
  const cells = [
    {
      key: "activeShares",
      value: shares.totalActive,
      href: "/dashboard/shares",
      warn: false,
    },
    {
      key: "expiredShares",
      value: shares.expired,
      href: "/dashboard/shares",
      warn: shares.expired > 0,
    },
    {
      key: "revokedShares",
      value: shares.revoked,
      href: "/dashboard/shares",
      warn: false,
    },
    {
      key: "missingPreview",
      value: gallery.missingPreview,
      href: "/dashboard/gallery",
      warn: gallery.missingPreview > 0,
    },
  ];
  return (
    <div className="grid grid-cols-2">
      {cells.map((cell, index) => (
        <Link
          key={cell.key}
          href={cell.href}
          className={cn(
            "hover:bg-muted/40 focus-visible:ring-ring px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
            index % 2 === 0 && "border-r",
            index < 2 && "border-b"
          )}
        >
          <p
            className={cn(
              "text-xl font-semibold tabular-nums",
              cell.warn && "text-amber-700 dark:text-amber-300"
            )}
          >
            {number(cell.value)}
          </p>
          <p className="text-muted-foreground text-xs">
            {t(`health.${cell.key}`)}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function EmbedSitesTable({ usage }: { usage: ProductUsageMetrics }) {
  const { t, number } = useVisualFormats();
  if (usage.embedReferrers.length === 0) {
    return <MetricsEmpty>{t("embeds.empty")}</MetricsEmpty>;
  }
  const embedViews =
    usage.shareSurfaces.find((row) => row.surface === "embed")?.count ?? 0;
  const remainder = Math.max(0, embedViews - usage.embedReferrerSummary.views);

  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label={t("embeds.label")}
    >
      <table className={cn(tableClass.table, "min-w-[360px]")}>
        <thead>
          <tr className={tableClass.headRow}>
            <th scope="col" className={cn(tableClass.head, "h-9 py-1.5")}>
              {t("embeds.website")}
            </th>
            <th scope="col" className={cn(tableClass.head, "h-9 py-1.5")}>
              {t("embeds.track")}
            </th>
            <th
              scope="col"
              className={cn(tableClass.head, "h-9 py-1.5 text-right")}
            >
              {t("embeds.views")}
            </th>
          </tr>
        </thead>
        <tbody>
          {usage.embedReferrers.map((referrer) => (
            <tr
              key={`${referrer.shareToken}:${referrer.hostname}`}
              className={tableClass.row}
            >
              <td className={cn(tableClass.cell, "py-2.5 font-mono text-xs")}>
                {referrer.hostname}
              </td>
              <td className={cn(tableClass.cell, "py-2.5")}>
                <Link
                  href={`/share/${referrer.shareToken}`}
                  className="hover:underline hover:underline-offset-4"
                >
                  {referrer.shareTitle}
                </Link>
              </td>
              <td
                className={cn(
                  tableClass.cell,
                  "py-2.5 text-right tabular-nums"
                )}
              >
                {number(referrer.views)}
              </td>
            </tr>
          ))}
          {remainder > 0 ? (
            <tr className={tableClass.row}>
              <td
                colSpan={2}
                className={cn(
                  tableClass.cell,
                  "text-muted-foreground py-2.5 text-xs"
                )}
              >
                {t("embeds.belowThreshold")}
              </td>
              <td
                className={cn(
                  tableClass.cell,
                  "text-muted-foreground py-2.5 text-right tabular-nums"
                )}
              >
                {number(remainder)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
