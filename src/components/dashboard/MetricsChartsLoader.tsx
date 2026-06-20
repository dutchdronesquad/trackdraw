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

export const UserGrowthCard = dynamic(
  () => import("./MetricsCharts").then((m) => m.UserGrowthCard),
  { ssr: false }
);

export const PlanLimitSimulator = dynamic(
  () => import("./MetricsCharts").then((m) => m.PlanLimitSimulator),
  { ssr: false }
);
