import "server-only";

import type { AuditActorKind, AuditEventCategory } from "@/lib/audit-events";
import { getDatabase } from "@/lib/server/db";

type AuditEventActor = {
  id: string;
  name: string | null;
  email: string | null;
} | null;

export type AuditEvent = {
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

export type AuditEventInput = {
  actorUserId?: string | null;
  actorKind?: AuditActorKind;
  actorLabel?: string | null;
  targetUserId?: string | null;
  targetLabel?: string | null;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AuditEventRow = {
  id: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: string | null;
  created_at: string;
  actor_kind: string;
  actor_label: string | null;
  target_label: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  target_id: string | null;
  target_name: string | null;
  target_email: string | null;
};

export type ListAuditEventsOptions = {
  limit?: number;
  eventTypes?: string[];
  actorUserId?: string;
  targetUserId?: string;
};

export type QueryAuditEventsOptions = ListAuditEventsOptions & {
  page?: number;
  pageSize?: number;
  category?: AuditEventCategory;
  from?: string;
  to?: string;
  search?: string;
};

export type AuditEventPage = {
  events: AuditEvent[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  actorCount: number;
  targetCount: number;
};

export type AuditEventFacetUser = {
  id: string;
  name: string | null;
  email: string | null;
};

export type AuditEventFacets = {
  eventTypes: string[];
  actors: AuditEventFacetUser[];
  targets: AuditEventFacetUser[];
};

function parseAuditMetadata(
  value: string | null
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

const REDACTED_AUDIT_VALUE = "[redacted]";

function isSensitiveAuditKey(key: string) {
  const normalized = key.replace(/[^a-z]/gi, "").toLowerCase();
  return [
    "authorization",
    "cookie",
    "password",
    "privatekey",
    "publickey",
    "secret",
    "token",
  ].some((value) => normalized.includes(value));
}

function sanitizeAuditValue(value: unknown, depth: number): unknown {
  if (depth > 4) return "[nested value omitted]";
  if (Array.isArray(value)) {
    return value
      .slice(0, 25)
      .map((item) => sanitizeAuditValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([key, item]) => [
          key,
          isSensitiveAuditKey(key)
            ? REDACTED_AUDIT_VALUE
            : sanitizeAuditValue(item, depth + 1),
        ])
    );
  }
  return value;
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null
) {
  return metadata
    ? (sanitizeAuditValue(metadata, 0) as Record<string, unknown>)
    : null;
}

function mapAuditEventRow(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    targetUserId: row.target_user_id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: parseAuditMetadata(row.metadata_json),
    createdAt: row.created_at,
    actorKind:
      row.actor_kind === "api_key" || row.actor_kind === "system"
        ? row.actor_kind
        : "user",
    actorLabel: row.actor_label ?? null,
    targetLabel: row.target_label ?? null,
    actor: row.actor_id
      ? {
          id: row.actor_id,
          name: row.actor_name,
          email: row.actor_email,
        }
      : null,
    target: row.target_id
      ? {
          id: row.target_id,
          name: row.target_name,
          email: row.target_email,
        }
      : null,
  };
}

export async function createAuditEvent({
  actorUserId = null,
  actorKind = actorUserId ? "user" : "system",
  actorLabel = null,
  targetUserId = null,
  targetLabel = null,
  eventType,
  entityType,
  entityId = null,
  metadata = null,
}: AuditEventInput) {
  try {
    const db = await getDatabase();

    await db
      .prepare(
        `
        insert into audit_events (
          id,
          actor_user_id,
          target_user_id,
          event_type,
          entity_type,
          entity_id,
          metadata_json,
          created_at,
          actor_kind,
          actor_label,
          target_label
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        crypto.randomUUID(),
        actorUserId,
        targetUserId,
        eventType,
        entityType,
        entityId,
        metadata ? JSON.stringify(sanitizeAuditMetadata(metadata)) : null,
        new Date().toISOString(),
        actorKind,
        actorLabel,
        targetLabel
      )
      .run();
    return true;
  } catch (error) {
    console.error("[TrackDraw audit] Failed to record audit event", {
      eventType,
      entityType,
      entityId,
      error,
    });
    return false;
  }
}

export async function recordAuditEvent(input: AuditEventInput) {
  return createAuditEvent(input);
}

function categoryCondition(category: AuditEventCategory) {
  switch (category) {
    case "Account":
      return "ae.event_type like 'account.%'";
    case "Credentials":
      return "(ae.event_type like 'api_key.%' or ae.event_type like 'credential.%')";
    case "Projects":
      return "ae.event_type like 'project.%'";
    case "Gallery":
      return "ae.event_type like 'gallery.%'";
    case "Share":
      return "ae.event_type like 'share.%'";
    case "Privacy":
      return "ae.event_type like 'privacy.%'";
    case "System":
      return `(
        ae.event_type like 'system.%' or (
          ae.event_type not like 'account.%' and
          ae.event_type not like 'api_key.%' and
          ae.event_type not like 'credential.%' and
          ae.event_type not like 'project.%' and
          ae.event_type not like 'gallery.%' and
          ae.event_type not like 'share.%' and
          ae.event_type not like 'privacy.%'
        )
      )`;
  }
}

function buildAuditWhere(options: QueryAuditEventsOptions) {
  const bindings: Array<string | number> = [];
  const where: string[] = [];
  const eventTypes = options.eventTypes?.filter(
    (value) => value.trim().length > 0
  );

  if (eventTypes && eventTypes.length > 0) {
    where.push(`ae.event_type in (${eventTypes.map(() => "?").join(", ")})`);
    bindings.push(...eventTypes);
  }
  if (options.category) where.push(categoryCondition(options.category));
  if (options.actorUserId) {
    where.push("ae.actor_user_id = ?");
    bindings.push(options.actorUserId);
  }
  if (options.targetUserId) {
    where.push("ae.target_user_id = ?");
    bindings.push(options.targetUserId);
  }
  if (options.from) {
    where.push("ae.created_at >= ?");
    bindings.push(options.from);
  }
  if (options.to) {
    where.push("ae.created_at <= ?");
    bindings.push(options.to);
  }

  const search = options.search?.trim().toLowerCase();
  if (search) {
    where.push(`(
      lower(ae.event_type) like ? or
      lower(ae.entity_type) like ? or
      lower(coalesce(ae.entity_id, '')) like ? or
      lower(coalesce(ae.metadata_json, '')) like ? or
      lower(coalesce(ae.actor_label, '')) like ? or
      lower(coalesce(ae.target_label, '')) like ? or
      lower(coalesce(actor.name, '')) like ? or
      lower(coalesce(actor.email, '')) like ? or
      lower(coalesce(target.name, '')) like ? or
      lower(coalesce(target.email, '')) like ?
    )`);
    bindings.push(...Array.from({ length: 10 }, () => `%${search}%`));
  }

  return {
    bindings,
    whereClause: where.length > 0 ? `where ${where.join(" and ")}` : "",
  };
}

const auditSelect = `
  select
    ae.id,
    ae.actor_user_id,
    ae.target_user_id,
    ae.event_type,
    ae.entity_type,
    ae.entity_id,
    ae.metadata_json,
    ae.created_at,
    ae.actor_kind,
    ae.actor_label,
    ae.target_label,
    actor.id as actor_id,
    actor.name as actor_name,
    actor.email as actor_email,
    target.id as target_id,
    target.name as target_name,
    target.email as target_email
  from audit_events ae
  left join users actor on actor.id = ae.actor_user_id
  left join users target on target.id = ae.target_user_id
`;

export async function queryAuditEvents(
  options: QueryAuditEventsOptions = {}
): Promise<AuditEventPage> {
  const db = await getDatabase();
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 25, 200));
  const requestedPage = Math.max(1, options.page ?? 1);
  const { bindings, whereClause } = buildAuditWhere(options);
  const countRow = await db
    .prepare(
      `
        select
          count(*) as count,
          count(distinct ae.actor_user_id) as actor_count,
          count(distinct ae.target_user_id) as target_count
        from audit_events ae
        left join users actor on actor.id = ae.actor_user_id
        left join users target on target.id = ae.target_user_id
        ${whereClause}
      `
    )
    .bind(...bindings)
    .first<{ count: number; actor_count: number; target_count: number }>();
  const total = Number(countRow?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const result = await db
    .prepare(
      `${auditSelect}
        ${whereClause}
        order by ae.created_at desc, ae.id desc
        limit ? offset ?
      `
    )
    .bind(...bindings, pageSize, (page - 1) * pageSize)
    .all<AuditEventRow>();

  return {
    events: result.results.map(mapAuditEventRow),
    page,
    pageSize,
    total,
    pageCount,
    actorCount: Number(countRow?.actor_count ?? 0),
    targetCount: Number(countRow?.target_count ?? 0),
  };
}

export async function listAuditEventFacets(): Promise<AuditEventFacets> {
  const db = await getDatabase();
  const [eventTypesResult, actorsResult, targetsResult] = await Promise.all([
    db
      .prepare(
        "select distinct event_type from audit_events order by event_type"
      )
      .all<{ event_type: string }>(),
    db
      .prepare(
        `select distinct users.id, users.name, users.email
         from audit_events join users on users.id = audit_events.actor_user_id
         order by coalesce(users.name, users.email), users.id`
      )
      .all<AuditEventFacetUser>(),
    db
      .prepare(
        `select distinct users.id, users.name, users.email
         from audit_events join users on users.id = audit_events.target_user_id
         order by coalesce(users.name, users.email), users.id`
      )
      .all<AuditEventFacetUser>(),
  ]);

  return {
    eventTypes: eventTypesResult.results.map((row) => row.event_type),
    actors: actorsResult.results,
    targets: targetsResult.results,
  };
}

export async function listAuditEvents(
  options: ListAuditEventsOptions = {}
): Promise<AuditEvent[]> {
  const page = await queryAuditEvents({
    ...options,
    page: 1,
    pageSize: Math.max(1, Math.min(options.limit ?? 50, 200)),
  });
  return page.events;
}

export async function listAuditEventsForUser(
  userId: string,
  limit = 10
): Promise<AuditEvent[]> {
  const db = await getDatabase();
  const safeLimit = Math.max(1, Math.min(limit, 50));

  const result = await db
    .prepare(
      `
        select
          ae.id,
          ae.actor_user_id,
          ae.target_user_id,
          ae.event_type,
          ae.entity_type,
          ae.entity_id,
          ae.metadata_json,
          ae.created_at,
          ae.actor_kind,
          ae.actor_label,
          ae.target_label,
          actor.id as actor_id,
          actor.name as actor_name,
          actor.email as actor_email,
          target.id as target_id,
          target.name as target_name,
          target.email as target_email
        from audit_events ae
        left join users actor on actor.id = ae.actor_user_id
        left join users target on target.id = ae.target_user_id
        where ae.actor_user_id = ? or ae.target_user_id = ?
        order by ae.created_at desc
        limit ?
      `
    )
    .bind(userId, userId, safeLimit)
    .all<AuditEventRow>();

  return result.results.map(mapAuditEventRow);
}
