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
  actor?: string;
  target?: string;
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

export type AuditEventIdentityFacet = {
  value: string;
  kind: "user" | "api_key" | "system" | "unavailable";
  label: string;
  email: string | null;
};

export type AuditEventFacets = {
  eventTypes: string[];
  actors: AuditEventIdentityFacet[];
  targets: AuditEventIdentityFacet[];
};

type AuditEventFacetRow = {
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  kind: string | null;
  label: string | null;
};

const identityPrefixes = {
  user: "user:",
  kind: "kind:",
  actorLabel: "actor-label:",
  targetLabel: "target-label:",
} as const;

function identityValue(prefix: string, value: string) {
  return `${prefix}${value}`;
}

function addIdentityCondition(
  where: string[],
  bindings: Array<string | number>,
  value: string,
  scope: "actor" | "target"
) {
  if (value.startsWith(identityPrefixes.user)) {
    where.push(`ae.${scope}_user_id = ?`);
    bindings.push(value.slice(identityPrefixes.user.length));
    return;
  }

  if (scope === "actor" && value.startsWith(identityPrefixes.kind)) {
    where.push("ae.actor_user_id is null and ae.actor_kind = ?");
    bindings.push(value.slice(identityPrefixes.kind.length));
    return;
  }

  const labelPrefix =
    scope === "actor"
      ? identityPrefixes.actorLabel
      : identityPrefixes.targetLabel;
  if (value.startsWith(labelPrefix)) {
    const labelValue = value.slice(labelPrefix.length);
    if (scope === "actor") {
      const separatorIndex = labelValue.indexOf(":");
      if (separatorIndex > 0) {
        where.push(
          "ae.actor_user_id is null and ae.actor_kind = ? and ae.actor_label = ?"
        );
        bindings.push(
          labelValue.slice(0, separatorIndex),
          labelValue.slice(separatorIndex + 1)
        );
        return;
      }
    }
    where.push(`ae.${scope}_user_id is null and ae.${scope}_label = ?`);
    bindings.push(labelValue);
    return;
  }

  // Keep pre-token audit URLs working: historically actor and target were raw
  // user ids.
  where.push(`ae.${scope}_user_id = ?`);
  bindings.push(value);
}

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
  } else if (options.actor) {
    addIdentityCondition(where, bindings, options.actor, "actor");
  }
  if (options.targetUserId) {
    where.push("ae.target_user_id = ?");
    bindings.push(options.targetUserId);
  } else if (options.target) {
    addIdentityCondition(where, bindings, options.target, "target");
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
      lower(ae.event_type) like ? escape '\\' or
      lower(ae.entity_type) like ? escape '\\' or
      lower(coalesce(ae.entity_id, '')) like ? escape '\\' or
      lower(coalesce(ae.metadata_json, '')) like ? escape '\\' or
      lower(coalesce(ae.actor_label, '')) like ? escape '\\' or
      lower(coalesce(ae.target_label, '')) like ? escape '\\' or
      lower(coalesce(actor.name, '')) like ? escape '\\' or
      lower(coalesce(actor.email, '')) like ? escape '\\' or
      lower(coalesce(target.name, '')) like ? escape '\\' or
      lower(coalesce(target.email, '')) like ? escape '\\'
    )`);
    const literalSearch = search.replace(/[\\%_]/g, "\\$&");
    bindings.push(...Array.from({ length: 10 }, () => `%${literalSearch}%`));
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
          count(distinct case
            when ae.actor_user_id is not null then 'user:' || ae.actor_user_id
            when ae.actor_kind is not null then
              'actor:' || ae.actor_kind || ':' || coalesce(ae.actor_label, '')
          end) as actor_count,
          count(distinct case
            when ae.target_user_id is not null then 'user:' || ae.target_user_id
            when ae.target_label is not null then 'target:' || ae.target_label
          end) as target_count
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

function facetLabel(row: AuditEventFacetRow) {
  const name = row.user_name?.trim();
  const email = row.user_email?.trim();
  const label = row.label?.trim();
  return name || email || label || "Unknown";
}

function mapActorFacet(row: AuditEventFacetRow): AuditEventIdentityFacet {
  if (row.user_id) {
    return {
      value: identityValue(identityPrefixes.user, row.user_id),
      kind: "user",
      label: facetLabel(row),
      email: row.user_email,
    };
  }

  const kind =
    row.kind === "api_key" || row.kind === "system" ? row.kind : "unavailable";
  if (row.label?.trim()) {
    return {
      value: identityValue(identityPrefixes.actorLabel, `${kind}:${row.label}`),
      kind,
      label: row.label,
      email: null,
    };
  }

  return {
    value: identityValue(identityPrefixes.kind, kind),
    kind,
    label: kind,
    email: null,
  };
}

function mapTargetFacet(row: AuditEventFacetRow): AuditEventIdentityFacet {
  if (row.user_id) {
    return {
      value: identityValue(identityPrefixes.user, row.user_id),
      kind: "user",
      label: facetLabel(row),
      email: row.user_email,
    };
  }

  return {
    value: identityValue(identityPrefixes.targetLabel, row.label ?? "Unknown"),
    kind: "unavailable",
    label: row.label?.trim() || "Unknown",
    email: null,
  };
}

function uniqueFacets(facets: AuditEventIdentityFacet[]) {
  return Array.from(
    new Map(facets.map((facet) => [facet.value, facet])).values()
  );
}

export async function listAuditEventFacets(
  options: Pick<QueryAuditEventsOptions, "category" | "from" | "to"> = {}
): Promise<AuditEventFacets> {
  const db = await getDatabase();
  const { bindings, whereClause } = buildAuditWhere(options);
  const eventContext = buildAuditWhere({ from: options.from, to: options.to });
  const [eventTypesResult, actorsResult, targetsResult] = await Promise.all([
    db
      .prepare(
        `select distinct ae.event_type
         from audit_events ae
         ${eventContext.whereClause}
         order by ae.event_type`
      )
      .bind(...eventContext.bindings)
      .all<{ event_type: string }>(),
    db
      .prepare(
        `select distinct
           ae.actor_user_id as user_id,
           actor.name as user_name,
           actor.email as user_email,
           ae.actor_kind as kind,
           ae.actor_label as label
         from audit_events ae
         left join users actor on actor.id = ae.actor_user_id
         left join users target on target.id = ae.target_user_id
         ${whereClause}
         order by coalesce(actor.name, actor.email, ae.actor_label, ae.actor_kind)`
      )
      .bind(...bindings)
      .all<AuditEventFacetRow>(),
    db
      .prepare(
        `select distinct
           ae.target_user_id as user_id,
           target.name as user_name,
           target.email as user_email,
           null as kind,
           ae.target_label as label
         from audit_events ae
         left join users actor on actor.id = ae.actor_user_id
         left join users target on target.id = ae.target_user_id
         ${whereClause}
           ${whereClause ? "and" : "where"}
           (ae.target_user_id is not null or ae.target_label is not null)
         order by coalesce(target.name, target.email, ae.target_label)`
      )
      .bind(...bindings)
      .all<AuditEventFacetRow>(),
  ]);

  return {
    eventTypes: eventTypesResult.results.map((row) => row.event_type),
    actors: uniqueFacets(actorsResult.results.map(mapActorFacet)),
    targets: uniqueFacets(targetsResult.results.map(mapTargetFacet)),
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
