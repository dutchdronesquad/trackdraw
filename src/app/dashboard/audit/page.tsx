import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getAccountRoleLabel, parseAccountRole } from "@/lib/account-roles";
import { listAuditEvents } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";

export const metadata: Metadata = {
  title: "Dashboard Audit",
  robots: { index: false, follow: false },
};

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getUserLabel(
  user: { name: string | null; email: string | null } | null
) {
  if (!user) {
    return "Unknown user";
  }

  return user.name?.trim() || user.email?.trim() || "Unknown user";
}

function getSecondaryLabel(
  user: { id: string; name: string | null; email: string | null } | null
) {
  if (!user) {
    return null;
  }

  if (user.name?.trim() && user.email?.trim()) {
    return user.email;
  }

  return user.email?.trim() || user.id;
}

function getRoleChangeSummary(metadata: Record<string, unknown> | null) {
  const previousRole = parseAccountRole(metadata?.previousRole);
  const nextRole = parseAccountRole(metadata?.nextRole);

  return {
    previousRole,
    nextRole,
    label: `${getAccountRoleLabel(previousRole)} -> ${getAccountRoleLabel(nextRole)}`,
  };
}

export default async function DashboardAuditPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "audit.read")) {
    notFound();
  }

  const events = await listAuditEvents({
    limit: 50,
    eventTypes: ["account.role.changed"],
  });

  const uniqueActorCount = new Set(
    events.map((event) => event.actorUserId).filter(Boolean)
  ).size;
  const uniqueTargetCount = new Set(
    events.map((event) => event.targetUserId).filter(Boolean)
  ).size;

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: "Dashboard", href: "/dashboard" }}
        title="Audit"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 rounded-xl p-5">
            <p className="text-muted-foreground text-sm">Visible events</p>
            <p className="mt-2 text-2xl font-semibold">{events.length}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Recent role-change entries
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-5">
            <p className="text-muted-foreground text-sm">Actors</p>
            <p className="mt-2 text-2xl font-semibold">{uniqueActorCount}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Distinct accounts making changes
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-5">
            <p className="text-muted-foreground text-sm">Targets</p>
            <p className="mt-2 text-2xl font-semibold">{uniqueTargetCount}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Distinct accounts affected
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-2.5 py-2">Event</TableHead>
                <TableHead className="h-9 px-2.5 py-2">Actor</TableHead>
                <TableHead className="h-9 px-2.5 py-2">Target</TableHead>
                <TableHead className="h-9 px-2.5 py-2 text-right">
                  When
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length > 0 ? (
                events.map((event) => {
                  const roleChange = getRoleChangeSummary(event.metadata);

                  return (
                    <TableRow key={event.id}>
                      <TableCell className="px-2.5 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Role changed</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline">{roleChange.label}</Badge>
                            <span className="text-muted-foreground text-xs">
                              Account role update
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2.5 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {getUserLabel(event.actor)}
                          </p>
                          {getSecondaryLabel(event.actor) ? (
                            <p className="text-muted-foreground truncate text-xs">
                              {getSecondaryLabel(event.actor)}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-2.5 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {getUserLabel(event.target)}
                          </p>
                          {getSecondaryLabel(event.target) ? (
                            <p className="text-muted-foreground truncate text-xs">
                              {getSecondaryLabel(event.target)}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-2.5 py-2 text-right text-xs whitespace-nowrap">
                        {formatDateTime(event.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center text-sm"
                  >
                    No role-change audit events recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
