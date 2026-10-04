"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  MetricsAside,
  type MetricsAsideChange,
} from "@/components/dashboard/MetricsSection";
import type { MetricsExplorerMetric } from "@/lib/metrics-explorer";
import type { ProductActivityAnalysis } from "@/lib/metrics-analysis";
import type { GrowthData, GrowthTimeline } from "@/lib/metrics-growth";
import type {
  ContentGrowthPoint,
  ProductUsageMetrics,
} from "@/lib/server/metrics";
import { isoWeekNumber } from "@/components/dashboard/MetricsVisuals";

function useFormats() {
  const locale = useLocale();
  const t = useTranslations("dashboard.metrics.explorer.asides");
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const signedPercent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  });
  const signedNumber = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  });
  // Higher is better for every metric shown in an aside.
  const relativeChange = (
    current: number,
    previous: number,
    reference: string
  ): MetricsAsideChange | null => {
    if (previous <= 0) return null;
    const change = (current - previous) / previous;
    return {
      text: t("change.relative", {
        change: signedPercent.format(change),
        reference,
      }),
      tone: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
    };
  };
  const pointChange = (
    current: number,
    previous: number
  ): MetricsAsideChange => {
    const points = Math.round((current - previous) * 100);
    return {
      text: t("change.points", { change: signedNumber.format(points) }),
      tone: points > 0 ? "positive" : points < 0 ? "negative" : "neutral",
    };
  };
  return { t, locale, number, percent, relativeChange, pointChange };
}

type AsideLink = { label: string; onClick: () => void };

export function GrowthAside({
  growthData,
  growthTimeline,
  link,
}: {
  growthData: GrowthData | null;
  growthTimeline: GrowthTimeline;
  link?: AsideLink;
}) {
  const { t, number } = useFormats();
  const points = growthData?.userGrowth ?? [];
  const added = points.reduce((total, point) => total + point.users, 0);
  const latest = points.at(-1);
  const previous = points.at(-2);
  return (
    <MetricsAside
      value={number.format(growthTimeline.totalUsers)}
      label={t("growth.label")}
      change={
        growthData
          ? {
              text: t("growth.added", { count: number.format(added) }),
              tone: added > 0 ? "positive" : "neutral",
            }
          : null
      }
      note={
        latest && previous
          ? t("growth.note", {
              latest: number.format(latest.users),
              previous: number.format(previous.users),
            })
          : null
      }
      link={link}
    />
  );
}

function latestRow(metric: MetricsExplorerMetric) {
  return [...metric.rows]
    .filter((row) => row.value !== null)
    .sort((left, right) => right.day.localeCompare(left.day))[0];
}

export function RetentionAside({
  metric,
  link,
}: {
  metric: MetricsExplorerMetric;
  link?: AsideLink;
}) {
  const { t, number, percent, pointChange } = useFormats();
  const row = latestRow(metric);
  if (!row || row.value === null) return null;
  return (
    <MetricsAside
      value={percent.format(row.value)}
      label={t("retention.label")}
      change={
        row.comparisonReady && row.previousValue !== null
          ? pointChange(row.value, row.previousValue)
          : null
      }
      note={
        row.denominator !== null
          ? t("retention.note", {
              returned: number.format(row.numerator),
              activated: number.format(row.denominator),
            })
          : null
      }
      link={link}
    />
  );
}

export function AcquisitionAside({
  metric,
}: {
  metric: MetricsExplorerMetric;
}) {
  const { t, percent } = useFormats();
  const tSources = useTranslations("dashboard.metrics.explorer.sources");
  const rows = [...metric.rows]
    .filter((row) => row.value !== null)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0));
  const top = rows[0];
  if (!top || top.value === null) return null;
  return (
    <MetricsAside
      value={percent.format(top.value)}
      label={t("acquisition.label", { source: tSources(top.dimension) })}
      note={t("acquisition.note", { count: rows.length })}
    />
  );
}

export function JourneyAside({
  analysis,
}: {
  analysis: ProductActivityAnalysis | undefined;
}) {
  const { t, percent } = useFormats();
  const journey = analysis?.journey;
  if (!journey || journey.started === 0) return null;
  const startToEdit = journey.started
    ? (journey.started - journey.edited) / journey.started
    : 0;
  const editToResult = journey.edited
    ? (journey.edited - journey.valuable) / journey.edited
    : 0;
  return (
    <MetricsAside
      value={percent.format(journey.valuable / journey.started)}
      label={t("journey.label")}
      note={t(
        startToEdit >= editToResult
          ? "journey.dropBeforeEdit"
          : "journey.dropBeforeResult",
        {
          rate: percent.format(Math.max(startToEdit, editToResult)),
        }
      )}
    />
  );
}

export function TimingAside({
  analysis,
}: {
  analysis: ProductActivityAnalysis | undefined;
}) {
  const { t, number } = useFormats();
  const timing = analysis?.timeToResult;
  if (!timing || timing.medianSeconds === null) return null;
  const format = (seconds: number) =>
    seconds < 60
      ? t("timing.seconds", { value: number.format(seconds) })
      : t("timing.minutes", { value: number.format(seconds / 60) });
  return (
    <MetricsAside
      value={format(timing.medianSeconds)}
      label={t("timing.label")}
      note={t("timing.note", {
        p75: timing.p75Seconds === null ? "—" : format(timing.p75Seconds),
        samples: number.format(timing.samples),
      })}
    />
  );
}

