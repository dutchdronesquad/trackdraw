import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Activity, Eye, Users } from "lucide-react";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import {
  ActivationFunnel,
  GrowthTabs,
  MetricsFocusBanner,
  RetentionCohorts,
  SharingHealth,
  UsageTabs,
} from "@/components/dashboard/MetricsChartsLoader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import {
  getAdminMetrics,
  getGrowthByRange,
  getGrowthTimeline,
  getProductInsights,
} from "@/lib/server/metrics";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return {
    title: `${tCommon("labels.dashboard")} ${t("pages.metrics")}`,
    robots: { index: false, follow: false },
  };
}

type KpiCardProps = {
  label: string;
  value: number | string;
  sub?: string;
  icon: typeof Users;
};

function KpiCard({ label, value, sub, icon: Icon }: KpiCardProps) {
  return (
    <dl className="bg-card flex min-w-0 items-start gap-3 rounded-xl border p-4">
      <span
        className="bg-muted text-muted-foreground mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-muted-foreground text-sm leading-snug font-medium">
          {label}
        </dt>
        <dd className="text-2xl leading-tight font-bold tabular-nums">
          {value}
        </dd>
        {sub ? (
          <dd className="text-muted-foreground mt-1 text-sm leading-snug">
            {sub}
          </dd>
        ) : null}
      </div>
    </dl>
  );
}

type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  id?: string;
};

