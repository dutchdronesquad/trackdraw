"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  BookOpen,
  Circle,
  Compass,
  Download,
  RefreshCcw,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";

type MetricsWorkspaceProps = {
  metrics: AdminMetrics;
  insights: ProductInsights;
  growthByRange: GrowthByRange;
  growthTimeline: GrowthTimeline;
  cockpit: DailyCockpitData;
  explorer: MetricsExplorerData;
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
};

type MetricsView =
  | "overview"
  | "user-growth"
  | "editor"
  | "exports"
  | "sharing"
  | "acquisition"
  | "content"
  | "retention";

const JOURNEY_STAGES = [
  { key: "acquisition", id: "MTR-008", view: "acquisition" },
  { key: "activation", id: "MTR-004", view: "editor" },
  { key: "engagement", id: "MTR-001", view: "overview" },
  { key: "sharing", id: "MTR-006", view: "sharing" },
  { key: "retention", id: "MTR-005", view: "retention" },
] as const;

const EVIDENCE_METRICS = ["MTR-001", "MTR-004", "MTR-006", "MTR-005"] as const;

const DICTIONARY_METRICS = [
  "MTR-001",
  "MTR-004",
  "MTR-005",
  "MTR-006",
  "MTR-008",
  "MTR-009",
] as const;

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

function QualityLabel({ quality }: { quality: MetricsExplorerQuality }) {
  const t = useTranslations("dashboard.metrics.explorer.quality");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        QUALITY_CLASS[quality]
      )}
    >
      <Circle className="size-2 fill-current" aria-hidden="true" />
      {t(quality)}
    </span>
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
    (left, right) => (right.value ?? 0) - (left.value ?? 0)
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

export default function MetricsWorkspace({
  metrics,
  insights,
  growthByRange,
  growthTimeline,
  cockpit,
  explorer,
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
        },
      ],
    ];
    return new Map<ProductMetricId, MetricSnapshot>([
      ...entries,
      ...explorerEntries,
    ]);
  }, [cockpit.headlines, explorer]);

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
        </header>
      ) : null}

      <nav aria-label={t("journey.label")} className="overflow-x-auto pb-1">
        <ol className="grid min-w-[54rem] grid-cols-5 px-2 pt-2">
          {JOURNEY_STAGES.map(({ key, id, view }, index) => {
            const snapshot = snapshots.get(id)!;
            const active = activeView === view;
            return (
              <li
                key={id}
                className="after:bg-border relative after:absolute after:top-2.5 after:left-8 after:h-px after:w-[calc(100%-2rem)] last:after:hidden"
              >
                <button
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={cn(
                    "focus-visible:ring-ring group relative z-10 flex min-h-24 w-full flex-col items-start gap-1 px-2 pb-3 text-left focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "bg-background mb-1 flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums",
                      active
                        ? "border-sky-500 text-sky-500"
                        : "border-muted-foreground/60"
                    )}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium">
                    {t(`journey.${key}.label`)}
                  </span>
                  <QualityLabel quality={snapshot.quality} />
                  <span className="mt-0.5 text-base font-semibold tabular-nums">
                    {snapshot.valueKind === "mix" || snapshot.value === null
                      ? t(`journey.${key}.value`)
                      : formatValue(snapshot, number, percent)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as MetricsView)}
        className="min-w-0"
      >
        <div className="flex items-end justify-between gap-4 border-b">
          <div className="overflow-x-auto">
            <TabsList
              className="h-auto min-w-max justify-start rounded-none bg-transparent p-0"
              aria-label={t("views.label")}
            >
              {(
                [
                  "overview",
                  "user-growth",
                  "editor",
                  "exports",
                  "sharing",
                ] as const
              ).map((view) => (
                <TabsTrigger
                  key={view}
                  value={view}
                  className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {t(`views.${view === "user-growth" ? "userGrowth" : view}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <Link
            href="/dashboard/metrics/planning"
            prefetch={false}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-2 hidden shrink-0 items-center gap-1.5 rounded-sm text-xs font-medium focus-visible:ring-2 focus-visible:outline-none sm:inline-flex"
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            {t("views.about")}
          </Link>
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
              aria-label={t("views.exports")}
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
            aria-labelledby="journey-evidence-title"
          >
            <div className="border-b px-3 py-2.5">
              <h2 id="journey-evidence-title" className="text-sm font-semibold">
                {t("evidence.title")}
              </h2>
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
                        <td className="px-4 py-2 font-medium sm:pl-5">
                          {t(`metrics.${id}.name`)}
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
                          <QualityLabel quality={snapshot.quality} />
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums sm:pr-5">
                          {t("windowDays", { days: snapshot.windowDays })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="user-growth" className="mt-3">
          <section
            className="bg-card min-w-0 rounded-md border p-3"
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
        </TabsContent>

        {activeView === "acquisition" ? (
          <div className="mt-4">
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
                <QualityLabel quality={explorer.acquisition.quality} />
              </div>
              <ExplorerBarRows
                metric={explorer.acquisition}
                namespace="sources"
              />
            </section>
          </div>
        ) : null}

        <TabsContent value="editor" className="mt-4 space-y-4">
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
                <QualityLabel quality={explorer.adoption.quality} />
              </div>
              <ExplorerBarRows
                metric={explorer.adoption}
                namespace="features"
              />
            </section>
          </div>
        </TabsContent>

        {activeView === "content" ? (
          <div className="mt-4">
            <section className="bg-card rounded-xl border p-4 sm:p-5">
              <h2 className="text-base font-semibold">{t("content.title")}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("content.description")}
              </p>
              <div className="mt-4">
                <ContentGrowthChart data={insights.contentGrowth} />
              </div>
            </section>
          </div>
        ) : null}

        <TabsContent value="exports" className="mt-4">
          <section className="bg-card max-w-4xl rounded-xl border p-4 sm:p-5">
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
        </TabsContent>

        <TabsContent value="sharing" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="bg-card rounded-xl border p-4 sm:p-5">
              <h2 className="text-base font-semibold">{t("sharing.title")}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("sharing.description")}
              </p>
              <div className="mt-5">
                <ShareUsageBreakdown usage={insights.usage} />
              </div>
            </section>
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
          </div>
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
        </TabsContent>

        {activeView === "retention" ? (
          <div className="mt-4">
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
                <QualityLabel quality={explorer.retention.quality} />
              </div>
              <RetentionTable metric={explorer.retention} />
            </section>
          </div>
        ) : null}
      </Tabs>

      <nav
        aria-label={t("explore.label")}
        className="bg-card flex min-w-0 flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center"
      >
        <span className="text-muted-foreground shrink-0 text-xs">
          {t("explore.label")}
        </span>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {(
            [
              { view: "acquisition", key: "acquisition", icon: Compass },
              { view: "content", key: "content", icon: Activity },
              { view: "retention", key: "retention", icon: RefreshCcw },
            ] as const
          ).map(({ view, key, icon: Icon }) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              aria-pressed={activeView === view}
              className={cn(
                "hover:bg-muted focus-visible:ring-ring inline-flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none",
                activeView === view && "bg-muted text-foreground"
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {t(`explore.${key}`)}
            </button>
          ))}
        </div>
      </nav>

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
