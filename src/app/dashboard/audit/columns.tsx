"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import { getAccountRoleLabel, parseAccountRole } from "@/lib/account/roles";

export type AuditEventActor = {
  id: string;
  name: string | null;
  email: string | null;
} | null;

export type DashboardAuditEvent = {
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

export type AuditEventCategory = "Account" | "Gallery" | "Share" | "System";

export const categoryFilterValues: AuditEventCategory[] = [
  "Account",
  "Gallery",
  "Share",
  "System",
];
export const unknownActorValue = "__unknown_actor__";

export type Translate = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

export function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getUserLabel(user: AuditEventActor, unknownUserLabel: string) {
  if (!user) {
    return unknownUserLabel;
  }

  return user.name?.trim() || user.email?.trim() || unknownUserLabel;
}

export function getSecondaryLabel(user: AuditEventActor) {
  if (!user) {
    return null;
  }

  if (user.name?.trim() && user.email?.trim()) {
    return user.email;
  }

  return user.email?.trim() || user.id;
}

export function getActorFilterValue(event: DashboardAuditEvent) {
  return event.actorUserId ?? unknownActorValue;
}

export function getActorFilterLabel(
  event: DashboardAuditEvent,
  unknownUserLabel: string
) {
  const label = getUserLabel(event.actor, unknownUserLabel);
  const secondary = getSecondaryLabel(event.actor);

  return secondary && secondary !== label ? `${label} (${secondary})` : label;
}

export function getRoleChangeSummary(metadata: Record<string, unknown> | null) {
  const previousRole = parseAccountRole(metadata?.previousRole);
  const nextRole = parseAccountRole(metadata?.nextRole);

  return {
    previousRole,
    nextRole,
    label: `${getAccountRoleLabel(previousRole)} -> ${getAccountRoleLabel(nextRole)}`,
  };
}

export function formatEventType(value: string) {
  return value
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const EVENT_TITLE_KEYS: Record<string, string> = {
  "account.role.changed": "accountRoleChanged",
  "account.banned": "accountBanned",
  "account.unbanned": "accountUnbanned",
  "account.deleted": "accountDeleted",
  "gallery.entry.featured": "galleryEntryFeatured",
  "gallery.entry.unfeatured": "galleryEntryUnfeatured",
  "gallery.entry.hidden": "galleryEntryHidden",
  "gallery.entry.restored": "galleryEntryRestored",
  "gallery.entry.deleted": "galleryEntryDeleted",
  "share.revoked": "shareRevoked",
  "share.purged": "sharePurged",
};

export function getEventTitle(eventType: string, t: Translate) {
  const key = EVENT_TITLE_KEYS[eventType];
  if (key) return t(`eventTitles.${key}`);
  return formatEventType(eventType);
}

export function getEventCategory(eventType: string): AuditEventCategory {
  if (eventType.startsWith("account.")) return "Account";
  if (eventType.startsWith("gallery.")) return "Gallery";
  if (eventType.startsWith("share.")) return "Share";
  return "System";
}

export function getEventCategoryLabel(eventType: string, t: Translate) {
  return t(`categoryValues.${getEventCategory(eventType)}`);
}

export function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function formatMetadataLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

export function getEventDetailLabel(
  event: {
    eventType: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown> | null;
  },
  t: Translate
) {
  if (event.eventType === "account.role.changed") {
    return getRoleChangeSummary(event.metadata).label;
  }

  const previousState = formatMetadataValue(event.metadata?.previousState);
  const nextState = formatMetadataValue(event.metadata?.nextState);
  if (previousState !== "-" && nextState !== "-") {
    return `${previousState} -> ${nextState}`;
  }

  const shareToken = event.metadata?.shareToken ?? event.metadata?.token;
  if (shareToken) {
    return t("filters.share", {
      token: formatMetadataValue(shareToken),
    });
  }

  return event.entityId
    ? `${event.entityType} ${event.entityId}`
    : event.entityType;
}

export function getEntityTypeLabel(entityType: string, t: Translate) {
  switch (entityType) {
    case "user":
      return t("entityLabels.account");
    case "gallery_entry":
      return t("entityLabels.galleryEntry");
    case "share":
      return t("entityLabels.share");
    default:
      return formatMetadataLabel(entityType);
  }
}

export function shortenId(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function getEntityDisplay(event: DashboardAuditEvent, t: Translate) {
  if (event.entityType === "user") {
    return {
      label: t("entityLabels.accountRole"),
      detail: getRoleChangeSummary(event.metadata).label,
    };
  }

  if (event.entityType === "gallery_entry") {
    const shareToken =
      typeof event.metadata?.shareToken === "string"
        ? event.metadata.shareToken
        : null;

    return {
      label: t("entityLabels.galleryEntry"),
      detail: shareToken ?? (event.entityId ? shortenId(event.entityId) : null),
    };
  }

  if (event.entityType === "share") {
    const shareToken =
      typeof event.metadata?.shareToken === "string"
        ? event.metadata.shareToken
        : typeof event.metadata?.token === "string"
          ? event.metadata.token
          : null;

    return {
      label: t("entityLabels.share"),
      detail: shareToken ?? (event.entityId ? shortenId(event.entityId) : null),
    };
  }

  return {
    label: getEntityTypeLabel(event.entityType, t),
    detail: event.entityId
      ? t("entity.id", { id: shortenId(event.entityId) })
      : null,
  };
}

export function eventMatchesSearch(
  event: DashboardAuditEvent,
  query: string,
  t: Translate,
  unknownUserLabel: string
) {
  if (!query) return true;
  const entityDisplay = getEntityDisplay(event, t);

  const searchable = [
    getEventTitle(event.eventType, t),
    getEventCategoryLabel(event.eventType, t),
    getEventDetailLabel(event, t),
    getUserLabel(event.actor, unknownUserLabel),
    getSecondaryLabel(event.actor),
    getUserLabel(event.target, unknownUserLabel),
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

function compareText(a: string, b: string, aDate: string, bDate: string) {
  const primary = a.localeCompare(b, undefined, { sensitivity: "base" });
  if (primary !== 0) return primary;
  return new Date(aDate).getTime() - new Date(bDate).getTime();
}

type GetAuditColumnsParams = {
  t: Translate;
  unknownUserLabel: string;
};

export function getAuditColumns({
  t,
  unknownUserLabel,
}: GetAuditColumnsParams): ColumnDef<DashboardAuditEvent>[] {
  const getSortAriaLabel = (label: string) =>
    t("aria.sort", { label: label.toLowerCase() });

  return [
    {
      id: "event",
      accessorFn: (row) => getEventTitle(row.eventType, t),
      meta: { className: "w-[34%]" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-label={getSortAriaLabel(t("table.event"))}
        >
          {t("table.event")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      sortingFn: (rowA, rowB) =>
        compareText(
          getEventTitle(rowA.original.eventType, t),
          getEventTitle(rowB.original.eventType, t),
          rowA.original.createdAt,
          rowB.original.createdAt
        ),
      cell: ({ row }) => {
        const event = row.original;
        const metadataEntries = Object.entries(event.metadata ?? {});

        return (
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {getEventTitle(event.eventType, t)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline">
                {getEventCategoryLabel(event.eventType, t)}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {getEventDetailLabel(event, t)}
              </span>
            </div>
            {metadataEntries.length > 0 ? (
              <details className="mt-2">
                <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                  {t("table.details")}
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
        );
      },
    },
    {
      id: "actor",
      accessorFn: (row) => getUserLabel(row.actor, unknownUserLabel),
      meta: { className: "w-[20%]" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-label={getSortAriaLabel(t("table.actor"))}
        >
          {t("table.actor")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      sortingFn: (rowA, rowB) =>
        compareText(
          getUserLabel(rowA.original.actor, unknownUserLabel),
          getUserLabel(rowB.original.actor, unknownUserLabel),
          rowA.original.createdAt,
          rowB.original.createdAt
        ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {getUserLabel(row.original.actor, unknownUserLabel)}
          </p>
          {getSecondaryLabel(row.original.actor) ? (
            <p className="text-muted-foreground truncate text-xs">
              {getSecondaryLabel(row.original.actor)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "target",
      accessorFn: (row) => getUserLabel(row.target, unknownUserLabel),
      meta: { className: "w-[20%]" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-label={getSortAriaLabel(t("table.target"))}
        >
          {t("table.target")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      sortingFn: (rowA, rowB) =>
        compareText(
          getUserLabel(rowA.original.target, unknownUserLabel),
          getUserLabel(rowB.original.target, unknownUserLabel),
          rowA.original.createdAt,
          rowB.original.createdAt
        ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {getUserLabel(row.original.target, unknownUserLabel)}
          </p>
          {getSecondaryLabel(row.original.target) ? (
            <p className="text-muted-foreground truncate text-xs">
              {getSecondaryLabel(row.original.target)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "entity",
      accessorFn: (row) => getEntityDisplay(row, t).label,
      meta: { className: "w-[16%]" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-label={getSortAriaLabel(t("table.entity"))}
        >
          {t("table.entity")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      sortingFn: (rowA, rowB) =>
        compareText(
          getEntityDisplay(rowA.original, t).label,
          getEntityDisplay(rowB.original, t).label,
          rowA.original.createdAt,
          rowB.original.createdAt
        ),
      cell: ({ row }) => {
        const entityDisplay = getEntityDisplay(row.original, t);
        return (
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
        );
      },
    },
    {
      id: "createdAt",
      accessorFn: (row) => row.createdAt,
      meta: { className: "w-40 text-right" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={`${dataTableSortButtonClassName} -mr-2 ml-auto`}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-label={getSortAriaLabel(t("table.when"))}
        >
          {t("table.when")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      sortingFn: (rowA, rowB) =>
        new Date(rowA.original.createdAt).getTime() -
        new Date(rowB.original.createdAt).getTime(),
      cell: ({ row }) => (
        <span className="text-right text-xs whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
  ];
}
