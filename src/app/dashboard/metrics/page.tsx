import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Activity, Download, Eye, Users } from "lucide-react";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import {
  ActivationFunnel,
  ContentGrowthChart,
  EmbedReachTable,
  MetricsFocusBanner,
  RetentionCohorts,
  SharingHealth,
  UsageTabs,
  UserGrowthCard,
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
  accent: string;
  iconTone: string;
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  iconTone,
}: KpiCardProps) {
  return (
    <dl className="bg-card min-w-0 overflow-hidden rounded-xl border">
      <div className={`h-1 ${accent}`} />
      <div className="flex items-start gap-3 p-4">
        <span
          className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <dt className="text-muted-foreground min-h-8 text-sm leading-snug font-medium sm:min-h-0">
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
  const sharePageViews =
    insights.usage.shareSurfaces30d.find((row) => row.surface === "share")
      ?.count ?? 0;
  const embedViews =
    insights.usage.shareSurfaces30d.find((row) => row.surface === "embed")
      ?.count ?? 0;
  const activationRate =
    insights.activation.registered > 0
      ? Math.round(
          (insights.activation.createdProject /
            insights.activation.registered) *
            100
        )
      : 0;
  const matureRetentionUsers = insights.retention.reduce(
    (total, cohort) => total + cohort.users,
    0
  );
  const retainedThirtyDays = insights.retention.reduce(
    (total, cohort) => total + cohort.retained30d,
    0
  );
  const retentionThirtyDayRate =
    matureRetentionUsers > 0
      ? Math.round((retainedThirtyDays / matureRetentionUsers) * 100)
      : 0;

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.metrics")}
      />
      <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-8 p-3 pt-0 sm:gap-10 sm:p-4 sm:pt-0">
        <header className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("pages.metrics")}
            </h1>
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              {tMetrics("overview.description")}
            </p>
          </div>
          <dl className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <div className="flex gap-1.5">
              <dt className="font-medium">
                {tMetrics("overview.periodLabel")}
              </dt>
              <dd>{tMetrics("overview.periodValue")}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-medium">
                {tMetrics("overview.compareLabel")}
              </dt>
              <dd>{tMetrics("overview.compareValue")}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-medium">
                {tMetrics("overview.definitionsLabel")}
              </dt>
              <dd>{tMetrics("overview.definitionsValue")}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-medium">
                {tMetrics("overview.updatedLabel")}
              </dt>
              <dd>
                <time dateTime={new Date().toISOString()}>{lastUpdated}</time>
              </dd>
            </div>
          </dl>
        </header>

        <nav
          aria-label={tMetrics("navigation.label")}
          className="bg-background/95 sticky top-0 z-20 -mx-3 overflow-x-auto border-y px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4"
        >
          <div className="flex min-w-max items-center gap-1">
            {[
              ["#overview", tMetrics("navigation.overview")],
              ["#journey", tMetrics("navigation.journey")],
              ["#product-use", tMetrics("navigation.usage")],
              ["#growth", tMetrics("navigation.growth")],
              ["#operations", tMetrics("navigation.health")],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="hover:bg-muted focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                {label}
              </a>
            ))}
            <Link
              href="/dashboard/metrics/planning"
              className="hover:bg-muted focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              {tMetrics("navigation.planning")}
            </Link>
          </div>
        </nav>

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
          <div className="grid min-w-0 grid-cols-1 gap-3 min-[460px]:grid-cols-2 xl:grid-cols-4">
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
              accent="bg-emerald-500"
              iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <KpiCard
              label={tMetrics("kpi.activation.label")}
              value={`${activationRate}%`}
              sub={tMetrics("kpi.activation.sub", {
                activated: insights.activation.createdProject,
                registered: insights.activation.registered,
              })}
              icon={Activity}
              accent="bg-sky-500"
              iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            />
            <KpiCard
              label={tMetrics("kpi.retention.label")}
              value={
                matureRetentionUsers > 0 ? `${retentionThirtyDayRate}%` : "—"
              }
              sub={tMetrics("kpi.retention.sub", {
                cohorts: insights.retention.length,
              })}
              icon={Download}
              accent="bg-violet-500"
              iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <KpiCard
              label={tMetrics("kpi.publishedReach.label")}
              value={insights.usage.shareViews30d}
              sub={tMetrics("kpi.publishedReach.sub", {
                share: sharePageViews,
                embed: embedViews,
              })}
              icon={Eye}
              accent="bg-orange-500"
              iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
          </div>
        </section>

        <MetricsFocusBanner metrics={metrics} insights={insights} />

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
          <div className="space-y-4">
            <UsageTabs usage={insights.usage} />
            <ChartCard
              id="embed-reach"
              title={tMetrics("embedReach.title")}
              description={tMetrics("embedReach.description")}
            >
              <EmbedReachTable usage={insights.usage} />
            </ChartCard>
          </div>
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
          <UserGrowthCard
            growthByRange={growthByRange}
            growthTimeline={growthTimeline}
          />
          <ChartCard
            title={tMetrics("contentGrowth.title")}
            description={tMetrics("contentGrowth.description")}
          >
            <ContentGrowthChart data={insights.contentGrowth} />
          </ChartCard>
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
