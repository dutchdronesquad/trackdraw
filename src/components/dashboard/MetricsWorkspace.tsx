"use client";

import {
  ContentTrend,
  EditorSplit,
  EmbedSitesTable,
  ExportFormatTable,
  JourneyFunnel,
  RetentionTrend,
  SharingHealthGrid,
  TimeToResultHistogram,
  WeeklyViewsChart,
} from "@/components/dashboard/MetricsDesignCharts";

import { Fragment, useEffect, useMemo, useState } from "react";
import { usePeriodMetrics } from "@/components/dashboard/use-period-metrics";
import {
  loadLocalizationDemand,
  loadProductInsights,
} from "@/app/dashboard/metrics/actions";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ChevronRight,
  Info,
  Languages,
  LayoutDashboard,
  PenTool,
  RefreshCw,
  Share2,
  type LucideIcon,
  Users,
} from "lucide-react";
import {
  UserGrowthCard,
  UserGrowthRangePicker,
} from "@/components/dashboard/MetricsCharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/AppTooltip";
import {
  AcquisitionAside,
  ContentAside,
  EmbedShareAside,
  ExportReliabilityAside,
  GrowthAside,
  JourneyAside,
  RetentionAside,
  ShareReachAside,
  TimingAside,
} from "@/components/dashboard/MetricsAsides";
import MetricsSection from "@/components/dashboard/MetricsSection";
import ToneBadge, {
  type DashboardTone,
} from "@/components/dashboard/ToneBadge";
import {
  MetricsEmpty,
  MetricsInlineBar,
  MetricsStackedBar,
  MetricsStatStrip,
  MetricsSwatch,
  metricsTableClassNames as tableClass,
} from "@/components/dashboard/MetricsVisuals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type {
  MetricsExplorerData,
  MetricsExplorerMetric,
  MetricsExplorerQuality,
  MetricsExplorerRow,
} from "@/lib/metrics-explorer";
import type {
  AdminMetrics,
  GrowthByRange,
  ProductInsights,
} from "@/lib/server/metrics";
import type { DailyCockpitData } from "@/lib/server/dashboard-cockpit";
import type {
  GrowthCustomRange,
  GrowthRange,
  GrowthTimeline,
} from "@/lib/metrics-growth";
import type { ProductMetricId } from "@/lib/server/product-metric-aggregates";
import type { LocalizationDemandMetrics } from "@/lib/server/localization-demand";
import { cn } from "@/lib/utils";
import { create24HourDateTimeFormatter } from "@/lib/date-time";

type MetricsWorkspaceProps = {
  metrics: AdminMetrics;
  insights: ProductInsights;
  growthByRange: GrowthByRange;
  growthTimeline: GrowthTimeline;
  cockpit: DailyCockpitData;
  explorer: MetricsExplorerData;
  localizationDemand: LocalizationDemandMetrics;
  canRunMaintenance?: boolean;
  header?: {
    title: string;
    subtitle: string;
    updatedLabel: string;
    lastUpdated: string;
    dateTime: string;
  };
};

type MetricSnapshot = {
  id: ProductMetricId;
  valueKind: "count" | "rate" | "mix";
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  previousValue: number | null;
  sampleSize?: number | null;
  minimumVolume?: number;
  previousLimited?: boolean;
  comparisonReady: boolean;
  quality: MetricsExplorerQuality;
  windowDays: number;
  measuredSince: string | null;
  generatedAt: string;
};

type MetricsView =
  "overview" | "creators" | "audience" | "creation" | "distribution";

const EVIDENCE_METRICS = ["MTR-001", "MTR-004", "MTR-006", "MTR-005"] as const;

const METRICS_VIEWS = [
  { view: "overview", key: "overview", icon: LayoutDashboard },
  { view: "creators", key: "creators", icon: Users },
  { view: "audience", key: "audience", icon: Languages },
  { view: "creation", key: "creation", icon: PenTool },
  { view: "distribution", key: "distribution", icon: Share2 },
] as const satisfies ReadonlyArray<{
  view: MetricsView;
  key: "overview" | "creators" | "audience" | "creation" | "distribution";
  icon: LucideIcon;
}>;

const METRICS_HASH_VIEWS: Readonly<Record<string, MetricsView>> = {
  overview: "overview",
  creators: "creators",
  audience: "audience",
  creation: "creation",
  distribution: "distribution",
  operations: "distribution",
};

const ELEVATED_FAILURE_RATE = 0.05;
const COCKPIT_FAILURE_OPERATIONS = ["export", "gallery_publish"] as const;

function cockpitFailureRows(metric: MetricsExplorerMetric) {
  return metric.rows
    .map((row) => {
      const [operation, category] = row.dimension.split(":", 2);
      return { ...row, operation, category };
    })
    .filter(
      (
        row
      ): row is typeof row & {
        operation: (typeof COCKPIT_FAILURE_OPERATIONS)[number];
        category: string;
      } =>
        COCKPIT_FAILURE_OPERATIONS.includes(
          row.operation as (typeof COCKPIT_FAILURE_OPERATIONS)[number]
        ) && Boolean(row.category)
    )
    .sort(
      (left, right) =>
        right.numerator - left.numerator ||
        left.dimension.localeCompare(right.dimension)
    );
}

const QUALITY_TONE: Record<MetricsExplorerQuality, DashboardTone> = {
  healthy: "emerald",
  building: "amber",
  low_volume: "amber",
  degraded: "amber",
  invalid: "destructive",
  not_started: "neutral",
};

