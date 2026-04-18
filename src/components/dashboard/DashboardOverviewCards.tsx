"use client";

import { getAccountRoleLabel, type AccountRole } from "@/lib/account-roles";

type DashboardOverviewCardsProps = {
  role: AccountRole;
  visibleModuleCount: number;
  totalUsers: number | null;
  adminCount: number | null;
  moderatorCount: number | null;
};

export default function DashboardOverviewCards({
  role,
  visibleModuleCount,
  totalUsers,
  adminCount,
  moderatorCount,
}: DashboardOverviewCardsProps) {
  const cards =
    totalUsers !== null && adminCount !== null && moderatorCount !== null
      ? [
          {
            key: "accounts",
            label: "Total accounts",
            value: totalUsers,
            helper: "Tracked user records",
          },
          {
            key: "admins",
            label: "Admins",
            value: adminCount,
            helper: "Full platform access",
          },
          {
            key: "moderators",
            label: "Moderators",
            value: moderatorCount,
            helper: "Content and report review",
          },
        ]
      : [
          {
            key: "role",
            label: "Role",
            value: getAccountRoleLabel(role),
            helper: "Resolved from trusted server auth",
          },
          {
            key: "modules",
            label: "Modules",
            value: visibleModuleCount,
            helper: "Visible in this dashboard",
          },
          {
            key: "access",
            label: "Access",
            value: "Scoped",
            helper: "Capabilities gate routes and actions",
          },
        ];

  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.key} className="bg-muted/50 rounded-xl p-5">
          <p className="text-muted-foreground text-sm">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          <p className="text-muted-foreground mt-1 text-xs">{card.helper}</p>
        </div>
      ))}
    </div>
  );
}
