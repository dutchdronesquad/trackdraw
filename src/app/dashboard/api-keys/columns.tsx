"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ToneBadge, {
  type DashboardTone,
} from "@/components/dashboard/ToneBadge";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import type { DataTableFeatures } from "@/components/data-table/tableFeatures";
import type { AdminApiKey } from "@/lib/server/api-keys";
import { create24HourDateTimeFormatter } from "@/lib/date-time";
import { cn } from "@/lib/utils";

export type ApiKeyStatus = "active" | "expired" | "disabled";
export type Translate = (
  key: string,
  values?: Record<string, unknown>
) => string;

export function getApiKeyStatus(key: AdminApiKey): ApiKeyStatus {
  if (!key.enabled) return "disabled";
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return "active";
}

export function getStatusTone(status: ApiKeyStatus): DashboardTone {
  return status === "active" ? "emerald" : "neutral";
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const NEAR_RATE_LIMIT = 0.8;

// requestCount only counts calls inside the current rate-limit window.
export function getRateLimitUsage(key: AdminApiKey, now = Date.now()) {
  if (!key.rateLimitEnabled || !key.rateLimitMax || !key.rateLimitTimeWindowMs)
    return null;
  if (!key.lastRequest) return 0;
  if (now - new Date(key.lastRequest).getTime() > key.rateLimitTimeWindowMs)
    return 0;
  return Math.min(1, key.requestCount / key.rateLimitMax);
}

export function isExpiringSoon(key: AdminApiKey, now = Date.now()) {
  if (!key.expiresAt) return false;
  const expiresAt = new Date(key.expiresAt).getTime();
  return expiresAt > now && expiresAt - now <= 14 * DAY_MS;
}

export function getStatusLabel(status: ApiKeyStatus, t: Translate) {
  return t(`statusValues.${status}`);
}

export function getOwnerLabel(key: AdminApiKey) {
  return key.ownerName?.trim() || key.ownerEmail?.trim() || key.ownerUserId;
}

export function getKeyLabel(key: AdminApiKey) {
  return key.name ?? key.start ?? key.id;
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return create24HourDateTimeFormatter("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type GetApiKeysColumnsParams = {
  t: Translate;
};

export function getApiKeysColumns({
  t,
}: GetApiKeysColumnsParams): ColumnDef<DataTableFeatures, AdminApiKey>[] {
  return [
    {
      id: "key",
      accessorFn: (row) => getKeyLabel(row),
      meta: { className: "w-[28%] min-w-48" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.key")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {getKeyLabel(row.original)}
          </p>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {row.original.prefix ?? ""}
            {row.original.start ?? ""}…
          </p>
        </div>
      ),
    },
    {
      id: "owner",
      accessorFn: (row) => getOwnerLabel(row),
      header: t("table.owner"),
      meta: { className: "w-[25%] min-w-44" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{getOwnerLabel(row.original)}</p>
          <p className="text-muted-foreground truncate text-xs">
            {row.original.ownerEmail ?? row.original.ownerUserId}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => getApiKeyStatus(row),
      filterFn: (row, columnId, filterValue: ApiKeyStatus[]) =>
        filterValue.length === 0 ||
        filterValue.includes(row.getValue<ApiKeyStatus>(columnId)),
      header: t("table.status"),
      meta: { className: "w-28" },
      cell: ({ row }) => {
        const status = getApiKeyStatus(row.original);
        return (
          <ToneBadge tone={getStatusTone(status)}>
            {getStatusLabel(status, t)}
          </ToneBadge>
        );
      },
    },
    {
      id: "rateLimit",
      accessorFn: (row) => getRateLimitUsage(row) ?? -1,
      meta: { className: "w-40" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "desc")}
        >
          {t("table.rateLimit")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const usage = getRateLimitUsage(row.original);
        if (usage === null) {
          return (
            <span className="text-muted-foreground text-xs">
              {t("status.off")}
            </span>
          );
        }
        const percent = Math.round(usage * 100);
        const near = usage >= NEAR_RATE_LIMIT;
        return (
          <div className="flex items-center gap-2">
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  near ? "bg-destructive" : "bg-brand-primary"
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span
              className={cn(
                "w-9 text-right text-xs tabular-nums",
                near ? "text-destructive font-medium" : "text-muted-foreground"
              )}
            >
              {percent}%
            </span>
          </div>
        );
      },
    },
    {
      id: "lastUsed",
      accessorKey: "lastRequest",
      meta: { className: "w-36" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.lastUsed")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDateTime(row.original.lastRequest)}
        </span>
      ),
    },
    {
      id: "expires",
      accessorKey: "expiresAt",
      meta: { className: "w-32 hidden lg:table-cell" },
      header: t("table.expires"),
      cell: ({ row }) => (
        <span
          className={cn(
            "text-xs",
            isExpiringSoon(row.original)
              ? "font-medium text-amber-700 dark:text-amber-300"
              : "text-muted-foreground"
          )}
        >
          {formatDate(row.original.expiresAt)}
        </span>
      ),
    },
  ];
}