function metricValue(
  numerator: number,
  denominator: number | null,
  valueKind: "count" | "rate"
) {
  if (valueKind === "count") return numerator;
  if (denominator === null) return null;
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function formatValue(
  snapshot: MetricSnapshot,
  number: Intl.NumberFormat,
  percent: Intl.NumberFormat
) {
  if (snapshot.valueKind === "mix") return null;
  if (snapshot.value === null) return "—";
  return snapshot.valueKind === "rate"
    ? percent.format(snapshot.value)
    : number.format(snapshot.value);
}

function formatPreviousValue(
  snapshot: MetricSnapshot,
  number: Intl.NumberFormat,
  percent: Intl.NumberFormat
) {
  if (snapshot.previousValue === null || snapshot.valueKind === "mix") {
    return "—";
  }
  return snapshot.valueKind === "rate"
    ? percent.format(snapshot.previousValue)
    : number.format(snapshot.previousValue);
}

function formatRowValue(row: MetricsExplorerRow, percent: Intl.NumberFormat) {
  return row.value === null ? "—" : percent.format(row.value);
}

function buildingProgressDays(
  measuredSince: string,
  generatedAt: string,
  windowDays: number
) {
  const elapsedMs =
    Date.parse(generatedAt) - Date.parse(`${measuredSince}T00:00:00.000Z`);
  const elapsed = Math.floor(elapsedMs / 86_400_000);
  return {
    elapsed: Math.min(Math.max(elapsed, 0), windowDays),
    total: windowDays,
  };
}

function QualityLabel({
  quality,
  measuredSince,
  generatedAt,
  windowDays,
}: {
  quality: MetricsExplorerQuality;
  measuredSince?: string | null;
  generatedAt?: string;
  windowDays?: number;
}) {
  const t = useTranslations("dashboard.metrics.explorer.quality");
  const locale = useLocale();
  const progress =
    quality === "building" && measuredSince && generatedAt && windowDays
      ? buildingProgressDays(measuredSince, generatedAt, windowDays)
      : null;
  const catchingUp = progress && progress.elapsed >= progress.total;
  const shortDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const labelText = catchingUp
    ? t("catchingUp")
    : quality === "building" && measuredSince
      ? t("collectingSince", {
          date: shortDate.format(new Date(`${measuredSince}T00:00:00.000Z`)),
        })
      : t(quality);
  const label = <ToneBadge tone={QUALITY_TONE[quality]}>{labelText}</ToneBadge>;

  if (quality !== "not_started" && quality !== "building") return label;

  const hint = catchingUp
    ? t("catchingUpHint")
    : progress
      ? windowDays
        ? t("buildingHint", {
            elapsed: progress.elapsed,
            total: progress.total,
            window: windowDays,
          })
        : t("buildingHintGeneric", {
            elapsed: progress.elapsed,
            total: progress.total,
          })
      : t(quality === "building" ? "incompleteHint" : "notStartedHint");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="cursor-help text-left"
            aria-label={`${labelText}. ${hint}`}
          >
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RunMetricMaintenanceButton() {
  const t = useTranslations("dashboard.metrics.maintenance");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/dashboard/metrics/maintenance", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? t("failed"));
      }
      toast.success(t("success"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={pending}>
      <RefreshCw
        className={cn("size-4", pending && "animate-spin")}
        aria-hidden="true"
      />
      {pending ? t("running") : t("run")}
    </Button>
  );
}

function MetricDelta({
  snapshot,
  percent,
}: {
  snapshot: MetricSnapshot;
  percent: Intl.NumberFormat;
}) {
  const t = useTranslations("dashboard.metrics.explorer.comparison");
  if (!snapshot.comparisonReady || snapshot.previousValue === null) {
    return <span className="text-muted-foreground">{t("unavailable")}</span>;
  }
  const delta =
    snapshot.value === null ? 0 : snapshot.value - snapshot.previousValue;
  if (snapshot.valueKind === "rate") {
    return (
      <span className="tabular-nums">
        {t("points", { value: Math.round(delta * 100) })}
      </span>
    );
  }
  if (snapshot.previousValue === 0) return <span>—</span>;
  return (
    <span className="tabular-nums">
      {percent.format(delta / snapshot.previousValue)}
    </span>
  );
}

const ACQUISITION_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-5)",
];

function sortExplorerRows(metric: MetricsExplorerMetric) {
  return [...metric.rows].sort(
    (left, right) =>
      (right.value ?? 0) - (left.value ?? 0) ||
      left.dimension.localeCompare(right.dimension)
  );
}