function ChartCard({
  title,
  description,
  children,
  className,
  action,
  id,
}: ChartCardProps) {
  return (
    <figure
      id={id}
      className={`bg-card min-w-0 rounded-xl border p-4 sm:p-5 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <figcaption className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </figcaption>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="pt-4">{children}</div>
    </figure>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <h2 id={id} className="text-base font-semibold tracking-tight sm:text-lg">
        {title}
      </h2>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function OperationalSummary({
  rows,
}: {
  rows: Array<{ label: string; value: number; detail: string }>;
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="border-b py-3">
          <dt className="text-muted-foreground text-sm">{row.label}</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{row.value}</dd>
          <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {row.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function DashboardMetricsPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "admin.metrics.read")) {
    notFound();
  }

  const [metrics, insights, growthByRange, growthTimeline] = await Promise.all([
    getAdminMetrics(),
    getProductInsights(),
    getGrowthByRange(),
    getGrowthTimeline(),
  ]);

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const tMetrics = await getTranslations("dashboard.metrics");
  const locale = await getLocale();
  const lastUpdated = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const editorStarts =
    insights.usage.eventTypes30d.find(
      (row) => row.eventType === "editor.session_started"
    )?.count ?? 0;
  const sharePageViews =
    insights.usage.shareSurfaces30d.find((row) => row.surface === "share")
      ?.count ?? 0;
  const embedViews =
    insights.usage.shareSurfaces30d.find((row) => row.surface === "embed")
      ?.count ?? 0;
  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.metrics")}
      />
      <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-6 p-3 pt-0 sm:gap-8 sm:p-4 sm:pt-0">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("pages.metrics")}
            </h1>
            <dl className="text-muted-foreground flex flex-wrap gap-x-2 text-sm">
              <div className="flex gap-1.5">
                <dt className="sr-only">{tMetrics("overview.periodLabel")}</dt>
                <dd>{tMetrics("overview.periodValue")}</dd>
              </div>
              <div className="flex gap-2 before:content-['·']">
                <dt>{tMetrics("overview.updatedLabel")}</dt>
                <dd>
                  <time dateTime={new Date().toISOString()}>{lastUpdated}</time>
                </dd>
              </div>
            </dl>
          </div>
          <Link
            href="/dashboard/metrics/planning"
            prefetch={false}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring self-start rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none sm:self-auto"
          >
            {tMetrics("navigation.planning")}
          </Link>
        </header>

        <section
          id="overview"
          className="scroll-mt-24 space-y-4"
          aria-labelledby="product-pulse-title"
        >
          <SectionHeading
            id="product-pulse-title"
            title={tMetrics("sections.pulse.title")}
            description={tMetrics("sections.pulse.description")}
          />
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              label={tMetrics("kpi.activeAccounts.label")}
              value={metrics.users.activeLastThirtyDays}
              sub={tMetrics("kpi.activeAccounts.sub", {
                pct:
                  metrics.users.total > 0
                    ? Math.round(
                        (metrics.users.activeLastThirtyDays /
                          metrics.users.total) *
                          100
                      )
                    : 0,
              })}
              icon={Users}
            />
            <KpiCard
              label={tMetrics("kpi.editorStarts.label")}
              value={editorStarts}
              sub={tMetrics("kpi.editorStarts.sub", {
                account: insights.usage.accountSessions30d,
                anonymous: insights.usage.anonymousSessions30d,
              })}
              icon={Activity}
            />
            <KpiCard
              label={tMetrics("kpi.viewingSessions.label")}
              value={insights.usage.shareViews30d}
              sub={tMetrics("kpi.viewingSessions.sub", {
                share: sharePageViews,
                embed: embedViews,
              })}
              icon={Eye}
            />
          </div>
        </section>

        <MetricsFocusBanner metrics={metrics} />

        <section
          id="journey"
          aria-labelledby="journey-title"
          className="scroll-mt-24 space-y-4 border-t pt-6 sm:pt-8"
        >
          <SectionHeading
            id="journey-title"
            title={tMetrics("sections.journey.title")}
            description={tMetrics("sections.journey.description")}
          />
          <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-2">
            <ChartCard
              id="account-progression"
              title={tMetrics("activation.title")}
              description={tMetrics("activation.description")}
            >
              <ActivationFunnel activation={insights.activation} />
            </ChartCard>
            <ChartCard
              title={tMetrics("retention.title")}
              description={tMetrics("retention.description")}
            >
              <RetentionCohorts retention={insights.retention} />
            </ChartCard>
          </div>
        </section>

        <section
          id="product-use"
          aria-labelledby="product-use-title"
          className="scroll-mt-24 space-y-4 border-t pt-6 sm:pt-8"
        >
          <SectionHeading
            id="product-use-title"
            title={tMetrics("sections.value.title")}
            description={tMetrics("sections.value.description")}
          />
          <UsageTabs usage={insights.usage} />
        </section>

        <section
          id="growth"
          aria-labelledby="growth-title"
          className="scroll-mt-24 space-y-4 border-t pt-6 sm:pt-8"
        >
          <SectionHeading
            id="growth-title"
            title={tMetrics("sections.growth.title")}
            description={tMetrics("sections.growth.description")}
          />
          <GrowthTabs
            growthByRange={growthByRange}
            growthTimeline={growthTimeline}
            contentGrowth={insights.contentGrowth}
          />
        </section>

        <section
          id="operations"
          aria-labelledby="operations-title"
          className="scroll-mt-24 space-y-4 border-t pt-6 sm:pt-8"
        >
          <SectionHeading
            id="operations-title"
            title={tMetrics("sections.operations.title")}
            description={tMetrics("sections.operations.description")}
          />
          <ChartCard
            id="sharing-health"
            title={tMetrics("health.title")}
            description={tMetrics("health.description")}
          >
            <SharingHealth shares={metrics.shares} gallery={metrics.gallery} />
          </ChartCard>
          <details className="bg-card rounded-xl border p-4 sm:p-5">
            <summary className="cursor-pointer text-sm font-semibold">
              {tMetrics("inventory.showDetails")}
            </summary>
            <div className="pt-4">
              <OperationalSummary
                rows={[
                  {
                    label: tMetrics("inventory.projects"),
                    value: metrics.projects.total,
                    detail: tMetrics("inventory.activeArchived", {
                      active: metrics.projects.active,
                      archived: metrics.projects.archived,
                    }),
                  },
                  {
                    label: tMetrics("inventory.shares"),
                    value: metrics.shares.total,
                    detail: tMetrics("inventory.activeInactive", {
                      active: metrics.shares.totalActive,
                      inactive: metrics.shares.expired + metrics.shares.revoked,
                    }),
                  },
                  {
                    label: tMetrics("inventory.presets"),
                    value: metrics.presets.total,
                    detail: tMetrics("inventory.averagePerUser", {
                      average: metrics.presets.avgPerUser,
                    }),
                  },
                  {
                    label: tMetrics("inventory.apiKeys"),
                    value: metrics.apiKeys.total,
                    detail: tMetrics("inventory.usedActive", {
                      used: insights.usage.apiKeysUsed30d,
                      active: metrics.apiKeys.active,
                    }),
                  },
                ]}
              />
            </div>
          </details>
        </section>
      </main>
    </>
  );
}
