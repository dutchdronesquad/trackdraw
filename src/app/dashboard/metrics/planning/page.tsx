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
      <main className="flex w-full min-w-0 flex-1 flex-col gap-5 p-4 pt-0 pb-6">
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-tight">
              {tMetrics("planningPage.title")}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-[720px] text-sm">
              {tMetrics("planningPage.description")}
            </p>
          </div>
          <dl
            aria-label={tMetrics("planningPage.observedBaseline")}
            className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
          >
            <div className="flex items-baseline gap-1">
              <dd className="text-foreground font-semibold tabular-nums">
                {metrics.users.activeLastThirtyDays}
              </dd>
              <dt>{tMetrics("planningPage.activeCreators")}</dt>
            </div>
            <div className="flex items-baseline gap-1">
              <dd className="text-foreground font-semibold tabular-nums">
                {accountsWithContent}
              </dd>
              <dt>{tMetrics("planningPage.accountsWithContent")}</dt>
            </div>
            <ToneBadge tone="neutral">
              {tMetrics("planningPage.observed")}
            </ToneBadge>
          </dl>
        </header>

        <PlanLimitSimulator
          userDistribution={metrics.userDistribution}
          activeCreators={metrics.users.activeLastThirtyDays}
        />
      </main>
    </>
  );
}
