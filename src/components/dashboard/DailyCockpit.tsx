import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Eye,
  ImageOff,
  KeyRound,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  Upload,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { productMetricValue } from "@/lib/dashboard-cockpit";
import type {
  DailyCockpitData,
  DailyCockpitHeadlineMetric,
} from "@/lib/server/dashboard-cockpit";

const METRIC_ICONS: Record<DailyCockpitHeadlineMetric["id"], LucideIcon> = {
  "MTR-001": Users,
  "MTR-004": Activity,
  "MTR-005": RefreshCcw,
  "MTR-006": Eye,
};

function formatValue(
  metric: Pick<DailyCockpitHeadlineMetric, "valueKind">,
  value: number | null,
  number: Intl.NumberFormat,
  percent: Intl.NumberFormat
) {
  if (value === null) return "—";
  return metric.valueKind === "rate"
    ? percent.format(value)
    : number.format(value);
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

function HeadlineCard({
  metric,
  number,
  percent,
  date,
  t,
}: {
  metric: DailyCockpitHeadlineMetric;
  number: Intl.NumberFormat;
  percent: Intl.NumberFormat;
  date: Intl.DateTimeFormat;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const Icon = METRIC_ICONS[metric.id];
  const currentValue = productMetricValue(metric.current);
  const previousValue = productMetricValue(metric.previous);
  const liveValue = productMetricValue(metric.live);
  const currentDisplay = formatValue(metric, currentValue, number, percent);
  const previousDisplay = formatValue(metric, previousValue, number, percent);
  const liveDisplay = formatValue(metric, liveValue, number, percent);
  const measuredSince = metric.measuredSince
    ? date.format(new Date(`${metric.measuredSince}T00:00:00.000Z`))
    : t("notAvailable");

  return (
    <Link
      href={metric.drilldown}
      prefetch={false}
      className="hover:bg-muted/40 focus-visible:ring-ring group flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      aria-label={t("kpis.openDrilldown", {
        metric: t(`kpis.${metric.id}.label`),
      })}
    >
      <span className="bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-xs font-medium">
            {t(`kpis.${metric.id}.label`)}
          </p>
          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium tracking-wide uppercase">
            {t(`quality.${metric.quality}`)}
          </span>
        </div>
        <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">
          {currentDisplay}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
          {metric.comparisonReady
            ? t("kpis.previousCompact", { value: previousDisplay })
            : t("kpis.comparisonBuilding")}
          {metric.live
            ? ` · ${t("kpis.liveCompact", { value: liveDisplay })}`
            : ""}
        </p>
        {metric.current?.denominator != null ? (
          <p className="text-muted-foreground text-[11px] tabular-nums">
            {t("kpis.rateCounts", {
              numerator: number.format(metric.current.numerator),
              denominator: number.format(metric.current.denominator),
            })}
          </p>
        ) : null}
      </div>
      <ArrowRight
        className="text-muted-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
      <span className="sr-only">
        {t("kpis.contractMeta", {
          id: metric.id,
          window: metric.windowDays,
          date: measuredSince,
        })}
      </span>
    </Link>
  );
}

export default async function DailyCockpit({
  data,
}: {
  data: DailyCockpitData;
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
  const liveTime = new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Amsterdam",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(data.generatedAt));
  const warningMetric = data.warning
    ? data.headlines.find((metric) => metric.id === data.warning?.metricId)
    : null;
  const warningValueKind = warningMetric?.valueKind ?? "rate";
  const operations = [
    {
      key: "previews",
      icon: ImageOff,
      count: data.operations.missingGalleryPreviews,
      detail: t("operations.previews.detail"),
      href: "/dashboard/gallery",
      action: t("operations.previews.action"),
    },
    {
      key: "failures",
      icon: Upload,
      count:
        data.operations.exportFailures + data.operations.publicationFailures,
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
      detail: t("operations.pipeline.detail", {
        building: number.format(data.operations.buildingMetrics),
      }),
      href: "/dashboard/metrics#operations",
      action: t("operations.pipeline.action"),
    },
  ] as const;
  const actionableOperations = operations.filter(
    (operation) => operation.count > 0
  );
  const clearOperationCount = operations.length - actionableOperations.length;
  return (
    <section aria-labelledby="daily-focus" className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="daily-focus" className="text-base font-semibold">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("description")}
          </p>
        </div>
        <p className="text-muted-foreground shrink-0 text-xs">
          {t("updatedAt", { time: liveTime })}
        </p>
      </div>

      {data.warning ? (
        <div aria-labelledby="cockpit-signal">
          <h2 id="cockpit-signal" className="sr-only">
            {t("warning.sectionTitle")}
          </h2>
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
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
                  current: formatValue(
                    { valueKind: warningValueKind },
                    data.warning.currentValue,
                    number,
                    percent
                  ),
                  baseline: formatValue(
                    { valueKind: warningValueKind },
                    data.warning.historicalMedian,
                    number,
                    percent
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <section
          aria-labelledby="cockpit-headlines"
          className="bg-card rounded-xl border p-4"
        >
          <div className="mb-3">
            <h3 id="cockpit-headlines" className="text-sm font-semibold">
              {t("headlines.title")}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("headlines.description")}
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            {data.headlines.map((metric, index) => (
              <Reveal key={metric.id} delay={index * 0.03}>
                <HeadlineCard
                  metric={metric}
                  number={number}
                  percent={percent}
                  date={date}
                  t={t}
                />
              </Reveal>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="cockpit-operations"
          className="bg-card rounded-xl border p-4"
        >
          <div className="mb-3">
            <h3 id="cockpit-operations" className="text-sm font-semibold">
              {t("operations.title")}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("operations.description")}
            </p>
          </div>
          <div className="space-y-2">
            {actionableOperations.map((operation) => {
              const Icon = operation.icon;
              return (
                <Link
                  key={operation.key}
                  href={operation.href}
                  prefetch={false}
                  className="focus-visible:ring-ring group flex items-start gap-3 rounded-lg border border-amber-500/25 p-3 transition-colors hover:border-amber-500/40 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold">
                        {t(`operations.${operation.key}.label`)}
                      </p>
                      <span className="text-lg font-semibold tabular-nums">
                        {number.format(operation.count)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {operation.detail}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium">
                      {operation.action}
                      <ArrowRight
                        className="size-3 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              );
            })}
            {clearOperationCount > 0 ? (
              <div className="bg-muted/35 flex items-start gap-3 rounded-lg border border-dashed p-3">
                <span className="bg-background text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg border">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {actionableOperations.length === 0
                      ? t("operations.allClear")
                      : t("operations.clearSummary", {
                          count: clearOperationCount,
                        })}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {t("operations.clearDetail")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