function AcquisitionMix({ metric }: { metric: MetricsExplorerMetric }) {
  const t = useTranslations("dashboard.metrics.explorer");
  const locale = useLocale();
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const ranked = sortExplorerRows(metric);
  const rows = [
    ...ranked.filter(
      (row) => row.dimension !== "other" && row.dimension !== "unknown"
    ),
    ...ranked.filter(
      (row) => row.dimension === "other" || row.dimension === "unknown"
    ),
  ].map((row, index) => {
    const muted = row.dimension === "other" || row.dimension === "unknown";
    return {
      ...row,
      label: t(`sources.${row.dimension}`),
      muted,
      color: muted
        ? "var(--muted-foreground)"
        : ACQUISITION_COLORS[index % ACQUISITION_COLORS.length],
    };
  });

  if (rows.length === 0) {
    return (
      <MetricsEmpty>
        {t(
          metric.quality === "not_started" ? "empty.notStarted" : "empty.noData"
        )}
      </MetricsEmpty>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <MetricsStackedBar
        label={rows
          .map((row) => `${row.label} ${formatRowValue(row, percent)}`)
          .join(", ")}
        segments={rows.map((row) => ({
          key: row.dimension,
          value: row.numerator,
          color: row.color,
          muted: row.muted,
        }))}
      />
      <div className="grid grid-cols-[16px_minmax(0,1fr)_72px_56px] items-center gap-x-3 gap-y-2.5 text-sm">
        {rows.map((row) => (
          <Fragment key={row.dimension}>
            <MetricsSwatch
              color={row.color}
              className={cn(
                "size-2.5 rounded-[3px]",
                row.muted && "opacity-40"
              )}
            />
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="text-muted-foreground text-right tabular-nums">
              {number.format(row.numerator)}
            </span>
            <span className="text-right font-medium tabular-nums">
              {formatRowValue(row, percent)}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function FeatureAdoption({ metric }: { metric: MetricsExplorerMetric }) {
  const t = useTranslations("dashboard.metrics.explorer");
  const locale = useLocale();
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const rows = sortExplorerRows(metric);

  if (rows.length === 0) {
    return (
      <MetricsEmpty>
        {t(
          metric.quality === "not_started" ? "empty.notStarted" : "empty.noData"
        )}
      </MetricsEmpty>
    );
  }

  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)_44px] items-center gap-x-3 gap-y-2.5 text-sm">
      {rows.map((row) => {
        const label = t(`features.${row.dimension}`);
        const value = formatRowValue(row, percent);
        return (
          <Fragment key={row.dimension}>
            <span className="min-w-0 truncate">{label}</span>
            <span
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="img"
              aria-label={`${label}: ${value}`}
            >
              <span
                className="block h-full rounded-full bg-[var(--chart-1)]"
                style={{
                  width: `${Math.max(0, Math.min(100, (row.value ?? 0) * 100))}%`,
                }}
              />
            </span>
            <span className="text-right tabular-nums">{value}</span>
          </Fragment>
        );
      })}
    </div>
  );
}

function RetentionTable({ metric }: { metric: MetricsExplorerMetric }) {
  const t = useTranslations("dashboard.metrics.explorer.retention");
  const locale = useLocale();
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    [locale]
  );
  if (metric.rows.length === 0) {
    return <MetricsEmpty>{t("empty")}</MetricsEmpty>;
  }

  return (
    <div className="overflow-x-auto">
      <table className={cn(tableClass.table, "min-w-[560px]")}>
        <thead>
          <tr className={tableClass.headRow}>
            <th scope="col" className={tableClass.head}>
              {t("cohort")}
            </th>
            <th scope="col" className={cn(tableClass.head, "text-right")}>
              {t("activated")}
            </th>
            <th scope="col" className={cn(tableClass.head, "text-right")}>
              {t("returned")}
            </th>
            <th scope="col" className={cn(tableClass.head, "w-[34%]")}>
              {t("rate")}
            </th>
            <th scope="col" className={tableClass.head}>
              {t("quality")}
            </th>
          </tr>
        </thead>
        <tbody>
          {metric.rows.map((row) => {
            const mature = row.quality === "healthy";
            return (
              <tr key={row.day} className={tableClass.row}>
                <td
                  className={cn(
                    tableClass.cell,
                    !mature && "text-muted-foreground"
                  )}
                >
                  {t("weekOf", {
                    date: date.format(new Date(`${row.day}T00:00:00.000Z`)),
                  })}
                </td>
                <td className={cn(tableClass.cell, "text-right tabular-nums")}>
                  {row.denominator ?? "—"}
                </td>
                <td className={cn(tableClass.cell, "text-right tabular-nums")}>
                  {row.numerator}
                </td>
                <td className={tableClass.cell}>
                  <MetricsInlineBar
                    ratio={row.value ?? 0}
                    value={formatRowValue(row, percent)}
                    muted={!mature}
                  />
                </td>
                <td className={tableClass.cell}>
                  {mature ? (
                    <ToneBadge tone="emerald">{t("mature")}</ToneBadge>
                  ) : row.quality === "building" ? (
                    <ToneBadge tone="neutral">{t("maturing")}</ToneBadge>
                  ) : (
                    <QualityLabel quality={row.quality} />
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

function MetricsLoadError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  const t = useTranslations("dashboard.metrics.explorer.period");
  return (
    <div
      role="alert"
      className="bg-muted/50 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3"
    >
      <Info
        className="text-muted-foreground size-4 shrink-0"
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RefreshCw className="size-3.5" aria-hidden="true" />
        {t("retry")}
      </Button>
    </div>
  );
}

function PeriodInsightState({
  insights,
  failed,
  source,
  inset = false,
  children,
}: {
  insights: ProductInsights | undefined;
  failed?: boolean;
  source: "events" | "embeds" | "content";
  inset?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboard.metrics.explorer.period");
  if (!insights)
    return failed ? (
      <p
        className={cn(
          "text-muted-foreground flex min-h-24 w-full items-center justify-center gap-2 py-4 text-center text-sm",
          inset && "px-4"
        )}
      >
        <Info className="size-4 shrink-0" aria-hidden="true" />
        {t("temporarilyUnavailable")}
      </p>
    ) : (
      <p
        role="status"
        className={cn(
          "text-muted-foreground flex items-center gap-2 py-2 text-sm",
          inset && "p-4"
        )}
      >
        <RefreshCw
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
        {t("loading")}
      </p>
    );
  const period = insights.period;
  const coverage =
    source === "embeds"
      ? insights.usage.embedCoverage
      : insights.usage.coverage;
  const unavailable =
    period?.days === 0 ||
    (source !== "content" &&
      coverage &&
      (!coverage.from ||
        (period && period.to < (coverage.availableFrom ?? coverage.from))));
  if (unavailable)
    return (
      <p className={cn("text-muted-foreground text-sm", inset && "p-4")}>
        {t("unavailable")}
      </p>
    );
  return <>{children}</>;
}

function LocalizationDemandTable({
  metrics,
}: {
  metrics: LocalizationDemandMetrics;
}) {
  const t = useTranslations("dashboard.metrics.explorer.localization");
  const locale = useLocale();
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const shareFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    [locale]
  );
  const languageNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: "language" }),
    [locale]
  );
  const countryNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: "region" }),
    [locale]
  );

  const formatLanguage = (language: string) => {
    if (language === "other") return t("otherLanguages");
    if (language === "unknown") return t("unknownLanguage");
    return languageNames.of(language) ?? language.toUpperCase();
  };
  const formatCountry = (country: string) => {
    if (country === "other") return t("otherCountries");
    if (country === "unknown") return t("unknownCountry");
    return countryNames.of(country) ?? country;
  };
  const translationCandidateCount = metrics.languages.filter(
    (row) =>
      row.supported === false &&
      row.language !== "other" &&
      row.language !== "unknown"
  ).length;
  const interfaceSummary = metrics.servedLocales
    .map((row) => `${formatLanguage(row.locale)} ${percent.format(row.share)}`)
    .join(", ");
  const statusRank = (supported: boolean | null) =>
    supported === false ? 0 : supported ? 1 : 2;
  const rows = [...metrics.languages].sort(
    (left, right) =>
      statusRank(left.supported) - statusRank(right.supported) ||
      right.creatorSessions - left.creatorSessions
  );
  const maxSessions = Math.max(
    1,
    ...rows
      .filter((row) => row.supported !== null)
      .map((row) => row.creatorSessions)
  );

  if (metrics.languages.length === 0) {
    return (
      <MetricsEmpty>
        {t(metrics.quality === "not_started" ? "notStarted" : "noData")}
      </MetricsEmpty>
    );
  }

  return (
    <div>
      <MetricsStatStrip
        items={[
          {
            key: "sessions",
            value: number.format(metrics.totalCreatorSessions),
            label: t("creatorSessions"),
          },
          {
            key: "unsupported",
            value:
              metrics.unsupportedCreatorSessions === null ? (
                t("belowThresholdValue")
              ) : (
                <>
                  {number.format(metrics.unsupportedCreatorSessions)}{" "}
                  <span className="text-muted-foreground text-sm font-normal">
                    {shareFormat.format(
                      metrics.totalCreatorSessions
                        ? metrics.unsupportedCreatorSessions /
                            metrics.totalCreatorSessions
                        : 0
                    )}
                  </span>
                </>
              ),
            label: t("unsupportedLanguageSessions"),
          },
          {
            key: "candidates",
            value: number.format(translationCandidateCount),
            label: t("translationCandidates"),
            tone: translationCandidateCount > 0 ? "amber" : "default",
          },
        ]}
      />
      <div className="overflow-x-auto">
        <table className={cn(tableClass.table, "min-w-[720px]")}>
          <thead>
            <tr className={tableClass.headRow}>
              <th scope="col" className={tableClass.head}>
                {t("preferredBrowserLanguage")}
              </th>
              <th scope="col" className={cn(tableClass.head, "w-[28%]")}>
                {t("sessions")}
              </th>
              <th scope="col" className={tableClass.head}>
                {t("status")}
              </th>
              <th scope="col" className={tableClass.head}>
                {t("countries")}
              </th>
              {metrics.comparisonReady ? (
                <th scope="col" className={cn(tableClass.head, "text-right")}>
                  {t("previous")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.supported === null ? (
                <tr key={row.language} className={tableClass.row}>
                  <td
                    className={cn(
                      tableClass.cell,
                      "text-muted-foreground font-medium"
                    )}
                  >
                    {row.groupedLanguageCount != null
                      ? t("groupedLanguages", {
                          count: row.groupedLanguageCount,
                        })
                      : formatLanguage(row.language)}
                  </td>
                  <td className={cn(tableClass.cell, "text-xs tabular-nums")}>
                    {row.groupedLanguageCount != null
                      ? t("belowThresholdEach")
                      : number.format(row.creatorSessions)}
                  </td>
                  <td className={tableClass.cell}>
                    <ToneBadge tone="neutral">
                      {t(
                        row.language === "unknown"
                          ? "unavailable"
                          : "groupedForPrivacy"
                      )}
                    </ToneBadge>
                  </td>
                  <td
                    colSpan={metrics.comparisonReady ? 2 : 1}
                    className={cn(
                      tableClass.cell,
                      "text-muted-foreground text-xs"
                    )}
                  >
                    {row.language === "unknown"
                      ? null
                      : t("groupedForPrivacyNote")}
                  </td>
                </tr>
              ) : (
                <tr key={row.language} className={tableClass.row}>
                  <td className={cn(tableClass.cell, "font-medium")}>
                    {formatLanguage(row.language)}
                  </td>
                  <td className={tableClass.cell}>
                    <MetricsInlineBar
                      ratio={row.creatorSessions / maxSessions}
                      value={number.format(row.creatorSessions)}
                      color={row.supported ? "var(--chart-2)" : "#f59e0b"}
                      label={`${formatLanguage(row.language)} ${percent.format(row.share)}`}
                    />
                  </td>
                  <td className={tableClass.cell}>
                    <ToneBadge tone={row.supported ? "emerald" : "amber"}>
                      {t(row.supported ? "supported" : "candidate")}
                    </ToneBadge>
                  </td>
                  <td
                    className={cn(
                      tableClass.cell,
                      "text-muted-foreground text-xs"
                    )}
                  >
                    {row.countries.length > 0
                      ? row.countries
                          .slice(0, 3)
                          .map((country) => formatCountry(country.country))
                          .join(", ")
                      : "—"}
                  </td>
                  {metrics.comparisonReady ? (
                    <td
                      className={cn(
                        tableClass.cell,
                        "text-muted-foreground text-right tabular-nums"
                      )}
                    >
                      {number.format(row.previousCreatorSessions)}
                    </td>
                  ) : null}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      {!metrics.comparisonReady ? (
        <p className="text-muted-foreground border-t px-4 py-3 text-xs">
          {t("privacyAndComparisonNote")}
        </p>
      ) : null}
      {metrics.servedLocales.length > 0 ? (
        <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <p className="shrink-0 text-xs font-medium">
            {t("interfaceLanguageUsed")}
          </p>
          <div
            className="bg-muted flex h-2 min-w-0 flex-1 overflow-hidden rounded-full"
            role="img"
            aria-label={t("interfaceLanguageSummary", {
              locales: interfaceSummary,
            })}
          >
            {metrics.servedLocales.map((row, index) => (
              <span
                key={row.locale}
                title={`${formatLanguage(row.locale)} ${percent.format(row.share)}`}
                style={{
                  width: `${Math.min(row.share * 100, 100)}%`,
                  backgroundColor:
                    ACQUISITION_COLORS[index % ACQUISITION_COLORS.length],
                }}
              />
            ))}
          </div>
          <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {interfaceSummary}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function MetricsWorkspace({
  metrics,
  insights,
  growthByRange,
  growthTimeline,
  cockpit,
  explorer,
  localizationDemand,
  canRunMaintenance = false,
  header,
}: MetricsWorkspaceProps) {
  const t = useTranslations("dashboard.metrics.explorer");
  const locale = useLocale();
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const precisePercent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    [locale]
  );
  const [activeView, setActiveView] = useState<MetricsView>("overview");
  const openView = (view: MetricsView) => ({
    label: t("openView", { view: t(`views.${view}`) }),
    onClick: () => {
      setActiveView(view);
      window.history.replaceState(null, "", `#${view}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  const [growthRange, setGrowthRange] = useState<GrowthRange>("3m");
  const [growthCustomRange, setGrowthCustomRange] =
    useState<GrowthCustomRange | null>(null);

  const selectedRange =
    growthRange === "custom" && growthCustomRange
      ? growthCustomRange
      : growthByRange[growthRange === "custom" ? "3m" : growthRange];
  const localization = usePeriodMetrics(
    localizationDemand,
    growthByRange["3m"],
    selectedRange,
    loadLocalizationDemand
  );
  const selectedLocalization = localization.data;
  const localizationFailed = localization.failed;
  const periodInsights = usePeriodMetrics(
    insights,
    growthByRange["3m"],
    selectedRange,
    loadProductInsights
  );
  const selectedInsights = periodInsights.data;

  useEffect(() => {
    const selectHashView = () => {
      const hash = window.location.hash.slice(1);
      const view = METRICS_HASH_VIEWS[hash];
      if (view) {
        setActiveView(view);
      }
      if (hash === "operations") {
        window.requestAnimationFrame(() => {
          document
            .getElementById("operations")
            ?.scrollIntoView({ block: "start" });
        });
      }
    };

    selectHashView();
    window.addEventListener("hashchange", selectHashView);
    return () => window.removeEventListener("hashchange", selectHashView);
  }, []);
  const failureRows = useMemo(
    () => cockpitFailureRows(explorer.failures),
    [explorer.failures]
  );
  const failureCount = failureRows.reduce((sum, row) => sum + row.numerator, 0);
  const failureWindowEnd = failureRows[0]?.day ?? null;
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone: "UTC",
      }),
    [locale]
  );
  const dateTime = useMemo(
    () =>
      create24HourDateTimeFormatter(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Amsterdam",
      }),
    [locale]
  );

  const snapshots = useMemo(() => {
    const entries = cockpit.headlines.map((metric) => {
      const current = metric.current;
      const previous = metric.previous;
      return [
        metric.id,
        {
          id: metric.id,
          valueKind: metric.valueKind,
          value: current
            ? metricValue(
                current.numerator,
                current.denominator,
                metric.valueKind
              )
            : null,
          numerator: current?.numerator ?? null,
          denominator: current?.denominator ?? null,
          sampleSize: current?.sample_size,
          minimumVolume: metric.minimumVolume,
          previousLimited:
            previous !== null &&
            (previous.quality_status === "low_volume" ||
              (previous.sample_size ?? previous.denominator ?? 0) <
                metric.minimumVolume),
          previousValue: previous
            ? metricValue(
                previous.numerator,
                previous.denominator,
                metric.valueKind
              )
            : null,
          comparisonReady: metric.comparisonReady,
          quality: metric.quality,
          windowDays: metric.windowDays,
          measuredSince: metric.measuredSince,
          generatedAt: cockpit.generatedAt,
        } satisfies MetricSnapshot,
      ] as const;
    });
    const explorerEntries: Array<readonly [ProductMetricId, MetricSnapshot]> = [
      [
        "MTR-008",
        {
          id: "MTR-008",
          valueKind: "mix",
          value: null,
          numerator: explorer.acquisition.rows.reduce(
            (sum, row) => sum + row.numerator,
            0
          ),
          denominator: explorer.acquisition.rows[0]?.denominator ?? null,
          previousValue: null,
          comparisonReady: false,
          quality: explorer.acquisition.quality,
          windowDays: explorer.acquisition.windowDays,
          measuredSince: explorer.acquisition.measuredSince,
          generatedAt: explorer.generatedAt,
        },
      ],
      [
        "MTR-009",
        {
          id: "MTR-009",
          valueKind: "mix",
          value: null,
          numerator: explorer.adoption.rows.reduce(
            (sum, row) => sum + row.numerator,
            0
          ),
          denominator: explorer.adoption.rows[0]?.denominator ?? null,
          previousValue: null,
          comparisonReady: false,
          quality: explorer.adoption.quality,
          windowDays: explorer.adoption.windowDays,
          measuredSince: explorer.adoption.measuredSince,
          generatedAt: explorer.generatedAt,
        },
      ],
    ];
    return new Map<ProductMetricId, MetricSnapshot>([
      ...entries,
      ...explorerEntries,
    ]);
  }, [cockpit.generatedAt, cockpit.headlines, explorer]);

  return (
    <div className="space-y-4">
      {header ? (
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-tight">
              {header.title}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {header.subtitle} {header.updatedLabel}{" "}
              <time dateTime={header.dateTime}>{header.lastUpdated}</time>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canRunMaintenance ? <RunMetricMaintenanceButton /> : null}
            <UserGrowthRangePicker
              segmented
              activeRange={growthRange}
              customRange={growthCustomRange}
              today={growthTimeline.today}
              onPresetSelect={setGrowthRange}
              onCustomApply={(value) => {
                setGrowthCustomRange(value);
                setGrowthRange("custom");
              }}
            />
          </div>
        </header>
      ) : null}

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as MetricsView)}
        className="min-w-0"
      >
        <div className="flex items-end justify-between gap-4 border-b">
          <div className="snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
            <TabsList
              className="h-auto min-w-max justify-start rounded-none bg-transparent p-0"
              aria-label={t("views.label")}
            >
              {METRICS_VIEWS.map(({ view, key, icon: Icon }) => (
                <TabsTrigger
                  key={view}
                  value={view}
                  className="data-[state=active]:border-primary min-h-11 snap-start gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t(`views.${key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {periodInsights.failed &&
        ["overview", "creation", "distribution"].includes(activeView) ? (
          <MetricsLoadError
            message={t("period.failed")}
            retry={periodInsights.retry}
          />
        ) : null}

        <TabsContent value="overview" className="mt-4 space-y-4">
          <MetricsSection
            title={t("questions.growth")}
            description={t("questions.growthDescription")}
            aside={
              <GrowthAside
                growthData={
                  growthRange === "custom" ? null : growthByRange[growthRange]
                }
                growthTimeline={growthTimeline}
                link={openView("creators")}
              />
            }
          >
            <UserGrowthCard
              growthByRange={growthByRange}
              growthTimeline={growthTimeline}
              bare
              compact
              hideHeading
              activeRange={growthRange}
              activeCustomRange={growthCustomRange}
              onPresetSelect={setGrowthRange}
              onCustomApply={(value) => {
                setGrowthCustomRange(value);
                setGrowthRange("custom");
              }}
              showRangePicker={!header}
            />
          </MetricsSection>
          <MetricsSection
            title={t("questions.retention")}
            description={t("questions.retentionDescription")}
            status={
              <QualityLabel
                quality={explorer.retention.quality}
                measuredSince={explorer.retention.measuredSince}
                generatedAt={explorer.generatedAt}
              />
            }
            aside={
              <RetentionAside
                metric={explorer.retention}
                link={openView("creators")}
              />
            }
          >
            <RetentionTrend metric={explorer.retention} />
          </MetricsSection>
          <MetricsSection
            title={t("questions.reach")}
            description={t("questions.reachDescription")}
            aside={
              <ShareReachAside
                analysis={selectedInsights?.analysis}
                usage={selectedInsights?.usage}
                link={openView("distribution")}
              />
            }
          >
            <PeriodInsightState
              insights={selectedInsights}
              failed={periodInsights.failed}
              source="events"
            >
              {selectedInsights?.analysis ? (
                <WeeklyViewsChart analysis={selectedInsights.analysis} />
              ) : null}
            </PeriodInsightState>
          </MetricsSection>

          <MetricsSection
            title={t("evidence.title")}
            description={t("evidence.description")}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className={cn(tableClass.table, "min-w-[720px]")}>
                <thead>
                  <tr className={tableClass.headRow}>
                    <th scope="col" className={tableClass.head}>
                      {t("evidence.metric")}
                    </th>
                    <th
                      scope="col"
                      className={cn(tableClass.head, "text-right")}
                    >
                      {t("evidence.current")}
                    </th>
                    <th
                      scope="col"
                      className={cn(tableClass.head, "text-right")}
                    >
                      {t("evidence.previous")}
                    </th>
                    <th
                      scope="col"
                      className={cn(tableClass.head, "text-right")}
                    >
                      {t("evidence.change")}
                    </th>
                    <th scope="col" className={tableClass.head}>
                      {t("evidence.quality")}
                    </th>
                    <th scope="col" className={tableClass.head}>
                      {t("evidence.window")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EVIDENCE_METRICS.map((id) => {
                    const snapshot = snapshots.get(id)!;
                    return (
                      <tr key={id} className={tableClass.row}>
                        <td className={cn(tableClass.cell, "font-medium")}>
                          {t(`metrics.${id}.name`)}
                        </td>
                        <td
                          className={cn(
                            tableClass.cell,
                            "text-right tabular-nums"
                          )}
                        >
                          {formatValue(snapshot, number, percent)}
                        </td>
                        <td
                          className={cn(
                            tableClass.cell,
                            "text-muted-foreground text-right tabular-nums"
                          )}
                        >
                          {formatPreviousValue(snapshot, number, percent)}
                          {snapshot.previousLimited ? (
                            <p className="text-xs">{t("quality.low_volume")}</p>
                          ) : null}
                        </td>
                        <td className={cn(tableClass.cell, "text-right")}>
                          <MetricDelta snapshot={snapshot} percent={percent} />
                        </td>
                        <td className={tableClass.cell}>
                          <QualityLabel
                            quality={snapshot.quality}
                            measuredSince={snapshot.measuredSince}
                            generatedAt={snapshot.generatedAt}
                            windowDays={snapshot.windowDays}
                          />
                          {snapshot.quality === "low_volume" &&
                          snapshot.minimumVolume ? (
                            <p className="text-muted-foreground mt-1 text-xs">
                              {t("quality.sampleCount", {
                                count: snapshot.sampleSize ?? 0,
                                minimum: snapshot.minimumVolume,
                              })}
                            </p>
                          ) : null}
                        </td>
                        <td
                          className={cn(
                            tableClass.cell,
                            "text-muted-foreground text-xs"
                          )}
                        >
                          {t(
                            id === "MTR-005"
                              ? "reportingPeriod.matureCohort"
                              : "reportingPeriod.completeDays",
                            { days: snapshot.windowDays }
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </MetricsSection>
        </TabsContent>

        <TabsContent value="creators" className="mt-4 space-y-4">
          <MetricsSection
            title={t("questions.growth")}
            description={t("questions.growthDescription")}
            aside={
              <GrowthAside
                growthData={
                  growthRange === "custom" ? null : growthByRange[growthRange]
                }
                growthTimeline={growthTimeline}
              />
            }
          >
            <UserGrowthCard
              growthByRange={growthByRange}
              growthTimeline={growthTimeline}
              bare
              hideHeading
              activeRange={growthRange}
              activeCustomRange={growthCustomRange}
              onPresetSelect={setGrowthRange}
              onCustomApply={(value) => {
                setGrowthCustomRange(value);
                setGrowthRange("custom");
              }}
              showRangePicker={!header}
            />
          </MetricsSection>
          <MetricsSection
            title={t("retention.title")}
            description={t("retention.description")}
            bodyClassName="p-0"
            status={
              <QualityLabel
                quality={explorer.retention.quality}
                measuredSince={explorer.retention.measuredSince}
                generatedAt={explorer.generatedAt}
              />
            }
            aside={<RetentionAside metric={explorer.retention} />}
          >
            <RetentionTable metric={explorer.retention} />
          </MetricsSection>
        </TabsContent>

        <TabsContent value="audience" className="mt-4 space-y-4">
          <MetricsSection
            title={t("acquisition.title")}
            description={t("acquisition.description")}
            status={
              <QualityLabel
                quality={explorer.acquisition.quality}
                measuredSince={explorer.acquisition.measuredSince}
                generatedAt={explorer.generatedAt}
              />
            }
            aside={<AcquisitionAside metric={explorer.acquisition} />}
          >
            <AcquisitionMix metric={explorer.acquisition} />
          </MetricsSection>
          <MetricsSection
            title={t("localization.title")}
            description={t("localization.description")}
            status={
              selectedLocalization ? (
                <QualityLabel quality={selectedLocalization.quality} />
              ) : null
            }
            bodyClassName="p-0"
          >
            {selectedLocalization ? (
              <>
                {selectedLocalization.quality === "building" ? (
                  <p className="text-muted-foreground border-b px-4 py-3 text-xs">
                    {t("localization.partialCoverage")}
                  </p>
                ) : null}
                <LocalizationDemandTable metrics={selectedLocalization} />
              </>
            ) : localizationFailed ? (
              <div className="p-4">
                <MetricsLoadError
                  message={t("localization.loadFailed")}
                  retry={localization.retry}
                />
              </div>
            ) : (
              <p role="status" className="text-muted-foreground p-4 text-sm">
                {t("localization.loading")}
              </p>
            )}
          </MetricsSection>
        </TabsContent>

        <TabsContent value="creation" className="mt-4 space-y-4">
          <MetricsSection
            title={t("analysis.journeyTitle")}
            description={t("analysis.journeyDescription")}
            aside={<JourneyAside analysis={selectedInsights?.analysis} />}
          >
            <PeriodInsightState
              insights={selectedInsights}
              failed={periodInsights.failed}
              source="events"
            >
              {selectedInsights?.analysis ? (
                <JourneyFunnel analysis={selectedInsights.analysis} />
              ) : null}
            </PeriodInsightState>
          </MetricsSection>
          <MetricsSection
            title={t("analysis.timingTitle")}
            description={t("analysis.timingDescription")}
            aside={<TimingAside analysis={selectedInsights?.analysis} />}
          >
            <PeriodInsightState
              insights={selectedInsights}
              failed={periodInsights.failed}
              source="events"
            >
              {selectedInsights?.analysis ? (
                <TimeToResultHistogram analysis={selectedInsights.analysis} />
              ) : null}
            </PeriodInsightState>
          </MetricsSection>
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <MetricsSection
              title={t("editor.title")}
              description={t("editor.description")}
            >
              <PeriodInsightState
                insights={selectedInsights}
                failed={periodInsights.failed}
                source="events"
              >
                {selectedInsights ? (
                  <EditorSplit usage={selectedInsights.usage} />
                ) : null}
              </PeriodInsightState>
            </MetricsSection>
            <MetricsSection
              title={t("adoption.title")}
              description={t("adoption.description")}
            >
              <FeatureAdoption metric={explorer.adoption} />
            </MetricsSection>
          </div>
          <MetricsSection
            title={t("content.title")}
            description={t("content.description")}
            aside={
              <ContentAside points={selectedInsights?.contentGrowth ?? []} />
            }
          >
            <PeriodInsightState
              insights={selectedInsights}
              failed={periodInsights.failed}
              source="content"
            >
              {selectedInsights ? (
                <ContentTrend points={selectedInsights.contentGrowth} />
              ) : null}
            </PeriodInsightState>
          </MetricsSection>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4 space-y-4">
          <MetricsSection
            title={t("analysis.exportTitle")}
            description={t("analysis.exportDescription")}
            bodyClassName="p-0"
            aside={
              <ExportReliabilityAside analysis={selectedInsights?.analysis} />
            }
          >
            <PeriodInsightState
              insights={selectedInsights}
              failed={periodInsights.failed}
              source="events"
              inset
            >
              {selectedInsights?.analysis ? (
                <ExportFormatTable analysis={selectedInsights.analysis} />
              ) : null}
            </PeriodInsightState>
          </MetricsSection>
          <MetricsSection
            title={t("sharing.title")}
            description={t("sharing.description")}
            aside={
              <EmbedShareAside
                analysis={selectedInsights?.analysis}
                usage={selectedInsights?.usage}
              />
            }
          >
            <PeriodInsightState
              insights={selectedInsights}
              failed={periodInsights.failed}
              source="events"
            >
              {selectedInsights?.analysis ? (
                <WeeklyViewsChart analysis={selectedInsights.analysis} split />
              ) : null}
            </PeriodInsightState>
          </MetricsSection>
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <MetricsSection
              title={t("sharing.healthTitle")}
              description={t("sharing.healthDescription")}
              bodyClassName="p-0"
            >
              <SharingHealthGrid
                shares={metrics.shares}
                gallery={metrics.gallery}
              />
            </MetricsSection>
            <MetricsSection
              title={t("sharing.embedTitle")}
              description={t("sharing.embedDescription")}
              bodyClassName="p-0"
            >
              <PeriodInsightState
                insights={selectedInsights}
                failed={periodInsights.failed}
                source="embeds"
                inset
              >
                {selectedInsights ? (
                  <EmbedSitesTable usage={selectedInsights.usage} />
                ) : null}
              </PeriodInsightState>
            </MetricsSection>
          </div>

          <section
            id="operations"
            className="bg-card scroll-mt-20 overflow-hidden rounded-lg border"
            aria-labelledby="operations-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3.5">
              <div className="min-w-0">
                <h2
                  id="operations-title"
                  className="text-base leading-6 font-semibold"
                >
                  {t("operations.title")}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-sm leading-5">
                  {t("operations.description")}
                  {failureWindowEnd
                    ? ` ${t("operations.windowEnd", {
                        date: date.format(
                          new Date(`${failureWindowEnd}T00:00:00.000Z`)
                        ),
                      })}.`
                    : null}
                </p>
              </div>
              {failureCount > 0 ? (
                <ToneBadge tone="destructive">
                  {t("operations.failedShort", { count: failureCount })}
                </ToneBadge>
              ) : (
                <QualityLabel
                  quality={explorer.failures.quality}
                  measuredSince={explorer.failures.measuredSince}
                  generatedAt={explorer.generatedAt}
                  windowDays={explorer.failures.windowDays}
                />
              )}
            </div>

            {failureRows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className={cn(tableClass.table, "min-w-[720px]")}>
                    <thead>
                      <tr className={tableClass.headRow}>
                        <th className={tableClass.head} scope="col">
                          {t("operations.operation")}
                        </th>
                        <th className={tableClass.head} scope="col">
                          {t("operations.category")}
                        </th>
                        <th
                          className={cn(tableClass.head, "text-right")}
                          scope="col"
                        >
                          {t("operations.failed")}
                        </th>
                        <th
                          className={cn(tableClass.head, "text-right")}
                          scope="col"
                        >
                          {t("operations.outcomes")}
                        </th>
                        <th
                          className={cn(tableClass.head, "text-right")}
                          scope="col"
                        >
                          {t("operations.rate")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {failureRows.map((row) => {
                        const elevated =
                          row.value !== null &&
                          row.value >= ELEVATED_FAILURE_RATE;
                        return (
                          <tr
                            key={row.dimension}
                            className={cn(
                              tableClass.row,
                              elevated && "bg-destructive/5"
                            )}
                          >
                            <td className={cn(tableClass.cell, "font-medium")}>
                              {t(`operations.operations.${row.operation}`)}
                            </td>
                            <td
                              className={cn(
                                tableClass.cell,
                                "text-muted-foreground text-xs"
                              )}
                            >
                              {t(`operations.categories.${row.category}`)}
                            </td>
                            <td
                              className={cn(
                                tableClass.cell,
                                "text-right tabular-nums"
                              )}
                            >
                              {number.format(row.numerator)}
                            </td>
                            <td
                              className={cn(
                                tableClass.cell,
                                "text-right tabular-nums"
                              )}
                            >
                              {row.denominator === null
                                ? "—"
                                : number.format(row.denominator)}
                            </td>
                            <td
                              className={cn(
                                tableClass.cell,
                                "text-right tabular-nums",
                                elevated && "text-destructive font-medium"
                              )}
                            >
                              {row.value === null
                                ? "—"
                                : precisePercent.format(row.value)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {explorer.recentFailures.length > 0 ? (
                  <details className="group border-t">
                    <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                      {t("operations.recentSummary", {
                        count: explorer.recentFailures.length,
                      })}
                      <ChevronRight
                        className="size-4 transition-transform group-open:rotate-90"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="border-t">
                      <div className="px-4 py-3 sm:px-5">
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          {t("operations.recentDescription")}
                        </p>
                      </div>
                      <div className="hidden overflow-x-auto border-t sm:block">
                        <table className="w-full min-w-[48rem] text-sm">
                          <thead>
                            <tr className="text-muted-foreground border-b text-left text-xs">
                              <th
                                className="px-4 py-2 font-medium sm:pl-5"
                                scope="col"
                              >
                                {t("operations.occurredAt")}
                              </th>
                              <th className="px-3 py-2 font-medium" scope="col">
                                {t("operations.operation")}
                              </th>
                              <th className="px-3 py-2 font-medium" scope="col">
                                {t("operations.format")}
                              </th>
                              <th className="px-3 py-2 font-medium" scope="col">
                                {t("operations.category")}
                              </th>
                              <th
                                className="px-4 py-2 font-medium sm:pr-5"
                                scope="col"
                              >
                                {t("operations.cause")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {explorer.recentFailures.map((failure, index) => (
                              <tr
                                key={`${failure.occurredAt}:${failure.operation}:${index}`}
                                className="border-b last:border-0"
                              >
                                <td className="px-4 py-3 tabular-nums sm:pl-5">
                                  <time dateTime={failure.occurredAt}>
                                    {dateTime.format(
                                      new Date(failure.occurredAt)
                                    )}
                                  </time>
                                </td>
                                <td className="px-3 py-3 font-medium">
                                  {t(
                                    `operations.operations.${failure.operation}`
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  {failure.exportFormat
                                    ? t(
                                        `operations.formats.${failure.exportFormat}`
                                      )
                                    : "—"}
                                </td>
                                <td className="px-3 py-3">
                                  {t(
                                    `operations.categories.${failure.category}`
                                  )}
                                </td>
                                <td className="px-4 py-3 sm:pr-5">
                                  {failure.reason
                                    ? t(`operations.reasons.${failure.reason}`)
                                    : t("operations.categoryOnly")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <ul className="divide-y border-t sm:hidden">
                        {explorer.recentFailures.map((failure, index) => (
                          <li
                            key={`${failure.occurredAt}:${failure.operation}:mobile:${index}`}
                            className="space-y-2 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-medium">
                                {t(
                                  `operations.operations.${failure.operation}`
                                )}
                              </span>
                              <time
                                className="text-muted-foreground text-xs tabular-nums"
                                dateTime={failure.occurredAt}
                              >
                                {dateTime.format(new Date(failure.occurredAt))}
                              </time>
                            </div>
                            <p className="text-sm">
                              {t(`operations.categories.${failure.category}`)}
                              {failure.exportFormat
                                ? ` · ${t(`operations.formats.${failure.exportFormat}`)}`
                                : ""}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {failure.reason
                                ? t(`operations.reasons.${failure.reason}`)
                                : t("operations.categoryOnly")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm sm:px-5">
                {t(
                  explorer.failures.quality === "not_started"
                    ? "operations.notStarted"
                    : "operations.empty"
                )}
              </p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
