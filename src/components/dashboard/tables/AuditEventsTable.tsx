"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  categoryFilterValues,
  eventMatchesSearch,
  getActorFilterLabel,
  getActorFilterValue,
  getAuditColumns,
  getEventCategory,
  getEventTitle,
  type AuditEventCategory,
  type DashboardAuditEvent,
  type Translate,
} from "@/app/dashboard/audit/columns";
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";

export type { AuditEventCategory };

type AuditEventsTableProps = {
  events: DashboardAuditEvent[];
  initialCategories?: AuditEventCategory[];
};

export default function DashboardAuditEventsTable({
  events,
  initialCategories = [],
}: AuditEventsTableProps) {
  const t: Translate = useTranslations("dashboard.audit");
  const unknownUserLabel = t("fallback.unknownUser");
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedCategories, setSelectedCategories] =
    useState<AuditEventCategory[]>(initialCategories);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const columns = getAuditColumns({ t, unknownUserLabel });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: events,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) =>
      eventMatchesSearch(
        row.original,
        filterValue.trim().toLowerCase(),
        t,
        unknownUserLabel
      ),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rowsForCurrentSearch = table.getRowModel().rows;
  const byCategory = (event: DashboardAuditEvent) =>
    selectedCategories.length === 0 ||
    selectedCategories.includes(getEventCategory(event.eventType));
  const byEventType = (event: DashboardAuditEvent) =>
    selectedEventTypes.length === 0 ||
    selectedEventTypes.includes(event.eventType);
  const byActor = (event: DashboardAuditEvent) =>
    selectedActors.length === 0 ||
    selectedActors.includes(getActorFilterValue(event));

  const categoryFacetRows = rowsForCurrentSearch
    .filter((row) => byEventType(row.original))
    .filter((row) => byActor(row.original));
  const eventTypeFacetRows = rowsForCurrentSearch
    .filter((row) => byCategory(row.original))
    .filter((row) => byActor(row.original));
  const actorFacetRows = rowsForCurrentSearch
    .filter((row) => byCategory(row.original))
    .filter((row) => byEventType(row.original));
  const filteredRows = rowsForCurrentSearch
    .filter((row) => byCategory(row.original))
    .filter((row) => byEventType(row.original))
    .filter((row) => byActor(row.original));

  const eventTypeFilters = Array.from(
    new Set(events.map((event) => event.eventType))
  )
    .map((eventType) => ({
      label: getEventTitle(eventType, t),
      value: eventType,
      count: eventTypeFacetRows.filter(
        (row) => row.original.eventType === eventType
      ).length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const categoryFilterOptions = categoryFilterValues.map((value) => ({
    value,
    label: t(`categoryValues.${value}`),
    count: categoryFacetRows.filter(
      (row) => getEventCategory(row.original.eventType) === value
    ).length,
  }));
  const actorFilterOptions = Array.from(
    new Map(
      rowsForCurrentSearch.map((row) => [
        getActorFilterValue(row.original),
        {
          label: getActorFilterLabel(row.original, unknownUserLabel),
          value: getActorFilterValue(row.original),
        },
      ])
    ).values()
  )
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((filter) => ({
      ...filter,
      count: actorFacetRows.filter(
        (row) => getActorFilterValue(row.original) === filter.value
      ).length,
    }));

  const uniqueActorCount = new Set(
    filteredRows.map((row) => row.original.actorUserId).filter(Boolean)
  ).size;
  const uniqueTargetCount = new Set(
    filteredRows.map((row) => row.original.targetUserId).filter(Boolean)
  ).size;

  return (
    <div className="space-y-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 rounded-xl p-5">
          <p className="text-muted-foreground text-sm">
            {t("stats.visibleEvents")}
          </p>
          <p className="mt-2 text-2xl font-semibold">{filteredRows.length}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("stats.visibleEventsHelper")}
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-5">
          <p className="text-muted-foreground text-sm">{t("stats.actors")}</p>
          <p className="mt-2 text-2xl font-semibold">{uniqueActorCount}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("stats.actorsHelper")}
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-5">
          <p className="text-muted-foreground text-sm">{t("stats.targets")}</p>
          <p className="mt-2 text-2xl font-semibold">{uniqueTargetCount}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("stats.targetsHelper")}
          </p>
        </div>
      </div>

      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("filters.category")}
          selected={selectedCategories}
          options={categoryFilterOptions}
          onChange={setSelectedCategories}
        />
        <DataTableFacetFilter
          title={t("filters.event")}
          selected={selectedEventTypes}
          options={eventTypeFilters}
          onChange={setSelectedEventTypes}
        />
        <DataTableFacetFilter
          title={t("filters.actor")}
          selected={selectedActors}
          options={actorFilterOptions}
          onChange={setSelectedActors}
        />
      </DataTableToolbar>

      <DataTable
        table={table}
        rows={filteredRows}
        columnsLength={columns.length}
        emptyMessage={t("table.noEvents")}
        minWidthClassName="min-w-[980px]"
      />
    </div>
  );
}
