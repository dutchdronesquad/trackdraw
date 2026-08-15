import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { PlanLimitSimulator } from "@/components/dashboard/MetricsChartsLoader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { getAdminMetrics } from "@/lib/server/metrics";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.metrics.planningPage");
  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function MetricsPlanningPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "admin.metrics.read")) {
    notFound();
  }

  const metrics = await getAdminMetrics();
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const tMetrics = await getTranslations("dashboard.metrics");
  const accountsWithContent = metrics.userDistribution.filter(
    ([projects, shares, presets]) => projects > 0 || shares > 0 || presets > 0
  ).length;

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.metrics")}
      />
      <main className="flex w-full min-w-0 flex-1 flex-col gap-6 p-4 pt-0 pb-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {tMetrics("planningPage.title")}
          </h1>
          <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
            {tMetrics("planningPage.description")}
          </p>
        </header>

        <section
          aria-label={tMetrics("planningPage.observedBaseline")}
          className="grid border-y sm:grid-cols-2"
        >
          <div className="py-4 sm:pr-6">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold tabular-nums">
                {metrics.users.activeLastThirtyDays}
              </p>
              <p className="text-sm font-medium">
                {tMetrics("planningPage.activeCreators")}
              </p>
              <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                {tMetrics("planningPage.observed")}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {tMetrics("planningPage.activeCreatorsSource")}
            </p>
          </div>
          <div className="border-t py-4 sm:border-t-0 sm:border-l sm:pl-6">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold tabular-nums">
                {accountsWithContent}
              </p>
              <p className="text-sm font-medium">
                {tMetrics("planningPage.accountsWithContent")}
              </p>
              <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                {tMetrics("planningPage.observed")}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {tMetrics("planningPage.accountsSource")}
            </p>
          </div>
        </section>

        <PlanLimitSimulator
          userDistribution={metrics.userDistribution}
          activeCreators={metrics.users.activeLastThirtyDays}
        />
      </main>
    </>
  );
}
