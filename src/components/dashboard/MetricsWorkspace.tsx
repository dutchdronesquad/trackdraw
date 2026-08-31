"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Circle,
  Download,
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
  ContentGrowthChart,
  EditorUsageBreakdown,
  EmbedReachTable,
  ExportUsageBreakdown,
  ShareUsageBreakdown,
  SharingHealth,
  UserGrowthCard,
  UserGrowthRangePicker,
} from "@/components/dashboard/MetricsCharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/AppTooltip";
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

const DICTIONARY_METRICS = [
  "MTR-001",
  "MTR-004",
  "MTR-005",
  "MTR-006",
  "MTR-008",
  "MTR-009",
  "MTR-010",
] as const;

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

const QUALITY_CLASS: Record<MetricsExplorerQuality, string> = {
  healthy: "text-emerald-700 dark:text-emerald-300",
  building: "text-amber-700 dark:text-amber-300",
  low_volume: "text-amber-700 dark:text-amber-300",
  degraded: "text-orange-700 dark:text-orange-300",
  invalid: "text-destructive",
  not_started: "text-muted-foreground",
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

const BUILDING_WINDOW_DAYS = 28;

function buildingProgressDays(measuredSince: string, generatedAt: string) {
  const elapsedMs =
    Date.parse(generatedAt) - Date.parse(`${measuredSince}T00:00:00.000Z`);
  const elapsed = Math.floor(elapsedMs / 86_400_000);
  return {
    elapsed: Math.min(Math.max(elapsed, 0), BUILDING_WINDOW_DAYS),
    total: BUILDING_WINDOW_DAYS,
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
  const progress =
    quality === "building" && measuredSince && generatedAt
      ? buildingProgressDays(measuredSince, generatedAt)
      : null;
  const catchingUp = progress && progress.elapsed >= progress.total;
  const labelText = catchingUp
    ? t("catchingUp")
    : progress
      ? t("buildingProgress", {
          elapsed: progress.elapsed,
          total: progress.total,
        })
      : t(quality);
  const label = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        QUALITY_CLASS[quality]
      )}
    >
      <Circle className="size-2 fill-current" aria-hidden="true" />
      {labelText}
    </span>
  );

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
      : t("notStartedHint");

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

