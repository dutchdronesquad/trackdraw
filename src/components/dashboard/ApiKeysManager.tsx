"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, KeyRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import type { AdminApiKey } from "@/lib/server/api-keys";

type ApiKeyStatus = "active" | "expired" | "disabled";

const statusFilterValues: ApiKeyStatus[] = ["active", "expired", "disabled"];

function getApiKeyStatus(key: AdminApiKey): ApiKeyStatus {
  if (!key.enabled) return "disabled";
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return "active";
}

function getStatusVariant(
  status: ApiKeyStatus
): "default" | "muted" | "outline" {
  if (status === "active") return "outline";
  return "muted";
}

function getStatusLabel(status: ApiKeyStatus, t: (key: string) => string) {
  return t(`statusValues.${status}`);
}

function getOwnerLabel(key: AdminApiKey) {
  return key.ownerName?.trim() || key.ownerEmail?.trim() || key.ownerUserId;
}

function getOwnerInitials(key: AdminApiKey) {
  const name = key.ownerName?.trim();
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getKeyLabel(key: AdminApiKey) {
  return key.name ?? key.start ?? key.id;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function formatDateTime(value: string | null) {
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

function formatRateLimitWindow(
  ms: number | null,
  t: (key: string, values?: Record<string, unknown>) => string
) {
  if (ms === null) return "—";
  const minutes = ms / 1000 / 60;
  if (minutes < 60) return t("units.minutes", { count: minutes });
  return t("units.hours", { count: minutes / 60 });
}

function formatPermissions(permissions: AdminApiKey["permissions"]) {
  if (!permissions) return "—";
  return Object.entries(permissions)
    .map(([resource, actions]) => `${resource}: ${actions.join(", ")}`)
    .join(" · ");
}

type DashboardApiKeysManagerProps = {
  initialKeys: AdminApiKey[];
};

export default function DashboardApiKeysManager({
  initialKeys,
}: DashboardApiKeysManagerProps) {
  const t = useTranslations("dashboard.apiKeys");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ApiKeyStatus[]>([]);
  const [inspectKey, setInspectKey] = useState<AdminApiKey | null>(null);

  const columns: ColumnDef<AdminApiKey>[] = [
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: initialKeys,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const key = row.original;
      const q = filterValue.toLowerCase();
      return (
        (key.name?.toLowerCase().includes(q) ?? false) ||
        (key.ownerName?.toLowerCase().includes(q) ?? false) ||
        (key.ownerEmail?.toLowerCase().includes(q) ?? false) ||
        key.ownerUserId.toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const allRows = table.getRowModel().rows;
  const filteredRows = allRows.filter((row) =>
    selectedStatuses.length === 0
      ? true
      : selectedStatuses.includes(getApiKeyStatus(row.original))
  );
  const statusFilterOptions = statusFilterValues.map((value) => ({
    value,
    label: t(`statusValues.${value}`),
    count: allRows.filter((row) => getApiKeyStatus(row.original) === value)
      .length,
  }));

  const emptyMessage =
    initialKeys.length === 0 ? t("empty.default") : t("empty.filtered");

  const inspectStatus = inspectKey ? getApiKeyStatus(inspectKey) : null;

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("filters.status")}
          selected={selectedStatuses}
          options={statusFilterOptions}
          onChange={setSelectedStatuses}
        />
      </DataTableToolbar>

      <DataTable
        table={table}
        rows={filteredRows}
        columnsLength={columns.length}
        emptyMessage={emptyMessage}
        minWidthClassName="min-w-[860px]"
        emptyClassName="py-8"
        onRowClick={(row) => setInspectKey(row.original)}
      />

      <p className="text-muted-foreground text-xs">
        {t("status.showing", {
          filtered: filteredRows.length,
          total: initialKeys.length,
        })}
      </p>

      <Sheet
        open={inspectKey !== null}
        onOpenChange={(open) => {
          if (!open) setInspectKey(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          {inspectKey && inspectStatus ? (
            <>
              <SheetHeader className="border-b p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className="text-sm">
                      {getOwnerInitials(inspectKey)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-base">
                      {getKeyLabel(inspectKey)}
                    </SheetTitle>
                    <SheetDescription className="mt-0.5 truncate text-sm">
                      {getOwnerLabel(inspectKey)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="grid grid-cols-3 divide-x border-b">
                {[
                  {
                    label: t("panel.stats.requests"),
                    value: inspectKey.requestCount.toLocaleString(),
                  },
                  {
                    label: t("panel.stats.remaining"),
                    value:
                      inspectKey.remaining !== null
                        ? inspectKey.remaining.toLocaleString()
                        : "—",
                  },
                  {
                    label: t("panel.stats.rateLimit"),
                    value: inspectKey.rateLimitEnabled
                      ? `${inspectKey.rateLimitMax ?? "—"}/${formatRateLimitWindow(inspectKey.rateLimitTimeWindowMs, t as (key: string, values?: Record<string, unknown>) => string)}`
                      : t("status.off"),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3 text-center">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium tabular-nums">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-0 px-6 py-5">
                <p className="text-muted-foreground mb-3 text-[10px] font-medium tracking-wide uppercase">
                  {t("panel.sections.key")}
                </p>
                <dl className="space-y-2">
                  {[
                    {
                      label: t("panel.fields.status"),
                      value: (
                        <Badge variant={getStatusVariant(inspectStatus)}>
                          {getStatusLabel(inspectStatus, t)}
                        </Badge>
                      ),
                    },
                    {
                      label: t("panel.fields.prefix"),
                      value: (
                        <span className="font-mono text-xs">
                          {inspectKey.prefix ?? "—"}
                          {inspectKey.start ?? ""}…
                        </span>
                      ),
                    },
                    {
                      label: t("panel.fields.permissions"),
                      value: (
                        <span className="text-xs">
                          {formatPermissions(inspectKey.permissions)}
                        </span>
                      ),
                    },
                    {
                      label: t("panel.fields.created"),
                      value: formatDate(inspectKey.createdAt),
                    },
                    {
                      label: t("panel.fields.expires"),
                      value: formatDate(inspectKey.expiresAt),
                    },
                    {
                      label: t("panel.fields.lastUsed"),
                      value: formatDateTime(inspectKey.lastRequest),
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4"
                    >
                      <dt className="text-muted-foreground shrink-0 text-xs">
                        {label}
                      </dt>
                      <dd className="truncate text-right text-xs">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="border-t px-6 py-5">
                <p className="text-muted-foreground mb-3 text-[10px] font-medium tracking-wide uppercase">
                  {t("panel.sections.owner")}
                </p>
                <dl className="space-y-2">
                  {[
                    {
                      label: t("panel.fields.name"),
                      value: inspectKey.ownerName ?? "—",
                    },
                    {
                      label: t("panel.fields.email"),
                      value: inspectKey.ownerEmail ?? "—",
                    },
                    {
                      label: t("panel.fields.userId"),
                      value: (
                        <span className="font-mono text-xs">
                          {inspectKey.ownerUserId}
                        </span>
                      ),
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4"
                    >
                      <dt className="text-muted-foreground shrink-0 text-xs">
                        {label}
                      </dt>
                      <dd className="truncate text-right text-xs">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          ) : (
            <SheetHeader className="p-6">
              <SheetTitle className="flex items-center gap-2">
                <KeyRound className="size-4" />
                {t("panel.title")}
              </SheetTitle>
              <SheetDescription>{t("panel.empty.selectRow")}</SheetDescription>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
