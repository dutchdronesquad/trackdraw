"use client";

import dynamic from "next/dynamic";

export const PlanLimitSimulator = dynamic(
  () => import("./MetricsCharts").then((m) => m.PlanLimitSimulator),
  { ssr: false }
);

export const MetricsWorkspace = dynamic(() => import("./MetricsWorkspace"), {
  ssr: false,
});