function ExplorerBarRows({
  metric,
  namespace,
}: {
  metric: MetricsExplorerMetric;
  namespace: "sources" | "features";
}) {
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
  const rows = [...metric.rows].sort(
    (left, right) =>
      (right.value ?? 0) - (left.value ?? 0) ||
      left.dimension.localeCompare(right.dimension)
  );

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-48 items-center justify-center text-center text-sm">
        {t(
          metric.quality === "not_started" ? "empty.notStarted" : "empty.noData"
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-3">
      {rows.map((row) => (
        <div key={row.dimension} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>{t(`${namespace}.${row.dimension}`)}</span>
            <span className="font-semibold tabular-nums">
              {formatRowValue(row, percent)}
              <span className="text-muted-foreground ml-2 font-normal">
                {row.numerator}
              </span>
            </span>
          </div>
          <div
            className="bg-muted h-2 overflow-hidden rounded-full"
            role="img"
            aria-label={`${t(`${namespace}.${row.dimension}`)}: ${formatRowValue(row, percent)}`}
          >
            <span
              className="block h-full rounded-full bg-sky-500"
              style={{
                width: `${Math.max(0, Math.min(100, (row.value ?? 0) * 100))}%`,
              }}
            />
          </div>
        </div>
      ))}
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
        dateStyle: "medium",
        timeZone: "UTC",
      }),
    [locale]
  );
  if (metric.rows.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-48 items-center justify-center text-center text-sm">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th scope="col" className="py-2 pr-3 font-medium">
              {t("cohort")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("activated")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("returned")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("rate")}
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              {t("quality")}
            </th>
          </tr>
        </thead>
        <tbody>
          {metric.rows.map((row) => (
            <tr key={row.day} className="border-b last:border-0">
              <td className="py-3 pr-3 font-medium">
                {date.format(new Date(`${row.day}T00:00:00.000Z`))}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {row.denominator ?? "—"}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {row.numerator}
              </td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums">
                {formatRowValue(row, percent)}
              </td>
              <td className="py-3 pl-3 text-right">
                <QualityLabel quality={row.quality} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
    (row) => row.supported === false
  ).length;
  const interfaceSummary = metrics.servedLocales
    .map((row) => `${formatLanguage(row.locale)} ${percent.format(row.share)}`)
    .join(", ");
  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  if (metrics.languages.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-48 items-center justify-center text-center text-sm">
        {t(metrics.quality === "not_started" ? "notStarted" : "noData")}
      </div>
    );
  }

  return (
    <div>
      <dl className="grid border-b pb-5 sm:grid-cols-3">
        <div className="pb-4 sm:pr-5 sm:pb-0">
          <dd className="text-2xl font-semibold tracking-tight tabular-nums">
            {number.format(metrics.totalCreatorSessions)}
          </dd>
          <dt className="text-muted-foreground mt-1 text-xs">
            {t("creatorSessions")}
          </dt>
        </div>
        <div className="border-t py-4 sm:border-t-0 sm:border-l sm:px-5 sm:py-0">
          <dd className="text-2xl font-semibold tracking-tight tabular-nums">
            {metrics.unsupportedCreatorSessions === null
              ? t("belowThresholdValue")
              : number.format(metrics.unsupportedCreatorSessions)}
          </dd>
          <dt className="text-muted-foreground mt-1 text-xs">
            {t("unsupportedLanguageSessions")}
          </dt>
        </div>
        <div className="border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
          <dd className="text-2xl font-semibold tracking-tight tabular-nums">
            {number.format(translationCandidateCount)}
          </dd>
          <dt className="text-muted-foreground mt-1 text-xs">
            {t("translationCandidates")}
          </dt>
        </div>
      </dl>

      <section className="border-b py-5" aria-labelledby="preferred-language">
        <h3 id="preferred-language" className="text-sm font-semibold">
          {t("preferredBrowserLanguage")}
        </h3>
        <div className="text-muted-foreground mt-4 hidden grid-cols-[minmax(12rem,1fr)_8rem_minmax(16rem,1fr)_minmax(16rem,1.4fr)] gap-6 border-b pb-2 text-xs lg:grid">
          <span>{t("language")}</span>
          <span>{t("sessions")}</span>
          <span>{t("share")}</span>
          <span>{t("status")}</span>
        </div>
        <ul className="mt-3 divide-y">
          {metrics.languages.map((row) => (
            <li
              key={row.language}
              className="grid gap-3 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(12rem,1fr)_8rem_minmax(16rem,1fr)_minmax(16rem,1.4fr)] lg:items-start lg:gap-6"
            >
              <div>
                <p className="text-sm font-medium">
                  {formatLanguage(row.language)}
                </p>
              </div>
              <div className="text-muted-foreground text-xs tabular-nums">
                {t("sessionCount", {
                  count: number.format(row.creatorSessions),
                })}
                {metrics.comparisonReady ? (
                  <p className="mt-1.5">
                    {t("previousPeriod", {
                      count: number.format(row.previousCreatorSessions),
                    })}
                  </p>
                ) : null}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="w-9 shrink-0 text-xs font-medium tabular-nums">
                    {percent.format(row.share)}
                  </span>
                  <div
                    className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-label={`${formatLanguage(row.language)} ${percent.format(row.share)}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(row.share * 100)}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--chart-1)]"
                      style={{ width: `${Math.min(row.share * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-muted-foreground text-xs">
                <p className="flex items-center gap-2 font-medium">
                  <span
                    className="bg-muted-foreground size-1.5 shrink-0 rounded-full"
                    aria-hidden="true"
                  />
                  {row.supported === null
                    ? t(
                        row.language === "unknown"
                          ? "unavailable"
                          : "groupedForPrivacy"
                      )
                    : row.supported
                      ? t("supported")
                      : t("candidate")}
                </p>
                {row.countries.length > 0 ? (
                  <p className="mt-1 pl-3.5">
                    {t("leadingCountries")}:{" "}
                    {row.countries
                      .slice(0, 4)
                      .map(
                        (country) =>
                          `${formatCountry(country.country)} ${number.format(country.creatorSessions)}`
                      )
                      .join(" · ")}
                  </p>
                ) : null}
                {row.groupedLanguageCount != null ? (
                  <p className="mt-1 pl-3.5">
                    {t("groupedForPrivacyDetail", {
                      count: number.format(row.groupedLanguageCount),
                    })}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <div className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-relaxed">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <p>
            {metrics.comparisonReady
              ? t("privacyNote")
              : t("privacyAndComparisonNote")}
          </p>
        </div>
      </section>

      {metrics.servedLocales.length > 0 ? (
        <section className="pt-5" aria-labelledby="interface-language">
          <h3 id="interface-language" className="text-sm font-semibold">
            {t("interfaceLanguageUsed")}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("interfaceLanguageDescription")}
          </p>
          <div
            className="bg-muted mt-4 flex h-2.5 overflow-hidden rounded-full"
            role="img"
            aria-label={t("interfaceLanguageSummary", {
              locales: interfaceSummary,
            })}
          >
            {metrics.servedLocales.map((row, index) => (
              <TooltipProvider key={row.locale} delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${formatLanguage(row.locale)} ${percent.format(row.share)}`}
                      className="focus-visible:ring-ring p-0 outline-none focus-visible:ring-2 focus-visible:ring-inset"
                      style={{
                        width: `${Math.min(row.share * 100, 100)}%`,
                        backgroundColor:
                          chartColors[index % chartColors.length],
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          chartColors[index % chartColors.length],
                      }}
                      aria-hidden="true"
                    />
                    <span>{formatLanguage(row.locale)}</span>
                    <span className="font-semibold tabular-nums">
                      {percent.format(row.share)}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </section>
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
  const [activeView, setActiveView] = useState<MetricsView>("overview");
  const [growthRange, setGrowthRange] = useState<GrowthRange>("3m");
  const [growthCustomRange, setGrowthCustomRange] =
    useState<GrowthCustomRange | null>(null);

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
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {header.title}
            </h1>
            <p className="text-muted-foreground text-sm">
              {header.subtitle} · {header.updatedLabel}{" "}
              <time dateTime={header.dateTime}>{header.lastUpdated}</time>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canRunMaintenance ? <RunMetricMaintenanceButton /> : null}
            <UserGrowthRangePicker
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

        <TabsContent value="overview" className="mt-3 space-y-3">
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,1fr)]">
            <section
              className="bg-card min-w-0 rounded-md border p-3"
              aria-label={t("views.userGrowth")}
            >
              <UserGrowthCard
                growthByRange={growthByRange}
                growthTimeline={growthTimeline}
                bare
                compact
                activeRange={growthRange}
                activeCustomRange={growthCustomRange}
                onPresetSelect={setGrowthRange}
                onCustomApply={(value) => {
                  setGrowthCustomRange(value);
                  setGrowthRange("custom");
                }}
                showRangePicker={!header}
              />
            </section>
            <section
              className="bg-card min-w-0 rounded-md border p-3"
              aria-label={t("overview.exportTitle")}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <Download
                  className="text-muted-foreground mt-0.5 size-3.5"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">
                    {t("overview.exportTitle")}
                  </h2>
                  <p className="sr-only">{t("overview.exportNote")}</p>
                </div>
              </div>
              <ExportUsageBreakdown usage={insights.usage} compact />
              <p className="text-muted-foreground mt-2 border-t pt-2 text-xs leading-relaxed">
                {t("overview.exportNote")}
              </p>
            </section>
          </div>

          <section
            className="bg-card min-w-0 rounded-md border"
            aria-labelledby="core-metrics-title"
          >
            <div className="border-b px-3 py-2.5">
              <h2 id="core-metrics-title" className="text-sm font-semibold">
                {t("evidence.title")}
              </h2>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {t("evidence.description")}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th scope="col" className="px-4 py-1.5 font-medium sm:pl-5">
                      {t("evidence.metric")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-1.5 text-right font-medium"
                    >
                      {t("evidence.current")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-1.5 text-right font-medium"
                    >
                      {t("evidence.previous")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-1.5 text-right font-medium"
                    >
                      {t("evidence.change")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-1.5 text-right font-medium"
                    >
                      {t("evidence.quality")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-1.5 text-right font-medium sm:pr-5"
                    >
                      {t("evidence.window")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EVIDENCE_METRICS.map((id) => {
                    const snapshot = snapshots.get(id)!;
                    return (
                      <tr key={id} className="border-b last:border-0">
                        <td className="px-4 py-2 sm:pl-5">
                          <span className="font-medium">
                            {t(`metrics.${id}.name`)}
                          </span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {id}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {formatValue(snapshot, number, percent)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatPreviousValue(snapshot, number, percent)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <MetricDelta snapshot={snapshot} percent={percent} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <QualityLabel
                            quality={snapshot.quality}
                            measuredSince={snapshot.measuredSince}
                            generatedAt={snapshot.generatedAt}
                            windowDays={snapshot.windowDays}
                          />
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums sm:pr-5">
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
          </section>
        </TabsContent>

        <TabsContent value="creators" className="mt-4 space-y-4">
          <section
            className="bg-card min-w-0 rounded-xl border p-4 sm:p-5"
            aria-label={t("views.userGrowth")}
          >
            <UserGrowthCard
              growthByRange={growthByRange}
              growthTimeline={growthTimeline}
              bare
              activeRange={growthRange}
              activeCustomRange={growthCustomRange}
              onPresetSelect={setGrowthRange}
              onCustomApply={(value) => {
                setGrowthCustomRange(value);
                setGrowthRange("custom");
              }}
              showRangePicker={!header}
            />
          </section>
          <section className="bg-card rounded-xl border p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  {t("retention.title")}
                </h2>
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
                  {t("retention.description")}
                </p>
              </div>
              <QualityLabel
                quality={explorer.retention.quality}
                measuredSince={explorer.retention.measuredSince}
                generatedAt={explorer.generatedAt}
              />
            </div>
            <RetentionTable metric={explorer.retention} />
          </section>
        </TabsContent>

        <TabsContent value="audience" className="mt-4 space-y-4">
          <section className="bg-card rounded-xl border p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  {t("acquisition.title")}
                </h2>
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
                  {t("acquisition.description")}
                </p>
              </div>
              <QualityLabel
                quality={explorer.acquisition.quality}
                measuredSince={explorer.acquisition.measuredSince}
                generatedAt={explorer.generatedAt}
              />
            </div>
            <ExplorerBarRows
              metric={explorer.acquisition}
              namespace="sources"
            />
          </section>
          <section className="bg-card rounded-xl border p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  {t("localization.title")}
                </h2>
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
                  {t("localization.description")}
                </p>
              </div>
              <QualityLabel quality={localizationDemand.quality} />
            </div>
            <LocalizationDemandTable metrics={localizationDemand} />
          </section>
        </TabsContent>

        <TabsContent value="creation" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="bg-card rounded-xl border p-4 sm:p-5">
              <h2 className="text-base font-semibold">{t("editor.title")}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("editor.description")}
              </p>
              <div className="mt-5">
                <EditorUsageBreakdown usage={insights.usage} />
              </div>
            </section>
            <section className="bg-card rounded-xl border p-4 sm:p-5">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">
                    {t("adoption.title")}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t("adoption.description")}
                  </p>
                </div>
                <QualityLabel
                  quality={explorer.adoption.quality}
                  measuredSince={explorer.adoption.measuredSince}
                  generatedAt={explorer.generatedAt}
                />
              </div>
              <ExplorerBarRows
                metric={explorer.adoption}
                namespace="features"
              />
            </section>
          </div>
          <section className="bg-card rounded-xl border p-4 sm:p-5">
            <h2 className="text-base font-semibold">{t("content.title")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("content.description")}
            </p>
            <div className="mt-4">
              <ContentGrowthChart data={insights.contentGrowth} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="bg-card rounded-xl border p-4 sm:p-5">
              <h2 className="text-base font-semibold">
                {t("overview.exportTitle")}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("overview.exportNote")}
              </p>
              <div className="mt-5">
                <ExportUsageBreakdown usage={insights.usage} />
              </div>
            </section>
            <section className="bg-card rounded-xl border p-4 sm:p-5">
              <h2 className="text-base font-semibold">{t("sharing.title")}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("sharing.description")}
              </p>
              <div className="mt-5">
                <ShareUsageBreakdown usage={insights.usage} />
              </div>
            </section>
          </div>
          <section className="bg-card rounded-xl border p-4 sm:p-5">
            <h2 className="text-base font-semibold">
              {t("sharing.healthTitle")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("sharing.healthDescription")}
            </p>
            <div className="mt-5">
              <SharingHealth
                shares={metrics.shares}
                gallery={metrics.gallery}
              />
            </div>
          </section>
          <section className="bg-card rounded-xl border p-4 sm:p-5">
            <h2 className="text-base font-semibold">
              {t("sharing.embedTitle")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("sharing.embedDescription")}
            </p>
            <div className="mt-5">
              <EmbedReachTable usage={insights.usage} />
            </div>
          </section>

          <section
            id="operations"
            className="bg-card scroll-mt-20 rounded-xl border"
            aria-labelledby="operations-title"
          >
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
              <div>
                <h2 id="operations-title" className="text-base font-semibold">
                  {t("operations.title")}
                </h2>
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-relaxed">
                  {t("operations.description")}
                </p>
              </div>
              <QualityLabel
                quality={explorer.failures.quality}
                measuredSince={explorer.failures.measuredSince}
                generatedAt={explorer.generatedAt}
                windowDays={explorer.failures.windowDays}
              />
            </div>

            {failureRows.length > 0 ? (
              <>
                <div className="flex flex-col gap-1 border-b px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                  <div>
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">
                      {number.format(failureCount)}
                    </span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      {t("operations.failedAttempts")}
                    </span>
                  </div>
                  {failureWindowEnd ? (
                    <p className="text-muted-foreground text-xs">
                      {t("operations.windowEnd", {
                        date: date.format(
                          new Date(`${failureWindowEnd}T00:00:00.000Z`)
                        ),
                      })}
                    </p>
                  ) : null}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[44rem] text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-left text-xs">
                        <th
                          className="px-4 py-2 font-medium sm:pl-5"
                          scope="col"
                        >
                          {t("operations.operation")}
                        </th>
                        <th className="px-3 py-2 font-medium" scope="col">
                          {t("operations.category")}
                        </th>
                        <th
                          className="px-3 py-2 text-right font-medium"
                          scope="col"
                        >
                          {t("operations.failed")}
                        </th>
                        <th
                          className="px-3 py-2 text-right font-medium"
                          scope="col"
                        >
                          {t("operations.outcomes")}
                        </th>
                        <th
                          className="px-4 py-2 text-right font-medium sm:pr-5"
                          scope="col"
                        >
                          {t("operations.rate")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {failureRows.map((row) => (
                        <tr
                          key={row.dimension}
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-3 font-medium sm:pl-5">
                            {t(`operations.operations.${row.operation}`)}
                          </td>
                          <td className="px-3 py-3">
                            {t(`operations.categories.${row.category}`)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums">
                            {number.format(row.numerator)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {row.denominator === null
                              ? "—"
                              : number.format(row.denominator)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums sm:pr-5">
                            {row.value === null
                              ? "—"
                              : percent.format(row.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y sm:hidden">
                  {failureRows.map((row) => (
                    <li key={`${row.dimension}:mobile`} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">
                          {t(`operations.operations.${row.operation}`)}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {t("operations.failedShort", {
                            count: row.numerator,
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t(`operations.categories.${row.category}`)} ·{" "}
                        {t("operations.mobileSummary", {
                          outcomes:
                            row.denominator === null
                              ? "—"
                              : number.format(row.denominator),
                          rate:
                            row.value === null
                              ? "—"
                              : percent.format(row.value),
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed sm:px-5">
                  {t("operations.lowVolumeNote")}
                </p>
                {explorer.recentFailures.length > 0 ? (
                  <details className="group border-t">
                    <summary className="focus-visible:ring-ring cursor-pointer list-none px-4 py-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none sm:px-5">
                      {t("operations.recentSummary", {
                        count: explorer.recentFailures.length,
                      })}
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

      <details
        id="data-dictionary"
        className="bg-card scroll-mt-20 rounded-xl border p-4 sm:p-5"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          {t("dictionary.title")}
        </summary>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
          {t("dictionary.description")}
        </p>
        <dl className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
          {DICTIONARY_METRICS.map((id) => (
            <div key={id} className="border-t pt-3">
              <dt className="text-sm font-semibold">
                {id} · {t(`metrics.${id}.name`)}
              </dt>
              <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t(`metrics.${id}.definition`)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
