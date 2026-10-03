"use client";

import { getAccountRoleLabel, parseAccountRole } from "@/lib/account/roles";
import {
  auditEventTitleKeys,
  getAuditEventCategory,
  type AuditActorKind,
  type AuditEventCategory,
} from "@/lib/audit-events";
import { create24HourDateTimeFormatter } from "@/lib/date-time";

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
  actorKind: AuditActorKind;
  actorLabel: string | null;
  targetLabel: string | null;
  actor: AuditEventActor;
  target: AuditEventActor;
};

export type { AuditEventCategory };
export const unknownActorValue = "__unknown_actor__";

export type Translate = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

export function formatDateTime(value: string) {
  try {
    return create24HourDateTimeFormatter("en-GB", {
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

export function getAuditActorLabel(
  event: DashboardAuditEvent,
  unknownUserLabel: string,
  systemActorLabel = "System"
) {
  if (event.actor) return getUserLabel(event.actor, unknownUserLabel);
  if (event.actorLabel?.trim()) return event.actorLabel;
  return event.actorKind === "system" ? systemActorLabel : unknownUserLabel;
}

export function getAuditTargetLabel(
  event: DashboardAuditEvent,
  unknownUserLabel: string
) {
  if (event.target) return getUserLabel(event.target, unknownUserLabel);
  return event.targetLabel?.trim() || unknownUserLabel;
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

export function getEventTitle(eventType: string, t: Translate) {
  const key = auditEventTitleKeys[eventType];
  if (key) return t(`eventTitles.${key}`);
  return formatEventType(eventType);
}

export function getEventCategory(eventType: string): AuditEventCategory {
  return getAuditEventCategory(eventType);
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
    case "account_lifecycle":
      return t("entityLabels.account");
    case "gallery_entry":
      return t("entityLabels.galleryEntry");
    case "share":
      return t("entityLabels.share");
    case "api_key":
      return t("entityLabels.apiKey");
    case "passkey":
      return t("entityLabels.passkey");
    case "project":
      return t("entityLabels.project");
    case "privacy_preference":
      return t("entityLabels.privacyPreference");
    case "metrics_maintenance":
      return t("entityLabels.metricsMaintenance");
    default:
      return formatMetadataLabel(entityType);
  }
}

export function shortenId(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function getEntityDisplay(event: DashboardAuditEvent, t: Translate) {
  if (event.entityType === "user" || event.entityType === "account_lifecycle") {
    return {
      label:
        event.eventType === "account.role.changed"
          ? t("entityLabels.accountRole")
          : t("entityLabels.account"),
      detail:
        event.eventType === "account.role.changed"
          ? getRoleChangeSummary(event.metadata).label
          : event.entityId
            ? shortenId(event.entityId)
            : null,
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
    getAuditActorLabel(event, unknownUserLabel),
    getSecondaryLabel(event.actor),
    getUserLabel(event.target, unknownUserLabel),
    getAuditTargetLabel(event, unknownUserLabel),
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