export function ContentAside({ points }: { points: ContentGrowthPoint[] }) {
  const { t, number, relativeChange } = useFormats();
  const latest = points.at(-1);
  if (!latest) return null;
  const previous = points.at(-2);
  return (
    <MetricsAside
      value={number.format(latest.projects)}
      label={t("content.label")}
      change={
        previous
          ? relativeChange(latest.projects, previous.projects, t("content.ref"))
          : null
      }
      note={t("content.note", {
        shares: number.format(latest.shares),
        presets: number.format(latest.presets),
      })}
    />
  );
}

export function ExportReliabilityAside({
  analysis,
}: {
  analysis: ProductActivityAnalysis | undefined;
}) {
  const { t, number, percent } = useFormats();
  const formats = useTranslations(
    "dashboard.metrics.explorer.operations.formats"
  );
  const rows = analysis?.exportReliability ?? [];
  const successes = rows.reduce((total, row) => total + row.successes, 0);
  const failures = rows.reduce((total, row) => total + row.failures, 0);
  if (successes + failures === 0) return null;
  const comparable = rows.filter((row) => row.failureRate !== null);
  const worst = [...comparable]
    .filter((row) => row.failures > 0)
    .sort(
      (left, right) => (right.failureRate ?? 0) - (left.failureRate ?? 0)
    )[0];
  const others = comparable.filter((row) => row !== worst);
  const otherAttempts = others.reduce(
    (total, row) => total + row.successes + row.failures,
    0
  );
  const otherFailures = others.reduce((total, row) => total + row.failures, 0);
  const otherRate = otherAttempts ? otherFailures / otherAttempts : 0;
  const ratio =
    worst?.failureRate && otherRate > 0 ? worst.failureRate / otherRate : null;
  const formatName = (format: string) =>
    formats.has(format) ? formats(format) : format.toUpperCase();
  return (
    <MetricsAside
      value={number.format(successes)}
      label={t("exports.completedLabel")}
      change={
        worst && ratio !== null && ratio >= 1.5
          ? {
              text: t("exports.ratio", {
                format: formatName(worst.format),
                ratio: Math.round(ratio),
              }),
              tone: "warning",
            }
          : null
      }
      note={
        worst && worst.failureRate !== null
          ? t("exports.worst", {
              format: formatName(worst.format),
              rate: percent.format(worst.failureRate),
            })
          : t("exports.none", { count: number.format(successes) })
      }
    />
  );
}

export function ShareReachAside({
  analysis,
  usage,
  link,
}: {
  analysis: ProductActivityAnalysis | undefined;
  usage: ProductUsageMetrics | undefined;
  link?: AsideLink;
}) {
  const { t, number, percent, relativeChange } = useFormats();
  const weeks = analysis?.weeks ?? [];
  const latest = weeks.at(-1);
  if (!latest || !usage) return null;
  const previous = weeks.at(-2);
  const totalViews = weeks.reduce((total, week) => total + week.views, 0);
  const embedViews = weeks.reduce((total, week) => total + week.embedViews, 0);
  const exportBreakdown = [...usage.exportFormats]
    .sort((left, right) => right.count - left.count)
    .slice(0, 4)
    .map(
      (row) =>
        `${row.format.toUpperCase()} ${percent.format(
          usage.exports ? row.count / usage.exports : 0
        )}`
    )
    .join(", ");
  return (
    <MetricsAside
      value={number.format(latest.views)}
      label={t("shareReach.label", { week: isoWeekNumber(latest.week) })}
      change={
        previous
          ? relativeChange(
              latest.views,
              previous.views,
              t("shareReach.ref", { week: isoWeekNumber(previous.week) })
            )
          : null
      }
      note={
        totalViews > 0
          ? t("shareReach.note", {
              share: percent.format(embedViews / totalViews),
            })
          : null
      }
      detail={
        usage.exports > 0
          ? t("shareReach.exports", {
              count: number.format(usage.exports),
              breakdown: exportBreakdown,
            })
          : null
      }
      link={link}
    />
  );
}

export function EmbedShareAside({
  analysis,
  usage,
}: {
  analysis: ProductActivityAnalysis | undefined;
  usage: ProductUsageMetrics | undefined;
}) {
  const { t, number, percent, pointChange } = useFormats();
  const weeks = (analysis?.weeks ?? []).filter((week) => week.views > 0);
  const totalViews = weeks.reduce((total, week) => total + week.views, 0);
  if (totalViews === 0) return null;
  const embedViews = weeks.reduce((total, week) => total + week.embedViews, 0);
  const first = weeks[0];
  const last = weeks.at(-1)!;
  const firstShare = first.embedViews / first.views;
  const lastShare = last.embedViews / last.views;
  const topSite = usage?.embedReferrers[0];
  return (
    <MetricsAside
      value={percent.format(embedViews / totalViews)}
      label={t("embedShare.label")}
      change={
        weeks.length > 1
          ? {
              ...pointChange(lastShare, firstShare),
              text: t("embedShare.since", {
                share: percent.format(firstShare),
                week: isoWeekNumber(first.week),
              }),
            }
          : null
      }
      note={
        topSite
          ? t("embedShare.topSite", {
              host: topSite.hostname,
              views: number.format(topSite.views),
            })
          : null
      }
    />
  );
}
