"use client";

import dynamic from "next/dynamic";

export const UserPopulationChart = dynamic(
  () => import("./MetricsCharts").then((m) => m.UserPopulationChart),
  { ssr: false }
);

export const UserGrowthCard = dynamic(
  () => import("./MetricsCharts").then((m) => m.UserGrowthCard),
  { ssr: false }
);

export const ActivationFunnel = dynamic(
  () => import("./MetricsCharts").then((m) => m.ActivationFunnel),
  { ssr: false }
);

export const ContentGrowthChart = dynamic(
  () => import("./MetricsCharts").then((m) => m.ContentGrowthChart),
  { ssr: false }
);

export const SharingHealth = dynamic(
  () => import("./MetricsCharts").then((m) => m.SharingHealth),
  { ssr: false }
);

export const DistributionSummary = dynamic(
  () => import("./MetricsCharts").then((m) => m.DistributionSummary),
  { ssr: false }
);

export const MetricsFocusBanner = dynamic(
  () => import("./MetricsCharts").then((m) => m.MetricsFocusBanner),
  { ssr: false }
);

export const ExportUsageBreakdown = dynamic(
  () => import("./MetricsCharts").then((m) => m.ExportUsageBreakdown),
  { ssr: false }
);

export const ShareUsageBreakdown = dynamic(
  () => import("./MetricsCharts").then((m) => m.ShareUsageBreakdown),
  { ssr: false }
);

export const EditorUsageBreakdown = dynamic(
  () => import("./MetricsCharts").then((m) => m.EditorUsageBreakdown),
  { ssr: false }
);

export const RetentionCohorts = dynamic(
  () => import("./MetricsCharts").then((m) => m.RetentionCohorts),
  { ssr: false }
);

export const PlanLimitSimulator = dynamic(
  () => import("./MetricsCharts").then((m) => m.PlanLimitSimulator),
  { ssr: false }
);
