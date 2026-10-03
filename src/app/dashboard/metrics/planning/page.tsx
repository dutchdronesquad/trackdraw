import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ToneBadge from "@/components/dashboard/ToneBadge";
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
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {tMetrics("planningPage.title")}
            </h1>
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              {tMetrics("planningPage.description")}
            </p>
          </div>
          <section
            aria-label={tMetrics("planningPage.observedBaseline")}
            className="flex flex-col gap-1 lg:items-end"
          >
            <dl className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <div className="flex items-baseline gap-1.5">
                <dd className="text-foreground font-semibold tabular-nums">
                  {metrics.users.activeLastThirtyDays}
                </dd>
                <dt>{tMetrics("planningPage.activeCreators")}</dt>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dd className="text-foreground font-semibold tabular-nums">
                  {accountsWithContent}
                </dd>
                <dt>{tMetrics("planningPage.accountsWithContent")}</dt>
              </div>
              <ToneBadge tone="amber">
                {tMetrics("planningPage.observed")}
              </ToneBadge>
            </dl>
            <p className="text-muted-foreground max-w-xl text-xs lg:text-right">
              {tMetrics("planningPage.activeCreatorsSource")}{" "}
              {tMetrics("planningPage.accountsSource")}
            </p>
          </section>
        </header>

        <PlanLimitSimulator
          userDistribution={metrics.userDistribution}
          activeCreators={metrics.users.activeLastThirtyDays}
        />
      </main>
    </>
  );
}
