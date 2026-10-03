"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ToneBadge, {
  type DashboardTone,
} from "@/components/dashboard/ToneBadge";
import UserAvatar from "@/components/UserAvatar";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import type { DataTableFeatures } from "@/components/data-table/tableFeatures";
import { isInactiveAccount, type AdminUser } from "@/lib/account/admin-users";
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

export function roleTone(role: AccountRole): DashboardTone {
  if (role === "admin") return "rose";
  if (role === "moderator") return "amber";
  return "neutral";
}

type GetUsersColumnsParams = {
  t: Translate;
  currentUserId: string;
};

export function getUsersColumns({
  t,
  currentUserId,
}: GetUsersColumnsParams): ColumnDef<DataTableFeatures, AdminUser>[] {
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
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              name={user.name}
              email={user.email}
              className="size-8 text-xs"
            />
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
          </div>
        );
      },
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
          {row.original.bannedAt ? (
            <ToneBadge tone="destructive">{t("table.banned")}</ToneBadge>
          ) : (
            <ToneBadge tone={roleTone(row.original.role)}>
              {getAccountRoleLabel(row.original.role)}
            </ToneBadge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "projectCount",
      meta: { className: "w-24" },
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
      id: "lastActive",
      accessorFn: (row) => row.lastActiveAt ?? row.lastLoginAt ?? "",
      meta: { className: "w-40" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.lastActive")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.original.lastActiveAt ?? row.original.lastLoginAt;
        if (!value) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return isInactiveAccount(row.original) ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <span
              className="size-1.5 rounded-full bg-amber-500"
              aria-hidden="true"
            />
            {formatDate(value)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            {formatDate(value)}
          </span>
        );
      },
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
  ];
}
