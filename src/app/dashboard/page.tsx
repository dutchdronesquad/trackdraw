import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DashboardOverviewCards from "@/components/dashboard/DashboardOverviewCards";
import DashboardSiteHeader from "@/components/dashboard/DashboardSiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth";
import {
  getVisibleDashboardModules,
  hasCapability,
} from "@/lib/server/authorization";
import { countUsersByRole, listUsersForAdmin } from "@/lib/server/users";

const moduleConfig = {
  users: {
    title: "Users",
    description: "Manage access roles and inspect account presence.",
    href: "/dashboard/users",
  },
  audit: {
    title: "Audit",
    description: "Platform-sensitive history and role changes.",
    href: "/dashboard/audit",
  },
} as const;

export default async function DashboardPage() {
  const requestHeaders = new Headers(await headers());
  const actor = await getCurrentUserFromHeaders(requestHeaders);

  if (!actor || !hasCapability(actor.role, "dashboard.overview.read")) {
    notFound();
  }

  const visibleModules = getVisibleDashboardModules(actor.role).filter(
    (m): m is keyof typeof moduleConfig => m !== "overview"
  );
  const canReadUsers = hasCapability(actor.role, "admin.users.read");

  const users = canReadUsers ? await listUsersForAdmin() : [];
  const adminCount = canReadUsers ? await countUsersByRole("admin") : null;
  const moderatorCount = canReadUsers
    ? await countUsersByRole("moderator")
    : null;

  return (
    <>
      <DashboardSiteHeader
        title="Overview"
        description="Workspace summary and quick entry points"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DashboardOverviewCards
          role={actor.role}
          visibleModuleCount={visibleModules.length}
          totalUsers={canReadUsers ? users.length : null}
          adminCount={adminCount}
          moderatorCount={moderatorCount}
        />

        {visibleModules.length > 0 && (
          <div className="divide-y border-t">
            {visibleModules.map((module) => {
              const config = moduleConfig[module];
              return (
                <div
                  key={module}
                  className="flex items-center justify-between py-4"
                >
                  <div>
                    <p className="text-sm font-medium">{config.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {config.description}
                    </p>
                  </div>
                  <Link
                    href={config.href}
                    className="hover:bg-muted inline-flex h-7 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition"
                  >
                    Open
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
