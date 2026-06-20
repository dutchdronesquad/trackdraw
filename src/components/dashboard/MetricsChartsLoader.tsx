"use client";

import dynamic from "next/dynamic";

export const UserPopulationChart = dynamic(
  () => import("./MetricsCharts").then((m) => m.UserPopulationChart),
  { ssr: false }
);

export const ContentOverviewChart = dynamic(
  () => import("./MetricsCharts").then((m) => m.ContentOverviewChart),
  { ssr: false }
);

export const UserGrowthChart = dynamic(
  () => import("./MetricsCharts").then((m) => m.UserGrowthChart),
  { ssr: false }
);

export const PlanLimitChart = dynamic(
  () => import("./MetricsCharts").then((m) => m.PlanLimitChart),
  { ssr: false }
);
