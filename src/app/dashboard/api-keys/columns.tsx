"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import type { AdminApiKey } from "@/lib/server/api-keys";

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

export function getStatusVariant(
  status: ApiKeyStatus
): "default" | "muted" | "outline" {
  if (status === "active") return "outline";
  return "muted";
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
    return new Intl.DateTimeFormat("en-GB", {
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
}: GetApiKeysColumnsParams): ColumnDef<AdminApiKey>[] {
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
      header: t("table.status"),
      meta: { className: "w-28" },
      cell: ({ row }) => {
        const status = getApiKeyStatus(row.original);
        return (
          <Badge variant={getStatusVariant(status)}>
            {getStatusLabel(status, t)}
          </Badge>
        );
      },
    },
    {
      id: "requests",
      accessorKey: "requestCount",
      meta: { className: "w-28" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.requests")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.requestCount.toLocaleString()}
        </span>
      ),
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
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.expiresAt)}
        </span>
      ),
    },
  ];
}
