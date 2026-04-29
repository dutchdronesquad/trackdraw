"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import {
  DataTableBodyCell,
  DataTableEmptyState,
  DataTableFrame,
  DataTableHeaderCell,
} from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { getAccountRoleLabel, parseAccountRole } from "@/lib/account-roles";
import { cn } from "@/lib/utils";

type AuditEventActor = {
  id: string;
  name: string | null;
  email: string | null;
} | null;

type DashboardAuditEvent = {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditEventActor;
  target: AuditEventActor;
};

export type AuditEventCategory = "Account" | "Gallery" | "System";

type AuditEventsTableProps = {
  events: DashboardAuditEvent[];
  initialCategories?: AuditEventCategory[];
};

const categoryFilters: { value: AuditEventCategory; label: string }[] = [
  { value: "Account", label: "Account" },
  { value: "Gallery", label: "Gallery" },
  { value: "System", label: "System" },
];
const unknownActorValue = "__unknown_actor__";

type AuditSortKey = "event" | "actor" | "target" | "entity" | "createdAt";
type AuditSortDirection = "asc" | "desc";

type AuditSortState = {
  key: AuditSortKey;
  direction: AuditSortDirection;
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

function getUserLabel(user: AuditEventActor) {
  if (!user) {
    return "Unknown user";
  }

  return user.name?.trim() || user.email?.trim() || "Unknown user";
}

function getSecondaryLabel(user: AuditEventActor) {
  if (!user) {
    return null;
  }

  if (user.name?.trim() && user.email?.trim()) {
    return user.email;
  }

  return user.email?.trim() || user.id;
}

function getActorFilterValue(event: DashboardAuditEvent) {
  return event.actorUserId ?? unknownActorValue;
}

function getActorFilterLabel(event: DashboardAuditEvent) {
  const label = getUserLabel(event.actor);
  const secondary = getSecondaryLabel(event.actor);

  return secondary && secondary !== label ? `${label} (${secondary})` : label;
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

function formatEventType(value: string) {
  return value
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getEventTitle(eventType: string) {
  switch (eventType) {
    case "account.role.changed":
      return "Role changed";
    case "gallery.entry.featured":
      return "Gallery entry featured";
    case "gallery.entry.unfeatured":
      return "Gallery entry unfeatured";
    case "gallery.entry.hidden":
      return "Gallery entry hidden";
    case "gallery.entry.restored":
      return "Gallery entry restored";
    case "gallery.entry.deleted":
      return "Gallery entry deleted";
    default:
      return formatEventType(eventType);
  }
}

function getEventCategory(eventType: string): AuditEventCategory {
  if (eventType.startsWith("account.")) return "Account";
  if (eventType.startsWith("gallery.")) return "Gallery";
  return "System";
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function formatMetadataLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function getEventDetailLabel(event: {
  eventType: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
}) {
  if (event.eventType === "account.role.changed") {
    return getRoleChangeSummary(event.metadata).label;
  }

  const previousState = formatMetadataValue(event.metadata?.previousState);
  const nextState = formatMetadataValue(event.metadata?.nextState);
  if (previousState !== "-" && nextState !== "-") {
    return `${previousState} -> ${nextState}`;
  }

  if (event.metadata?.shareToken) {
    return `Share ${formatMetadataValue(event.metadata.shareToken)}`;
  }

  return event.entityId
    ? `${event.entityType} ${event.entityId}`
    : event.entityType;
}

function getEntityTypeLabel(entityType: string) {
  switch (entityType) {
    case "user":
      return "Account";
    case "gallery_entry":
      return "Gallery entry";
    default:
      return formatMetadataLabel(entityType);
  }
}

function shortenId(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getEntityDisplay(event: DashboardAuditEvent) {
  if (event.entityType === "user") {
    return {
      label: "Account role",
      detail: getRoleChangeSummary(event.metadata).label,
    };
  }

  if (event.entityType === "gallery_entry") {
    const shareToken =
      typeof event.metadata?.shareToken === "string"
        ? event.metadata.shareToken
        : null;

    return {
      label: "Gallery entry",
      detail: shareToken ?? (event.entityId ? shortenId(event.entityId) : null),
    };
  }

  return {
    label: getEntityTypeLabel(event.entityType),
    detail: event.entityId ? `ID ${shortenId(event.entityId)}` : null,
  };
}

function getSortValue(event: DashboardAuditEvent, key: AuditSortKey) {
  if (key === "event") return getEventTitle(event.eventType);
  if (key === "actor") return getUserLabel(event.actor);
  if (key === "target") return getUserLabel(event.target);
  if (key === "entity") return getEntityDisplay(event).label;
  return event.createdAt;
}

function compareAuditEvents(
  a: DashboardAuditEvent,
  b: DashboardAuditEvent,
  sorting: AuditSortState
) {
  const direction = sorting.direction === "asc" ? 1 : -1;

  if (sorting.key === "createdAt") {
    return (
      (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
      direction
    );
  }

  const primary = String(getSortValue(a, sorting.key)).localeCompare(
    String(getSortValue(b, sorting.key)),
    undefined,
    { sensitivity: "base" }
  );

  if (primary !== 0) return primary * direction;

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function eventMatchesSearch(event: DashboardAuditEvent, query: string) {
  if (!query) return true;
  const entityDisplay = getEntityDisplay(event);

  const searchable = [
    getEventTitle(event.eventType),
    getEventCategory(event.eventType),
    getEventDetailLabel(event),
    getUserLabel(event.actor),
    getSecondaryLabel(event.actor),
    getUserLabel(event.target),
    getSecondaryLabel(event.target),
    event.entityType,
    event.entityId,
    entityDisplay.label,
    entityDisplay.detail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

export default function DashboardAuditEventsTable({
  events,
  initialCategories = [],
}: AuditEventsTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedCategories, setSelectedCategories] =
    useState<AuditEventCategory[]>(initialCategories);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [sorting, setSorting] = useState<AuditSortState>({
    key: "createdAt",
    direction: "desc",
  });

  const toggleSort = (key: AuditSortKey) => {
    setSorting((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : {
            key,
            direction: key === "createdAt" ? "desc" : "asc",
          }
    );
  };

  const renderSortHeader = (
    key: AuditSortKey,
    label: string,
    className?: string
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(dataTableSortButtonClassName, className)}
      onClick={() => toggleSort(key)}
      aria-label={`Sort audit events by ${label.toLowerCase()}`}
    >
      {label}
      <ArrowUpDown
        className={cn(
          "text-muted-foreground ml-1 size-3.5",
          sorting.key === key && "text-foreground"
        )}
      />
    </Button>
  );

  const normalizedQuery = globalFilter.trim().toLowerCase();
  const searchedEvents = events.filter((event) =>
    eventMatchesSearch(event, normalizedQuery)
  );
  const categoryFacetEvents = searchedEvents
    .filter((event) =>
      selectedEventTypes.length === 0
        ? true
        : selectedEventTypes.includes(event.eventType)
    )
    .filter((event) =>
      selectedActors.length === 0
        ? true
        : selectedActors.includes(getActorFilterValue(event))
    );
  const eventTypeFacetEvents = searchedEvents
    .filter((event) =>
      selectedCategories.length === 0
        ? true
        : selectedCategories.includes(getEventCategory(event.eventType))
    )
    .filter((event) =>
      selectedActors.length === 0
        ? true
        : selectedActors.includes(getActorFilterValue(event))
    );
  const actorFacetEvents = searchedEvents
    .filter((event) =>
      selectedCategories.length === 0
        ? true
        : selectedCategories.includes(getEventCategory(event.eventType))
    )
    .filter((event) =>
      selectedEventTypes.length === 0
        ? true
        : selectedEventTypes.includes(event.eventType)
    );
  const filteredEvents = eventTypeFacetEvents
    .filter((event) =>
      selectedEventTypes.length === 0
        ? true
        : selectedEventTypes.includes(event.eventType)
    )
    .filter((event) =>
      selectedActors.length === 0
        ? true
        : selectedActors.includes(getActorFilterValue(event))
    );
  const sortedEvents = [...filteredEvents].sort((a, b) =>
    compareAuditEvents(a, b, sorting)
  );

  const eventTypeFilters = Array.from(
    new Set(events.map((event) => event.eventType))
  )
    .sort((a, b) => getEventTitle(a).localeCompare(getEventTitle(b)))
    .map((eventType) => ({
      label: getEventTitle(eventType),
      value: eventType,
      count: eventTypeFacetEvents.filter(
        (event) => event.eventType === eventType
      ).length,
    }));
  const categoryFilterOptions = categoryFilters.map((filter) => ({
    ...filter,
    count: categoryFacetEvents.filter(
      (event) => getEventCategory(event.eventType) === filter.value
    ).length,
  }));
  const actorFilterOptions = Array.from(
    new Map(
      searchedEvents.map((event) => [
        getActorFilterValue(event),
        {
          label: getActorFilterLabel(event),
          value: getActorFilterValue(event),
        },
      ])
    ).values()
  )
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((filter) => ({
      ...filter,
      count: actorFacetEvents.filter(
        (event) => getActorFilterValue(event) === filter.value
      ).length,
    }));
  const uniqueActorCount = new Set(
    filteredEvents.map((event) => event.actorUserId).filter(Boolean)
  ).size;
  const uniqueTargetCount = new Set(
    filteredEvents.map((event) => event.targetUserId).filter(Boolean)
  ).size;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 rounded-xl p-5">
          <p className="text-muted-foreground text-sm">Visible events</p>
          <p className="mt-2 text-2xl font-semibold">{filteredEvents.length}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Matching the latest audit window
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

      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder="Search event, actor, target or entity..."
      >
        <DataTableFacetFilter
          title="Category"
          selected={selectedCategories}
          options={categoryFilterOptions}
          onChange={setSelectedCategories}
        />
        <DataTableFacetFilter
          title="Event"
          selected={selectedEventTypes}
          options={eventTypeFilters}
          onChange={setSelectedEventTypes}
        />
        <DataTableFacetFilter
          title="Actor"
          selected={selectedActors}
          options={actorFilterOptions}
          onChange={setSelectedActors}
        />
      </DataTableToolbar>

      <DataTableFrame minWidthClassName="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <DataTableHeaderCell className="w-[34%]">
              {renderSortHeader("event", "Event")}
            </DataTableHeaderCell>
            <DataTableHeaderCell className="w-[20%]">
              {renderSortHeader("actor", "Actor")}
            </DataTableHeaderCell>
            <DataTableHeaderCell className="w-[20%]">
              {renderSortHeader("target", "Target")}
            </DataTableHeaderCell>
            <DataTableHeaderCell className="w-[16%]">
              {renderSortHeader("entity", "Entity")}
            </DataTableHeaderCell>
            <DataTableHeaderCell className="w-40 text-right">
              {renderSortHeader("createdAt", "When", "ml-auto -mr-2")}
            </DataTableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.length > 0 ? (
            sortedEvents.map((event) => {
              const metadataEntries = Object.entries(event.metadata ?? {});
              const entityDisplay = getEntityDisplay(event);

              return (
                <TableRow key={event.id}>
                  <DataTableBodyCell>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {getEventTitle(event.eventType)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline">
                          {getEventCategory(event.eventType)}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {getEventDetailLabel(event)}
                        </span>
                      </div>
                      {metadataEntries.length > 0 ? (
                        <details className="mt-2">
                          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                            Details
                          </summary>
                          <dl className="mt-2 grid gap-1 text-xs">
                            {metadataEntries.map(([key, value]) => (
                              <div
                                key={key}
                                className="grid grid-cols-[112px_minmax(0,1fr)] gap-2"
                              >
                                <dt className="text-muted-foreground">
                                  {formatMetadataLabel(key)}
                                </dt>
                                <dd className="text-foreground min-w-0 truncate font-mono">
                                  {formatMetadataValue(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      ) : null}
                    </div>
                  </DataTableBodyCell>
                  <DataTableBodyCell>
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
                  </DataTableBodyCell>
                  <DataTableBodyCell>
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
                  </DataTableBodyCell>
                  <DataTableBodyCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {entityDisplay.label}
                      </p>
                      {entityDisplay.detail ? (
                        <p className="text-muted-foreground truncate text-xs">
                          {entityDisplay.detail}
                        </p>
                      ) : null}
                    </div>
                  </DataTableBodyCell>
                  <DataTableBodyCell className="text-right text-xs whitespace-nowrap">
                    {formatDateTime(event.createdAt)}
                  </DataTableBodyCell>
                </TableRow>
              );
            })
          ) : (
            <DataTableEmptyState
              colSpan={5}
              message="No audit events match the current filters."
            />
          )}
        </TableBody>
      </DataTableFrame>
    </div>
  );
}
