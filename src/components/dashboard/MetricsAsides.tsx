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
import type { LocalizationDemandMetrics } from "@/lib/server/localization-demand";

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

export function GrowthAside({
  growthData,
  growthTimeline,
}: {
  growthData: GrowthData | null;
  growthTimeline: GrowthTimeline;
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
    />
  );
}

export function WeeklyAside({
  analysis,
}: {
  analysis: ProductActivityAnalysis | undefined;
}) {
  const { t, number, percent, relativeChange } = useFormats();
  const latest = analysis?.weeks.at(-1);
  if (!latest) return null;
  const previous = analysis?.weeks.at(-2);
  return (
    <MetricsAside
      value={number.format(latest.started)}
      label={t("weekly.label")}
      change={
        previous
          ? relativeChange(latest.started, previous.started, t("weekly.ref"))
          : null
      }
      note={t("weekly.note", {
        valuable: number.format(latest.valuable),
        rate: latest.started
          ? percent.format(latest.valuable / latest.started)
          : "—",
      })}
    />
  );
}

function latestRow(metric: MetricsExplorerMetric) {
  return [...metric.rows]
    .filter((row) => row.value !== null)
    .sort((left, right) => right.day.localeCompare(left.day))[0];
}

export function RetentionAside({ metric }: { metric: MetricsExplorerMetric }) {
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

export function LocalizationAside({
  metrics,
}: {
  metrics: LocalizationDemandMetrics | null | undefined;
}) {
  const { t, locale, number, percent } = useFormats();
  if (!metrics || metrics.totalCreatorSessions === 0) return null;
  const unsupported = metrics.unsupportedCreatorSessions ?? 0;
  const candidate = [...metrics.languages]
    .filter(
      (language) =>
        language.supported === false &&
        language.language !== "other" &&
        language.language !== "unknown"
    )
    .sort((left, right) => right.creatorSessions - left.creatorSessions)[0];
  const languageName = candidate
    ? (new Intl.DisplayNames([locale], { type: "language" }).of(
        candidate.language
      ) ?? candidate.language)
    : null;
  return (
    <MetricsAside
      value={percent.format(unsupported / metrics.totalCreatorSessions)}
      label={t("localization.label")}
      note={
        candidate && languageName
          ? t("localization.note", {
              language: languageName,
              sessions: number.format(candidate.creatorSessions),
            })
          : t("localization.noCandidate")
      }
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
  const rows = analysis?.exportReliability ?? [];
  const successes = rows.reduce((total, row) => total + row.successes, 0);
  const failures = rows.reduce((total, row) => total + row.failures, 0);
  if (successes + failures === 0) return null;
  const worst = [...rows]
    .filter((row) => row.failures > 0 && row.failureRate !== null)
    .sort(
      (left, right) => (right.failureRate ?? 0) - (left.failureRate ?? 0)
    )[0];
  return (
    <MetricsAside
      value={percent.format(failures / (successes + failures))}
      label={t("exports.label")}
      note={
        worst && worst.failureRate !== null
          ? t("exports.worst", {
              format: worst.format.toUpperCase(),
              rate: percent.format(worst.failureRate),
            })
          : t("exports.none", { count: number.format(successes) })
      }
    />
  );
}

export function EmbedAside({ usage }: { usage: ProductUsageMetrics }) {
  const { t, number } = useFormats();
  const summary = usage.embedReferrerSummary;
  if (summary.views === 0) return null;
  return (
    <MetricsAside
      value={number.format(summary.views)}
      label={t("embeds.label")}
      note={t("embeds.note", { count: number.format(summary.hostnames) })}
    />
  );
}

export function ExportUsageAside({ usage }: { usage: ProductUsageMetrics }) {
  const { t, number, percent } = useFormats();
  if (usage.exports === 0) return null;
  const top = [...usage.exportFormats].sort(
    (left, right) => right.count - left.count
  )[0];
  return (
    <MetricsAside
      value={number.format(usage.exports)}
      label={t("exportUsage.label")}
      note={
        top
          ? t("exportUsage.note", {
              format: top.format.toUpperCase(),
              share: percent.format(top.count / usage.exports),
            })
          : null
      }
    />
  );
}
