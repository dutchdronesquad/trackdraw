import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BookMarked, FolderOpen, Link2, TrendingUp, Users } from "lucide-react";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import {
  ContentOverviewChart,
  PlanLimitChart,
  UserGrowthChart,
  UserPopulationChart,
} from "@/components/dashboard/MetricsChartsLoader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { getAdminMetrics } from "@/lib/server/metrics";

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
};

function ChartCard({
  title,
  description,
  children,
  className,
}: ChartCardProps) {
  return (
    <div
      className={`bg-card space-y-1 rounded-xl border p-4 ${className ?? ""}`}
    >
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground text-xs">{description}</p>
      ) : null}
      <div className="pt-2">{children}</div>
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

  const metrics = await getAdminMetrics();

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: "Dashboard", href: "/dashboard" }}
        title="Metrics"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard
            label="Total users"
            value={metrics.users.total}
            sub={`+${metrics.users.newThisMonth} this month`}
            icon={Users}
            accent="bg-emerald-500"
            iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            label="Active users (30d)"
            value={metrics.users.activeLastThirtyDays}
            sub={`${metrics.users.total > 0 ? Math.round((metrics.users.activeLastThirtyDays / metrics.users.total) * 100) : 0}% of total`}
            icon={TrendingUp}
            accent="bg-sky-500"
            iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <KpiCard
            label="Active projects"
            value={metrics.projects.active}
            sub={`${metrics.projects.archived} archived`}
            icon={FolderOpen}
            accent="bg-violet-500"
            iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <KpiCard
            label="Active shares"
            value={metrics.shares.totalActive}
            sub={`${metrics.shares.revoked} revoked`}
            icon={Link2}
            accent="bg-orange-500"
            iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* User population + Content overview */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="User population"
            description="Active = updated a project in the last 30 days. Dormant = has projects but inactive. Never created = registered but no projects."
          >
            <UserPopulationChart users={metrics.users} />
          </ChartCard>
          <ChartCard
            title="Content overview"
            description="Active projects, active share links, and saved presets across all users."
          >
            <ContentOverviewChart
              projects={metrics.projects}
              shares={metrics.shares}
              presets={metrics.presets}
            />
          </ChartCard>
        </div>

        {/* User growth */}
        <ChartCard
          title="New users per week"
          description="Registrations over the last 12 weeks."
        >
          <UserGrowthChart userGrowth={metrics.userGrowth} />
        </ChartCard>

        {/* Detail stats */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-card space-y-0.5 rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">Projects</p>
            <StatRow
              label="Avg per user"
              value={metrics.projects.avgPerUser}
              icon={FolderOpen}
              tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <StatRow
              label="Max on one account"
              value={metrics.projects.maxPerUser}
              icon={FolderOpen}
              tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <StatRow
              label="Total (incl. archived)"
              value={metrics.projects.total}
              icon={FolderOpen}
              tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
          </div>
          <div className="bg-card space-y-0.5 rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">Share links</p>
            <StatRow
              label="Avg per user"
              value={metrics.shares.avgPerUser}
              icon={Link2}
              tone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
            <StatRow
              label="Max on one account"
              value={metrics.shares.maxPerUser}
              icon={Link2}
              tone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
            <StatRow
              label="Total revoked"
              value={metrics.shares.revoked}
              icon={Link2}
              tone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
          </div>
          <div className="bg-card space-y-0.5 rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">Layout presets</p>
            <StatRow
              label="Total"
              value={metrics.presets.total}
              icon={BookMarked}
              tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatRow
              label="Avg per user"
              value={metrics.presets.avgPerUser}
              icon={BookMarked}
              tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatRow
              label="Max on one account"
              value={metrics.presets.maxPerUser}
              icon={BookMarked}
              tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>

        {/* Plan limit simulation */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Plan limit simulation</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Users who would be affected if the free plan were capped at each
              threshold. Use this to set limits that leave most current users
              unaffected.
            </p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <PlanLimitChart planLimits={metrics.planLimits} />
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    Free limit
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium">
                    Projects affected
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium">
                    Shares affected
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium">
                    Presets affected
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {metrics.planLimits.map((row) => (
                  <tr
                    key={row.limit}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      max {row.limit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.usersExceedingProjects === 0 ? (
                        <span className="text-muted-foreground text-sm">0</span>
                      ) : (
                        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                          {row.usersExceedingProjects}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.usersExceedingShares === 0 ? (
                        <span className="text-muted-foreground text-sm">0</span>
                      ) : (
                        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                          {row.usersExceedingShares}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.usersExceedingPresets === 0 ? (
                        <span className="text-muted-foreground text-sm">0</span>
                      ) : (
                        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                          {row.usersExceedingPresets}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
