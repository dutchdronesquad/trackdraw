import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import {
  DistributionSummary,
  PlanLimitSimulator,
} from "@/components/dashboard/MetricsChartsLoader";
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

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.metrics")}
      />
      <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-6 p-3 pt-0 pb-6 sm:p-4 sm:pt-0">
        <header className="space-y-3">
          <Link
            href="/dashboard/metrics"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-2 rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {tMetrics("planningPage.back")}
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {tMetrics("planningPage.title")}
            </h1>
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              {tMetrics("planningPage.description")}
            </p>
          </div>
        </header>

        <section
          aria-labelledby="distribution-title"
          className="bg-card rounded-xl border p-4 sm:p-5"
        >
          <div className="space-y-1">
            <h2 id="distribution-title" className="text-base font-semibold">
              {tMetrics("distribution.title")}
            </h2>
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              {tMetrics("distribution.description")}
            </p>
          </div>
          <div className="pt-4">
            <DistributionSummary userDistribution={metrics.userDistribution} />
          </div>
        </section>

        <section aria-labelledby="plan-limit-title" className="space-y-4">
          <div className="max-w-3xl space-y-1">
            <h2 id="plan-limit-title" className="text-base font-semibold">
              {tMetrics("planLimit.title")}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {tMetrics("planLimit.description")}
            </p>
          </div>
          <PlanLimitSimulator userDistribution={metrics.userDistribution} />
        </section>
      </main>
    </>
  );
}
