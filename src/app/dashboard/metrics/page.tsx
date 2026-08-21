import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import {
  MetricsFocusBanner,
  MetricsWorkspace,
} from "@/components/dashboard/MetricsChartsLoader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { getDailyCockpit } from "@/lib/server/dashboard-cockpit";
import {
  getAdminMetrics,
  getGrowthByRange,
  getGrowthTimeline,
  getProductInsights,
} from "@/lib/server/metrics";
import { getMetricsExplorerData } from "@/lib/server/metrics-explorer";
import { getLocalizationDemandMetrics } from "@/lib/server/localization-demand";
import { create24HourDateTimeFormatter } from "@/lib/date-time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return {
    title: `${tCommon("labels.dashboard")} ${t("pages.metrics")}`,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardMetricsPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "admin.metrics.read")) {
    notFound();
  }

  const now = new Date();
  const [
    metrics,
    insights,
    growthByRange,
    growthTimeline,
    cockpit,
    explorer,
    localizationDemand,
  ] = await Promise.all([
    getAdminMetrics(),
    getProductInsights(),
    getGrowthByRange(),
    getGrowthTimeline(),
    getDailyCockpit(now),
    getMetricsExplorerData(now),
    getLocalizationDemandMetrics(now),
  ]);

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const tMetrics = await getTranslations("dashboard.metrics");
  const locale = await getLocale();
  const lastUpdated = create24HourDateTimeFormatter(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now);

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.metrics")}
      />
      <main className="flex w-full min-w-0 flex-1 flex-col gap-5 p-4 pt-0">
        <MetricsFocusBanner metrics={metrics} />

        <MetricsWorkspace
          metrics={metrics}
          insights={insights}
          growthByRange={growthByRange}
          growthTimeline={growthTimeline}
          cockpit={cockpit}
          explorer={explorer}
          localizationDemand={localizationDemand}
          header={{
            title: tMetrics("explorer.header.title"),
            subtitle: tMetrics("explorer.header.subtitle"),
            updatedLabel: tMetrics("overview.updatedLabel"),
            lastUpdated,
            dateTime: now.toISOString(),
          }}
        />
      </main>
    </>
  );
}
