import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  CircleHelp,
  Clock3,
  Eye,
  Gauge,
  ImageOff,
  KeyRound,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  Upload,
  Users,
} from "lucide-react";
import { productMetricValue } from "@/lib/dashboard-cockpit";
import type {
  DailyCockpitData,
  DailyCockpitHeadlineMetric,
} from "@/lib/server/dashboard-cockpit";
import { cn } from "@/lib/utils";

const METRIC_IDS = ["MTR-001", "MTR-004", "MTR-005", "MTR-006"] as const;

const METRIC_WINDOWS: Record<(typeof METRIC_IDS)[number], number> = {
  "MTR-001": 7,
  "MTR-004": 7,
  "MTR-005": 30,
  "MTR-006": 7,
};

const METRIC_ICONS: Record<(typeof METRIC_IDS)[number], LucideIcon> = {
  "MTR-001": Users,
  "MTR-004": Activity,
  "MTR-005": RefreshCcw,
  "MTR-006": Eye,
};

const METRIC_DRILLDOWNS: Record<(typeof METRIC_IDS)[number], string> = {
  "MTR-001": "/dashboard/metrics#creators",
  "MTR-004": "/dashboard/metrics#creation",
  "MTR-005": "/dashboard/metrics#creators",
  "MTR-006": "/dashboard/metrics#distribution",
};

function formatValue(
  valueKind: "count" | "rate",
  value: number | null,
  number: Intl.NumberFormat,
  percent: Intl.NumberFormat
) {
  if (value === null) return null;
  return valueKind === "rate" ? percent.format(value) : number.format(value);
}

