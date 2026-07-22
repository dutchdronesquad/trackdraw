"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { KeyRound } from "lucide-react";
import {
  formatDate,
  formatDateTime,
  getApiKeyStatus,
  getApiKeysColumns,
  getKeyLabel,
  getOwnerLabel,
  getStatusLabel,
  getStatusVariant,
  type ApiKeyStatus,
  type Translate,
} from "@/app/dashboard/api-keys/columns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import type { AdminApiKey } from "@/lib/server/api-keys";

const statusFilterValues: ApiKeyStatus[] = ["active", "expired", "disabled"];

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

// oxlint-disable-next-line react/react-compiler -- TanStack Table opts out of compiler memoization
export default function DashboardApiKeysManager({
  initialKeys,
}: DashboardApiKeysManagerProps) {
  "use no memo";

  const t = useTranslations("dashboard.apiKeys");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ApiKeyStatus[]>([]);
  const [inspectKey, setInspectKey] = useState<AdminApiKey | null>(null);

  const columns = useMemo(
    () => getApiKeysColumns({ t: t as unknown as Translate }),
    [t]
  );
  const columnFilters = useMemo(
    () =>
      selectedStatuses.length > 0
        ? [{ id: "status", value: selectedStatuses }]
        : [],
    [selectedStatuses]
  );

  const table = useReactTable({
    data: initialKeys,
    columns,
    state: { globalFilter, sorting, columnFilters },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
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
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const statusCounts = table.getColumn("status")?.getFacetedUniqueValues();
  const statusFilterOptions = statusFilterValues.map((value) => ({
    value,
    label: t(`statusValues.${value}`),
    count: statusCounts?.get(value) ?? 0,
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
        columnsLength={columns.length}
        emptyMessage={emptyMessage}
        minWidthClassName="min-w-[860px]"
        emptyClassName="py-8"
        onRowClick={(row) => setInspectKey(row.original)}
        pagination={{
          summary: (
            <p className="text-muted-foreground text-xs">
              {t("status.showing", {
                filtered: filteredRowCount,
                total: initialKeys.length,
              })}
            </p>
          ),
        }}
      />

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
                          {getStatusLabel(
                            inspectStatus,
                            t as unknown as Translate
                          )}
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
