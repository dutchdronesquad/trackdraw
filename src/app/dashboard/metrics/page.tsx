import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  BookMarked,
  FolderOpen,
  KeyRound,
  Link2,
  TrendingUp,
  Users,
} from "lucide-react";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import {
  ContentOverviewChart,
  PlanLimitSimulator,
  UserGrowthCard,
  UserPopulationChart,
} from "@/components/dashboard/MetricsChartsLoader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { getAdminMetrics, getGrowthByRange } from "@/lib/server/metrics";

export const metadata: Metadata = {
  title: "Dashboard Metrics",
  robots: { index: false, follow: false },
};

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
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className={`h-1 ${accent}`} />
      <div className="flex items-start gap-3 p-4">
        <span
          className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs font-medium">
            {label}
          </p>
          <p className="text-2xl leading-tight font-bold tabular-nums">
            {value}
          </p>
          {sub ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
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
};

function ChartCard({
  title,
  description,
  children,
  className,
  action,
}: ChartCardProps) {
  return (
    <div className={`bg-card rounded-xl border p-4 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="text-muted-foreground text-xs">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="pt-3">{children}</div>
    </div>
  );
}

type StatRowProps = {
  label: string;
  value: number | string;
  icon: typeof Users;
  tone: string;
};

function StatRow({ label, value, icon: Icon, tone }: StatRowProps) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md ${tone}`}
        >
          <Icon className="size-3" />
        </span>
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export default async function DashboardMetricsPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "admin.metrics.read")) {
    notFound();
  }

  const [metrics, growthByRange] = await Promise.all([
    getAdminMetrics(),
    getGrowthByRange(),
  ]);

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const tMetrics = await getTranslations("dashboard.metrics");

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.metrics")}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <KpiCard
            label={tMetrics("kpi.totalUsers")}
            value={metrics.users.total}
            sub={tMetrics("kpi.totalUsersSub", {
              count: metrics.users.newThisMonth,
            })}
            icon={Users}
            accent="bg-emerald-500"
            iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            label={tMetrics("kpi.activeUsers30d")}
            value={metrics.users.activeLastThirtyDays}
            sub={tMetrics("kpi.activeUsers30dSub", {
              pct:
                metrics.users.total > 0
                  ? Math.round(
                      (metrics.users.activeLastThirtyDays /
                        metrics.users.total) *
                        100
                    )
                  : 0,
            })}
            icon={TrendingUp}
            accent="bg-sky-500"
            iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <KpiCard
            label={tMetrics("kpi.projects")}
            value={metrics.projects.active}
            sub={tMetrics("kpi.projectsSub", {
              archived: metrics.projects.archived,
            })}
            icon={FolderOpen}
            accent="bg-violet-500"
            iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <KpiCard
            label={tMetrics("kpi.activeShares")}
            value={metrics.shares.totalActive}
            sub={tMetrics("kpi.activeSharesSub", {
              revoked: metrics.shares.revoked,
            })}
            icon={Link2}
            accent="bg-orange-500"
            iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
          />
          <KpiCard
            label={tMetrics("kpi.activeApiKeys")}
            value={metrics.apiKeys.active}
            sub={tMetrics("kpi.activeApiKeysSub", {
              total: metrics.apiKeys.total,
            })}
            icon={KeyRound}
            accent="bg-rose-500"
            iconTone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </div>

        {/* User population + Content overview */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title={tMetrics("userPopulation.title")}
            description={tMetrics("userPopulation.description")}
          >
            <UserPopulationChart users={metrics.users} />
          </ChartCard>
          <ChartCard
            title={tMetrics("contentOverview.title")}
            description={tMetrics("contentOverview.description")}
          >
            <ContentOverviewChart
              projects={metrics.projects}
              shares={metrics.shares}
              presets={metrics.presets}
            />
          </ChartCard>
        </div>

        {/* User growth */}
        <UserGrowthCard growthByRange={growthByRange} />

        {/* Detail stats */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-card space-y-0.5 rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">
              {tMetrics("detail.projects")}
            </p>
            <StatRow
              label={tMetrics("detail.avgPerUser")}
              value={metrics.projects.avgPerUser}
              icon={FolderOpen}
              tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <StatRow
              label={tMetrics("detail.maxPerUser")}
              value={metrics.projects.maxPerUser}
              icon={FolderOpen}
              tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <StatRow
              label={tMetrics("detail.totalIncludingArchived")}
              value={metrics.projects.total}
              icon={FolderOpen}
              tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
          </div>
          <div className="bg-card space-y-0.5 rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">
              {tMetrics("detail.shareLinks")}
            </p>
            <StatRow
              label={tMetrics("detail.avgPerUser")}
              value={metrics.shares.avgPerUser}
              icon={Link2}
              tone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
            <StatRow
              label={tMetrics("detail.maxPerUser")}
              value={metrics.shares.maxPerUser}
              icon={Link2}
              tone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
            <StatRow
              label={tMetrics("detail.totalRevoked")}
              value={metrics.shares.revoked}
              icon={Link2}
              tone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
          </div>
          <div className="bg-card space-y-0.5 rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">
              {tMetrics("detail.layoutPresets")}
            </p>
            <StatRow
              label={tMetrics("detail.total")}
              value={metrics.presets.total}
              icon={BookMarked}
              tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatRow
              label={tMetrics("detail.avgPerUser")}
              value={metrics.presets.avgPerUser}
              icon={BookMarked}
              tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatRow
              label={tMetrics("detail.maxPerUser")}
              value={metrics.presets.maxPerUser}
              icon={BookMarked}
              tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>

        {/* Plan limit simulation */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{tMetrics("planLimit.title")}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {tMetrics("planLimit.description")}
            </p>
          </div>
          <PlanLimitSimulator userDistribution={metrics.userDistribution} />
        </div>
      </div>
    </>
  );
}
