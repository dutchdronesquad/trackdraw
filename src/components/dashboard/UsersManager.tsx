"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  getUserLabel,
  getUsersColumns,
  roleBadgeClassName,
  type Translate,
} from "@/app/dashboard/users/columns";
import {
  accountRoles,
  getAccountRoleLabel,
  type AccountRole,
} from "@/lib/account/roles";
import type { AdminUser } from "@/lib/account/admin-users";
import type { AuditEvent } from "@/lib/server/audit";
import type { UserContextStats } from "@/lib/server/users";
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DashboardUsersManagerProps = {
  currentUserId: string;
  initialUsers: AdminUser[];
};

function getUserInitials(user: AdminUser) {
  const name = user.name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return (user.email?.[0] ?? "?").toUpperCase();
}

function formatAuditEventType(eventType: string) {
  const parts = eventType.split(".");
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" · ");
}

type UserContextData = {
  stats: UserContextStats;
  recentEvents: AuditEvent[];
};

export default function DashboardUsersManager({
  currentUserId,
  initialUsers,
}: DashboardUsersManagerProps) {
  const t = useTranslations("dashboard.users");
  const [users, setUsers] = useState(initialUsers);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AccountRole[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, AccountRole>>(
    Object.fromEntries(initialUsers.map((u) => [u.id, u.role]))
  );
  const [inspectCandidate, setInspectCandidate] = useState<AdminUser | null>(
    null
  );
  const [inspectData, setInspectData] = useState<UserContextData | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  useEffect(() => {
    if (!inspectCandidate) {
      setInspectData(null);
      return;
    }

    let cancelled = false;
    setInspectLoading(true);
    setInspectData(null);

    fetch(`/api/dashboard/users/${encodeURIComponent(inspectCandidate.id)}`)
      .then(async (res) => {
        const payload = (await res.json()) as {
          ok: boolean;
          error?: string;
          stats?: UserContextStats;
          recentEvents?: AuditEvent[];
        };
        if (cancelled) return;
        if (!res.ok || !payload.ok) {
          toast.error(payload.error ?? t("messages.loadFailed"));
          return;
        }
        if (payload.stats && payload.recentEvents) {
          setInspectData({
            stats: payload.stats,
            recentEvents: payload.recentEvents,
          });
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(t("messages.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setInspectLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inspectCandidate, t]);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("messages.copySuccess", { label }));
    } catch {
      toast.error(t("messages.copyFailed", { label }));
    }
  };

  const saveRole = async (userId: string) => {
    const nextRole = draftRoles[userId];
    const current = users.find((u) => u.id === userId);
    if (!nextRole || !current || current.role === nextRole) return;

    setPendingUserId(userId);

    try {
      const response = await fetch(`/api/dashboard/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        user?: AdminUser;
      };

      if (!response.ok || !payload.ok || !payload.user) {
        throw new Error(payload.error ?? t("messages.updateFailed"));
      }

      const updated = payload.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setInspectCandidate((prev) =>
        prev?.id === updated.id ? { ...prev, ...updated } : prev
      );
      setDraftRoles((prev) => ({ ...prev, [updated.id]: updated.role }));
      toast.success(
        t("messages.updateSuccess", {
          name: getUserLabel(updated, t("fallback.unnamedUser")),
          role: getAccountRoleLabel(updated.role),
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.updateFailed")
      );
    } finally {
      setPendingUserId(null);
    }
  };

  const columns = getUsersColumns({
    t: t as unknown as Translate,
    currentUserId,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: users,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const user = row.original;
      const q = filterValue.toLowerCase();
      return (
        (user.name?.toLowerCase().includes(q) ?? false) ||
        (user.email?.toLowerCase().includes(q) ?? false)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rowsForCurrentSearch = table.getRowModel().rows;
  const filteredRows = rowsForCurrentSearch.filter((row) =>
    selectedRoles.length === 0
      ? true
      : selectedRoles.includes(row.original.role)
  );
  const roleFilterOptions = accountRoles.map((role) => ({
    label: getAccountRoleLabel(role),
    value: role,
    count: rowsForCurrentSearch.filter((row) => row.original.role === role)
      .length,
  }));

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("filters.role")}
          selected={selectedRoles}
          options={roleFilterOptions}
          onChange={setSelectedRoles}
        />
      </DataTableToolbar>

      <DataTable
        table={table}
        rows={filteredRows}
        columnsLength={columns.length}
        emptyMessage={t("empty.default")}
        onRowClick={(row) => setInspectCandidate(row.original)}
      />

      <p className="text-muted-foreground text-xs">
        {t("status.showing", {
          filtered: filteredRows.length,
          total: users.length,
        })}
      </p>

      <Sheet
        open={inspectCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setInspectCandidate(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
          {inspectCandidate ? (
            <>
              <SheetHeader className="border-b px-6 py-5">
                <div className="flex items-center gap-4">
                  <Avatar className="size-12 shrink-0">
                    <AvatarFallback className="bg-muted text-sm font-semibold">
                      {getUserInitials(inspectCandidate)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-base leading-tight">
                      {getUserLabel(
                        inspectCandidate,
                        t("fallback.unnamedUser")
                      )}
                    </SheetTitle>
                    <SheetDescription className="truncate text-xs">
                      {inspectCandidate.email ?? inspectCandidate.id}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {inspectLoading ? (
                  <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    {t("panel.status.loading")}
                  </div>
                ) : inspectData ? (
                  <div className="divide-y">
                    <div className="grid grid-cols-4 divide-x px-0">
                      {[
                        {
                          label: t("panel.stats.projects"),
                          value: inspectData.stats.projectCount,
                        },
                        {
                          label: t("panel.stats.shares"),
                          value: inspectData.stats.activeShareCount,
                        },
                        {
                          label: t("panel.stats.gallery"),
                          value: inspectData.stats.galleryEntryCount,
                        },
                        {
                          label: t("panel.stats.apiKeys"),
                          value: inspectData.stats.apiKeyCount,
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex flex-col items-center gap-0.5 py-4"
                        >
                          <span className="text-xl font-semibold tabular-nums">
                            {value}
                          </span>
                          <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 px-6 py-5">
                      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                        {t("panel.sections.account")}
                      </p>
                      <dl className="space-y-2.5">
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-muted-foreground text-xs">
                            {t("panel.fields.memberSince")}
                          </dt>
                          <dd className="text-xs font-medium">
                            {formatDate(inspectCandidate.createdAt)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-muted-foreground text-xs">
                            {t("panel.fields.lastLogin")}
                          </dt>
                          <dd className="text-xs font-medium">
                            {inspectCandidate.lastLoginAt
                              ? formatDate(inspectCandidate.lastLoginAt)
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-muted-foreground text-xs">
                            {t("panel.fields.role")}
                          </dt>
                          <dd>
                            <Badge
                              variant="outline"
                              className={roleBadgeClassName(
                                inspectCandidate.role
                              )}
                            >
                              {getAccountRoleLabel(inspectCandidate.role)}
                            </Badge>
                          </dd>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <dt className="text-muted-foreground shrink-0 text-xs">
                            {t("panel.fields.userId")}
                          </dt>
                          <dd className="flex min-w-0 items-center gap-1">
                            <span className="text-muted-foreground truncate font-mono text-[11px]">
                              {inspectCandidate.id}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground size-5 shrink-0"
                              aria-label={t("panel.actions.copyUserId")}
                              onClick={() =>
                                void copyToClipboard(
                                  inspectCandidate.id,
                                  t("panel.fields.userId")
                                )
                              }
                            >
                              <Copy className="size-3" />
                            </Button>
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex items-center justify-between gap-4 px-6 py-2.5">
                      <dt className="text-muted-foreground shrink-0 text-xs">
                        {t("panel.actions.changeRole")}
                      </dt>
                      {inspectCandidate.id === currentUserId ? (
                        <dd className="text-muted-foreground text-xs">
                          {t("panel.messages.cannotChangeOwnRole")}
                        </dd>
                      ) : (
                        <dd className="flex items-center gap-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={pendingUserId === inspectCandidate.id}
                                className="hover:bg-muted hover:text-foreground h-7 cursor-pointer justify-between gap-1.5 rounded-md px-2 text-xs shadow-none"
                              >
                                {getAccountRoleLabel(
                                  draftRoles[inspectCandidate.id] ??
                                    inspectCandidate.role
                                )}
                                <ChevronDown className="text-muted-foreground size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuRadioGroup
                                value={
                                  draftRoles[inspectCandidate.id] ??
                                  inspectCandidate.role
                                }
                                onValueChange={(val) =>
                                  setDraftRoles((prev) => ({
                                    ...prev,
                                    [inspectCandidate.id]: val as AccountRole,
                                  }))
                                }
                              >
                                {accountRoles.map((role) => (
                                  <DropdownMenuRadioItem
                                    key={role}
                                    value={role}
                                    className="focus:bg-muted focus:text-foreground cursor-pointer"
                                  >
                                    {getAccountRoleLabel(role)}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn(
                              "hover:bg-muted hover:text-foreground h-7 cursor-pointer rounded-md px-2.5 text-xs shadow-none",
                              (draftRoles[inspectCandidate.id] ??
                                inspectCandidate.role) !==
                                inspectCandidate.role &&
                                "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                            )}
                            disabled={
                              (draftRoles[inspectCandidate.id] ??
                                inspectCandidate.role) ===
                                inspectCandidate.role ||
                              pendingUserId === inspectCandidate.id
                            }
                            onClick={() => void saveRole(inspectCandidate.id)}
                          >
                            {pendingUserId === inspectCandidate.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              t("panel.actions.save")
                            )}
                          </Button>
                        </dd>
                      )}
                    </div>

                    <div className="space-y-3 px-6 py-5">
                      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                        {t("panel.sections.recentActivity")}
                      </p>
                      {inspectData.recentEvents.length > 0 ? (
                        <ul className="space-y-1">
                          {inspectData.recentEvents.map((event) => {
                            const isActor =
                              event.actorUserId === inspectCandidate.id;
                            return (
                              <li
                                key={event.id}
                                className="flex items-start gap-3 rounded-md py-2"
                              >
                                <div className="bg-muted-foreground/40 mt-1.5 size-1.5 shrink-0 rounded-full" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm leading-tight">
                                    {formatAuditEventType(event.eventType)}
                                  </p>
                                  <p className="text-muted-foreground mt-0.5 text-xs">
                                    {isActor
                                      ? t("panel.relation.actor")
                                      : t("panel.relation.target")}{" "}
                                    · {formatDate(event.createdAt)}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {t("panel.messages.noAuditEvents")}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t px-6 py-4">
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link href="/dashboard/audit">
                    <ExternalLink className="size-3.5" />
                    {t("panel.actions.viewFullAuditTrail")}
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
