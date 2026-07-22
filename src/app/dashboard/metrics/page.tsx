import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Activity, Download, Eye, Users } from "lucide-react";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import {
  ActivationFunnel,
  ContentGrowthChart,
  DistributionSummary,
  EditorUsageBreakdown,
  ExportUsageBreakdown,
  MetricsFocusBanner,
  PlanLimitSimulator,
  RetentionCohorts,
  ShareUsageBreakdown,
  SharingHealth,
  UserGrowthCard,
  UserPopulationChart,
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
    <div className="bg-card min-w-0 overflow-hidden rounded-xl border">
      <div className={`h-1 ${accent}`} />
      <div className="flex items-start gap-3 p-4">
        <span
          className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground min-h-8 text-xs leading-snug font-medium sm:min-h-0">
            {label}
          </p>
          <p className="text-2xl leading-tight font-bold tabular-nums">
            {value}
          </p>
          {sub ? (
            <p className="text-muted-foreground mt-1 text-xs leading-snug">
              {sub}
            </p>
          ) : null}
        </div>
      </div>
    </div>
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
    <div
      id={id}
      className={`bg-card min-w-0 rounded-xl border p-4 sm:p-5 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="pt-4">{children}</div>
    </div>
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
    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="border-b py-3">
          <p className="text-muted-foreground text-sm">{row.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{row.value}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {row.detail}
          </p>
        </div>
      ))}
    </div>
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
  const editorStarts =
    insights.usage.eventTypes30d.find(
      (row) => row.eventType === "editor.session_started"
    )?.count ?? 0;
  const usedExportFormats = insights.usage.exportFormats30d.filter(
    (row) => row.count > 0
  ).length;
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
      <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-8 p-3 pt-0 sm:gap-10 sm:p-4 sm:pt-0">
        <section className="space-y-4" aria-labelledby="product-pulse-title">
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
              label={tMetrics("kpi.editorStarts.label")}
              value={editorStarts}
              sub={tMetrics("kpi.editorStarts.sub", {
                account: insights.usage.accountSessions30d,
                anonymous: insights.usage.anonymousSessions30d,
              })}
              icon={Activity}
              accent="bg-sky-500"
              iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            />
            <KpiCard
              label={tMetrics("kpi.exports.label")}
              value={insights.usage.exports30d}
              sub={tMetrics("kpi.exports.sub", {
                formats: usedExportFormats,
              })}
              icon={Download}
              accent="bg-violet-500"
              iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <KpiCard
              label={tMetrics("kpi.viewingSessions.label")}
              value={insights.usage.shareViews30d}
              sub={tMetrics("kpi.viewingSessions.sub", {
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
          className="scroll-mt-24 space-y-4 border-t pt-6 sm:pt-8"
        >
          <SectionHeading
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
          className="scroll-mt-24 space-y-4 border-t pt-6 sm:pt-8"
        >
          <SectionHeading
            title={tMetrics("sections.value.title")}
            description={tMetrics("sections.value.description")}
          />
          <div className="grid min-w-0 gap-4 lg:grid-cols-12">
            <ChartCard
              id="editor-behavior"
              title={tMetrics("editorUsage.title")}
              description={tMetrics("editorUsage.description")}
              className="lg:col-span-7"
            >
              <EditorUsageBreakdown usage={insights.usage} />
            </ChartCard>
            <div className="space-y-4 lg:col-span-5">
              <ChartCard
                id="export-usage"
                title={tMetrics("exportUsage.title")}
                description={tMetrics("exportUsage.description")}
              >
                <ExportUsageBreakdown usage={insights.usage} />
              </ChartCard>
              <ChartCard
                id="share-viewing"
                title={tMetrics("shareUsage.title")}
                description={tMetrics("shareUsage.description")}
              >
                <ShareUsageBreakdown usage={insights.usage} />
              </ChartCard>
            </div>
          </div>
        </section>

        <section
          id="growth"
          className="scroll-mt-24 space-y-4 border-t pt-6 sm:pt-8"
        >
          <SectionHeading
            title={tMetrics("sections.growth.title")}
            description={tMetrics("sections.growth.description")}
          />
          <UserGrowthCard
            growthByRange={growthByRange}
            growthTimeline={growthTimeline}
          />
          <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-2">
            <ChartCard
              title={tMetrics("contentGrowth.title")}
              description={tMetrics("contentGrowth.description")}
            >
              <ContentGrowthChart data={insights.contentGrowth} />
            </ChartCard>
            <ChartCard
              title={tMetrics("userPopulation.title")}
              description={tMetrics("userPopulation.description")}
            >
              <UserPopulationChart users={metrics.users} />
            </ChartCard>
          </div>
        </section>

        <section
          id="operations"
          className="scroll-mt-24 space-y-4 border-t pt-6 sm:pt-8"
        >
          <SectionHeading
            title={tMetrics("sections.operations.title")}
            description={tMetrics("sections.operations.description")}
          />
          <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-2">
            <ChartCard
              title={tMetrics("inventory.title")}
              description={tMetrics("inventory.description")}
            >
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
            </ChartCard>
            <ChartCard
              id="sharing-health"
              title={tMetrics("health.title")}
              description={tMetrics("health.description")}
            >
              <SharingHealth
                shares={metrics.shares}
                gallery={metrics.gallery}
              />
            </ChartCard>
          </div>
        </section>

        <section
          id="planning"
          className="scroll-mt-24 space-y-4 border-t pt-6 pb-4 sm:pt-8"
        >
          <SectionHeading
            title={tMetrics("sections.planning.title")}
            description={tMetrics("sections.planning.description")}
          />
          <ChartCard
            title={tMetrics("distribution.title")}
            description={tMetrics("distribution.description")}
          >
            <DistributionSummary userDistribution={metrics.userDistribution} />
          </ChartCard>
          <div className="space-y-4">
            <div className="max-w-3xl">
              <h3 className="text-sm font-semibold">
                {tMetrics("planLimit.title")}
              </h3>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {tMetrics("planLimit.description")}
              </p>
            </div>
            <PlanLimitSimulator userDistribution={metrics.userDistribution} />
          </div>
        </section>
      </div>
    </>
  );
}
