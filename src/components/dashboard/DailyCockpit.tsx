import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CircleHelp,
  Eye,
  ImageOff,
  Info,
  KeyRound,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  Upload,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { productMetricValue } from "@/lib/dashboard-cockpit";
import type {
  DailyCockpitData,
  DailyCockpitHeadlineMetric,
} from "@/lib/server/dashboard-cockpit";

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
  "MTR-001": "/dashboard/metrics#product-use",
  "MTR-004": "/dashboard/metrics#product-use",
  "MTR-005": "/dashboard/metrics#journey",
  "MTR-006": "/dashboard/metrics#product-use",
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

function MetricCell({
  id,
  metric,
  number,
  percent,
  date,
  t,
  index,
}: {
  id: (typeof METRIC_IDS)[number];
  metric: DailyCockpitHeadlineMetric | null;
  number: Intl.NumberFormat;
  percent: Intl.NumberFormat;
  date: Intl.DateTimeFormat;
  t: Awaited<ReturnType<typeof getTranslations>>;
  index: number;
}) {
  const Icon = METRIC_ICONS[id];
  const isLastItem = index === METRIC_IDS.length - 1;
  const isDesktopBottomRow = index >= Math.ceil(METRIC_IDS.length / 2);
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
      className={`hover:bg-muted/35 focus-visible:ring-ring group flex min-h-28 min-w-0 gap-3 p-4 transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none ${!isLastItem ? "border-b" : ""} ${isDesktopBottomRow ? "sm:border-b-0" : ""} ${index % 2 === 0 ? "sm:border-r" : ""}`}
      aria-label={t("kpis.openDrilldown", { metric: t(`kpis.${id}.label`) })}
    >
      <span className="bg-muted text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm leading-snug font-medium">
            {t(`kpis.${id}.label`)}
          </span>
          <ArrowRight
            className="text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
        <span className="mt-1 block text-lg leading-tight font-semibold tabular-nums">
          {stateLabel}
        </span>
        {metric?.current?.denominator != null ? (
          <span className="text-muted-foreground mt-1 block text-xs tabular-nums">
            {t("kpis.rateCounts", {
              numerator: number.format(metric.current.numerator),
              denominator: number.format(metric.current.denominator),
            })}
          </span>
        ) : null}
        {metric?.comparisonReady && previousDisplay ? (
          <span className="text-muted-foreground mt-1 block text-xs">
            {t("kpis.previousCompact", { value: previousDisplay })}
            {liveDisplay
              ? ` · ${t("kpis.liveCompact", { value: liveDisplay })}`
              : ""}
          </span>
        ) : null}
        <span className="text-muted-foreground mt-2 block text-xs">
          {measuredSince
            ? t("kpis.windowSince", {
                window: METRIC_WINDOWS[id],
                date: measuredSince,
              })
            : t("kpis.window", { window: METRIC_WINDOWS[id] })}
        </span>
      </span>
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
          detail: t("operations.previews.detail"),
          href: "/dashboard/gallery",
          action: t("operations.previews.action"),
        },
        {
          key: "failures",
          icon: Upload,
          count:
            data.operations.exportFailures +
            data.operations.publicationFailures,
          available: data.operations.availability.failures,
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
          detail: t("operations.pipeline.detail", {
            building: number.format(data.operations.buildingMetrics),
          }),
          href: "/dashboard/metrics#operations",
          action: t("operations.pipeline.action"),
        },
      ]
    : [];
  const actionableOperations = operations.filter(
    (operation) => operation.available && operation.count > 0
  );
  const clearOperationCount = operations.filter(
    (operation) => operation.available && operation.count === 0
  ).length;
  const unavailableOperationCount = data
    ? operations.filter((operation) => !operation.available).length
    : 4;
  const primaryOperation = actionableOperations[0] ?? null;
  const buildingMetricCount =
    data?.headlines.filter(
      (metric) =>
        metric.quality === "not_started" || metric.quality === "building"
    ).length ?? METRIC_IDS.length;

  return (
    <section aria-labelledby="daily-status" className="space-y-5">
      <div className="flex min-h-11 flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:gap-4">
        <h2 id="daily-status" className="text-sm font-semibold sm:text-base">
          {t("today.title")}
        </h2>
        {primaryOperation ? (
          <Link
            href={primaryOperation.href}
            prefetch={false}
            className="focus-visible:ring-ring group inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-amber-700 focus-visible:ring-2 focus-visible:outline-none dark:text-amber-300"
          >
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            {t(`operations.${primaryOperation.key}.today`, {
              count: primaryOperation.count,
            })}
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ) : data ? (
          <span className="inline-flex min-h-11 items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {t("today.noActions")}
          </span>
        ) : (
          <span className="text-muted-foreground inline-flex min-h-11 items-center gap-2 text-sm">
            <CircleHelp className="size-4" aria-hidden="true" />
            {t("today.unavailable")}
          </span>
        )}
        {clearOperationCount > 0 ? (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm sm:before:mr-2 sm:before:content-['·']">
            <ShieldCheck
              className="size-4 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            {t("operations.confirmedClear", { count: clearOperationCount })}
          </span>
        ) : null}
        {unavailableOperationCount > 0 ? (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm sm:before:mr-2 sm:before:content-['·']">
            <CircleHelp className="size-4" aria-hidden="true" />
            {t("operations.notMeasured", {
              count: unavailableOperationCount,
            })}
          </span>
        ) : null}
      </div>

      <div className="grid min-w-0 border-b pb-5 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <section
          aria-labelledby="cockpit-headlines"
          className="min-w-0 lg:pr-6"
        >
          <div className="flex items-start justify-between gap-4">
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
          <div className="mt-4 grid min-w-0 grid-cols-1 border-y sm:grid-cols-2">
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
                index={index}
              />
            ))}
          </div>
          <div className="text-muted-foreground mt-3 flex items-start gap-2 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              {buildingMetricCount > 0
                ? t("headlines.collecting", { count: buildingMetricCount })
                : t("headlines.ready")}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="cockpit-operations"
          className="order-first mb-5 min-w-0 border-b pb-5 lg:order-none lg:mb-0 lg:border-b-0 lg:border-l lg:pb-0 lg:pl-6"
        >
          <h2 id="cockpit-operations" className="text-base font-semibold">
            {t("operations.title")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("operations.description")}
          </p>

          {data?.warning ? (
            <div className="mt-4 flex gap-3 border-b border-amber-500/25 pb-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <TriangleAlert className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("warning.title")}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
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
            </div>
          ) : null}

          <div className="mt-4 divide-y">
            {actionableOperations.length > 0 ? (
              actionableOperations.map((operation) => {
                const Icon = operation.icon;
                return (
                  <Link
                    key={operation.key}
                    href={operation.href}
                    prefetch={false}
                    className="focus-visible:ring-ring group flex min-h-11 items-start gap-3 py-3 first:pt-0 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold">
                          {t(`operations.${operation.key}.label`)}
                        </span>
                        <span className="text-lg font-semibold tabular-nums">
                          {number.format(operation.count)}
                        </span>
                      </span>
                      <span className="text-muted-foreground mt-1 block text-sm leading-relaxed">
                        {operation.detail}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
                        {operation.action}
                        <ArrowRight
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="flex items-start gap-3 py-3 first:pt-0">
                <span className="bg-muted text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-lg">
                  {data ? (
                    <ShieldCheck className="size-4" aria-hidden="true" />
                  ) : (
                    <CircleHelp className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {data
                      ? t("operations.allClear")
                      : t("operations.unavailable")}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {data
                      ? t("operations.clearDetail")
                      : t("operations.unavailableDetail")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
