"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import type { AdminUser } from "@/lib/account/admin-users";
import { getAccountRoleLabel, type AccountRole } from "@/lib/account/roles";

export type Translate = (
  key: string,
  values?: Record<string, unknown>
) => string;

export function getUserLabel(user: AdminUser, unnamedUserLabel: string) {
  return user.name?.trim() || user.email?.trim() || unnamedUserLabel;
}

export function getSecondaryLabel(user: AdminUser) {
  if (user.name?.trim() && user.email?.trim()) return user.email;
  return user.email?.trim() || user.id;
}

export function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function roleBadgeClassName(role: AccountRole) {
  if (role === "admin") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  if (role === "moderator") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border bg-muted/50 text-muted-foreground";
}

type GetUsersColumnsParams = {
  t: Translate;
  currentUserId: string;
};

export function getUsersColumns({
  t,
  currentUserId,
}: GetUsersColumnsParams): ColumnDef<AdminUser>[] {
  return [
    {
      id: "user",
      accessorFn: (row) => getUserLabel(row, t("fallback.unnamedUser")),
      meta: { className: "w-[40%] min-w-56" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.user")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === currentUserId;
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {getUserLabel(user, t("fallback.unnamedUser"))}
              {isSelf && (
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  {t("selfBadge")}
                </span>
              )}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {getSecondaryLabel(user)}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "projectCount",
      meta: { className: "hidden w-28 sm:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.projects")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {row.original.projectCount}
        </span>
      ),
    },
    {
      accessorKey: "role",
      filterFn: (row, columnId, filterValue: AccountRole[]) =>
        filterValue.length === 0 ||
        filterValue.includes(row.getValue<AccountRole>(columnId)),
      header: t("table.role"),
      meta: { className: "w-32" },
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={roleBadgeClassName(row.original.role)}
          >
            {getAccountRoleLabel(row.original.role)}
          </Badge>
          {row.original.bannedAt && (
            <Badge
              variant="outline"
              className="border-destructive/25 bg-destructive/10 text-destructive"
            >
              {t("table.banned")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      meta: { className: "hidden w-36 lg:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.joined")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      meta: { className: "hidden w-36 sm:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.lastLogin")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.lastLoginAt
            ? formatDate(row.original.lastLoginAt)
            : "—"}
        </span>
      ),
    },
  ];
}
