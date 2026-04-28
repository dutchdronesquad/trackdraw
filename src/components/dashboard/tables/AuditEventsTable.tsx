"use client";

import { useState } from "react";
import DataTableFacetFilter from "@/components/dashboard/tables/DataTableFacetFilter";
import DataTableToolbar from "@/components/dashboard/tables/DataTableToolbar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAccountRoleLabel, parseAccountRole } from "@/lib/account-roles";

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

  const normalizedQuery = globalFilter.trim().toLowerCase();
  const searchedEvents = events.filter((event) =>
    eventMatchesSearch(event, normalizedQuery)
  );
  const categoryFacetEvents = searchedEvents.filter((event) =>
    selectedEventTypes.length === 0
      ? true
      : selectedEventTypes.includes(event.eventType)
  );
  const eventTypeFacetEvents = searchedEvents.filter((event) =>
    selectedCategories.length === 0
      ? true
      : selectedCategories.includes(getEventCategory(event.eventType))
  );
  const filteredEvents = eventTypeFacetEvents.filter((event) =>
    selectedEventTypes.length === 0
      ? true
      : selectedEventTypes.includes(event.eventType)
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
      </DataTableToolbar>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-2.5 py-2">Event</TableHead>
              <TableHead className="h-9 px-2.5 py-2">Actor</TableHead>
              <TableHead className="h-9 px-2.5 py-2">Target</TableHead>
              <TableHead className="h-9 px-2.5 py-2">Entity</TableHead>
              <TableHead className="h-9 px-2.5 py-2 text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const metadataEntries = Object.entries(event.metadata ?? {});
                const entityDisplay = getEntityDisplay(event);

                return (
                  <TableRow key={event.id}>
                    <TableCell className="px-2.5 py-2">
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
                    <TableCell className="px-2.5 py-2">
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
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center text-sm"
                >
                  No audit events match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