function metricWarningLabel(
  metricId: string,
  dimension: string,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  if (metricId !== "MTR-010") return t(`kpis.${metricId}.label`);
  const operation = dimension.split(":", 1)[0];
  if (operation === "export") return t("operations.failures.exportLabel");
  if (operation === "gallery_publish") {
    return t("operations.failures.publicationLabel");
  }
  return t("warning.operationFallback");
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * 200,
    36 - ((value - min) / range) * 30,
  ]);
  const line = points
    .map(
      ([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      className="mt-2 block h-9 w-full"
      aria-hidden="true"
    >
      <path
        d={`${line} L200 40 L0 40 Z`}
        fill="var(--chart-1)"
        opacity={0.12}
      />
      <path
        d={line}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MetricCell({
  id,
  metric,
  number,
  percent,
  date,
  t,
  isLast,
}: {
  id: (typeof METRIC_IDS)[number];
  metric: DailyCockpitHeadlineMetric | null;
  number: Intl.NumberFormat;
  percent: Intl.NumberFormat;
  date: Intl.DateTimeFormat;
  t: Awaited<ReturnType<typeof getTranslations>>;
  isLast: boolean;
}) {
  const Icon = METRIC_ICONS[id];
  const currentDisplay = metric
    ? formatValue(
        metric.valueKind,
        productMetricValue(metric.current),
        number,
        percent
      )
    : null;
  const previousDisplay = metric
    ? formatValue(
        metric.valueKind,
        productMetricValue(metric.previous),
        number,
        percent
      )
    : null;
  const liveDisplay = metric
    ? formatValue(
        metric.valueKind,
        productMetricValue(metric.live),
        number,
        percent
      )
    : null;
  const measuredSince = metric?.measuredSince
    ? date.format(new Date(`${metric.measuredSince}T00:00:00.000Z`))
    : null;
  const stateLabel = !metric
    ? t("quality.unavailable")
    : currentDisplay
      ? currentDisplay
      : metric.quality === "invalid" || metric.quality === "degraded"
        ? t(`quality.${metric.quality}`)
        : t("kpis.collecting");

  return (
    <Link
      href={metric?.drilldown ?? METRIC_DRILLDOWNS[id]}
      prefetch={false}
      className={cn(
        "hover:bg-muted/35 focus-visible:ring-ring group flex min-w-0 flex-col gap-1 border-b p-4 transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none sm:border-r xl:border-b-0",
        isLast && "border-b-0 sm:border-r-0"
      )}
      aria-label={t("kpis.openDrilldown", { metric: t(`kpis.${id}.label`) })}
    >
      <span className="flex items-start justify-between gap-2 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <Icon
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
          {t(`kpis.${id}.label`)}
        </span>
        <ArrowRight
          className="text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
      <span className="text-2xl leading-tight font-semibold tabular-nums">
        {stateLabel}
      </span>
      {metric?.current?.denominator != null ? (
        <span className="text-muted-foreground block text-xs tabular-nums">
          {t("kpis.rateCounts", {
            numerator: number.format(metric.current.numerator),
            denominator: number.format(metric.current.denominator),
          })}
        </span>
      ) : null}
      {metric?.comparisonReady && previousDisplay ? (
        <span className="text-muted-foreground block text-xs">
          {t("kpis.previousCompact", { value: previousDisplay })}
          {liveDisplay
            ? ` · ${t("kpis.liveCompact", { value: liveDisplay })}`
            : ""}
        </span>
      ) : null}
      <span className="text-muted-foreground block text-xs">
        {measuredSince
          ? t("kpis.windowSince", {
              window: METRIC_WINDOWS[id],
              date: measuredSince,
            })
          : t("kpis.window", { window: METRIC_WINDOWS[id] })}
      </span>
      <Sparkline values={metric?.trend ?? []} />
    </Link>
  );
}

export default async function DailyCockpit({
  data,
}: {
  data: DailyCockpitData | null;
}) {
  const t = await getTranslations("dashboard.cockpit");
  const locale = await getLocale();
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Amsterdam",
    dateStyle: "medium",
  });
  const warningMetric = data?.warning
    ? data.headlines.find((metric) => metric.id === data.warning?.metricId)
    : null;
  const warningValueKind = warningMetric?.valueKind ?? "rate";
  const operations = data
    ? [
        {
          key: "previews",
          icon: ImageOff,
          count: data.operations.missingGalleryPreviews,
          available: true,
          actionable: true,
          detail: t("operations.previews.detail"),
          href: "/dashboard/gallery",
          action: t("operations.previews.action"),
        },
        {
          key: "rateLimits",
          icon: Gauge,
          count: data.operations.apiKeysNearLimit,
          available: true,
          actionable: true,
          detail: t("operations.rateLimits.detail"),
          href: "/dashboard/api-keys",
          action: t("operations.rateLimits.action"),
        },
        {
          key: "removals",
          icon: Clock3,
          count: data.operations.upcomingAccountRemovals,
          available: true,
          actionable: true,
          detail: t("operations.removals.detail"),
          href: "/dashboard/users",
          action: t("operations.removals.action"),
        },
        {
          key: "failures",
          icon: Upload,
          count:
            data.operations.exportFailures +
            data.operations.publicationFailures,
          available: data.operations.availability.failures,
          actionable: data.warning?.metricId === "MTR-010",
          detail: t("operations.failures.detail", {
            export: number.format(data.operations.exportFailures),
            publication: number.format(data.operations.publicationFailures),
          }),
          href: "/dashboard/metrics#operations",
          action: t("operations.failures.action"),
        },
        {
          key: "apiKeys",
          icon: KeyRound,
          count: data.operations.unusedApiKeys + data.operations.expiredApiKeys,
          available: true,
          actionable: true,
          detail: t("operations.apiKeys.detail", {
            unused: number.format(data.operations.unusedApiKeys),
            expired: number.format(data.operations.expiredApiKeys),
          }),
          href: "/dashboard/api-keys",
          action: t("operations.apiKeys.action"),
        },
        {
          key: "pipeline",
          icon: RefreshCcw,
          count: data.operations.analyticsPipelineGaps,
          available: data.operations.availability.pipeline,
          actionable: true,
          detail: t("operations.pipeline.detail", {
            building: number.format(data.operations.buildingMetrics),
          }),
          href: "/dashboard/metrics#operations",
          action: t("operations.pipeline.action"),
        },
      ]
    : [];
  const actionableOperations = operations.filter(
    (operation) =>
      operation.available && operation.actionable && operation.count > 0
  );
  const clearOperationCount = operations.filter(
    (operation) => operation.available && operation.count === 0
  ).length;
  const unavailableOperationCount = data
    ? operations.filter((operation) => !operation.available).length
    : operations.length || 6;
  const separateProductWarning = Boolean(
    data?.warning && data.warning.metricId !== "MTR-010"
  );
  const attentionCount =
    actionableOperations.length + (separateProductWarning ? 1 : 0);
  const buildingMetricCount =
    data?.headlines.filter(
      (metric) =>
        metric.quality === "not_started" || metric.quality === "building"
    ).length ?? METRIC_IDS.length;

  const checkSummary = (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {clearOperationCount > 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck
            className="size-4 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          {t("operations.confirmedClear", { count: clearOperationCount })}
        </span>
      ) : null}
      {unavailableOperationCount > 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <CircleHelp className="size-4" aria-hidden="true" />
          {t("operations.notMeasured", { count: unavailableOperationCount })}
        </span>
      ) : null}
    </p>
  );

  return (
    <div className="space-y-6">
      {attentionCount > 0 ? (
        <section
          aria-labelledby="cockpit-operations"
          className="bg-card overflow-hidden rounded-lg border"
        >
          <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2
                id="cockpit-operations"
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"
              >
                <TriangleAlert className="size-4" aria-hidden="true" />
                {t("operations.title")}
              </h2>
              <span className="text-sm font-medium">
                {t("today.actions", { count: attentionCount })}
              </span>
            </div>
            {checkSummary}
          </div>
          <ul className="divide-y">
            {data?.warning ? (
              <li className="flex gap-3 px-4 py-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <TriangleAlert className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t("warning.title")}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                    {t("warning.detail", {
                      metric: metricWarningLabel(
                        data.warning.metricId,
                        data.warning.dimension,
                        t
                      ),
                      current:
                        formatValue(
                          warningValueKind,
                          data.warning.currentValue,
                          number,
                          percent
                        ) ?? t("notAvailable"),
                      baseline:
                        formatValue(
                          warningValueKind,
                          data.warning.historicalMedian,
                          number,
                          percent
                        ) ?? t("notAvailable"),
                    })}
                  </p>
                </div>
              </li>
            ) : null}
            {actionableOperations.map((operation) => {
              const Icon = operation.icon;
              return (
                <li key={operation.key}>
                  <Link
                    href={operation.href}
                    prefetch={false}
                    className="hover:bg-muted/35 focus-visible:ring-ring group flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">
                          {t(`operations.${operation.key}.label`)}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {number.format(operation.count)}
                        </span>
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-sm leading-relaxed">
                        {operation.detail}
                      </span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1 text-sm font-medium sm:inline-flex">
                      {operation.action}
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section
          aria-label={t("today.title")}
          className="bg-card flex flex-col gap-3 rounded-lg border px-4 py-3.5 sm:flex-row sm:items-center"
        >
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
              data
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            {data ? (
              <ShieldCheck className="size-4" aria-hidden="true" />
            ) : (
              <CircleHelp className="size-4" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {data ? t("today.noActions") : t("operations.unavailable")}
            </p>
            {data ? null : (
              <p className="text-muted-foreground text-sm">
                {t("operations.unavailableDetail")}
              </p>
            )}
          </div>
          {checkSummary}
        </section>
      )}

      <section aria-labelledby="cockpit-headlines" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="cockpit-headlines" className="text-base font-semibold">
              {t("headlines.title")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("headlines.description")}
            </p>
          </div>
          <Link
            href="/dashboard/metrics"
            prefetch={false}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring hidden min-h-11 shrink-0 items-center gap-1 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:inline-flex"
          >
            {t("headlines.viewAnalytics")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="bg-card grid min-w-0 grid-cols-1 overflow-hidden rounded-lg border sm:grid-cols-2 xl:grid-cols-4">
          {METRIC_IDS.map((id, index) => (
            <MetricCell
              key={id}
              id={id}
              metric={
                data?.headlines.find((metric) => metric.id === id) ?? null
              }
              number={number}
              percent={percent}
              date={date}
              t={t}
              isLast={index === METRIC_IDS.length - 1}
            />
          ))}
        </div>
        {buildingMetricCount > 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("headlines.collecting", { count: buildingMetricCount })}
          </p>
        ) : null}
      </section>
    </div>
  );
}
