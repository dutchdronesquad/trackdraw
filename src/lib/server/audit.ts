import "server-only";

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
  actor: AuditEventActor;
  target: AuditEventActor;
};

type AuditEventInput = {
  actorUserId?: string | null;
  targetUserId?: string | null;
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
  targetUserId = null,
  eventType,
  entityType,
  entityId = null,
  metadata = null,
}: AuditEventInput) {
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
          created_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      crypto.randomUUID(),
      actorUserId,
      targetUserId,
      eventType,
      entityType,
      entityId,
      metadata ? JSON.stringify(metadata) : null,
      new Date().toISOString()
    )
    .run();
}

export async function listAuditEvents(
  options: ListAuditEventsOptions = {}
): Promise<AuditEvent[]> {
  const db = await getDatabase();
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));
  const eventTypes = options.eventTypes?.filter(
    (value) => value.trim().length > 0
  );
  const bindings: Array<string | number> = [];
  const where: string[] = [];

  if (eventTypes && eventTypes.length > 0) {
    where.push(`ae.event_type in (${eventTypes.map(() => "?").join(", ")})`);
    bindings.push(...eventTypes);
  }

  if (options.actorUserId) {
    where.push("ae.actor_user_id = ?");
    bindings.push(options.actorUserId);
  }

  if (options.targetUserId) {
    where.push("ae.target_user_id = ?");
    bindings.push(options.targetUserId);
  }

  const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";

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
          actor.id as actor_id,
          actor.name as actor_name,
          actor.email as actor_email,
          target.id as target_id,
          target.name as target_name,
          target.email as target_email
        from audit_events ae
        left join users actor on actor.id = ae.actor_user_id
        left join users target on target.id = ae.target_user_id
        ${whereClause}
        order by ae.created_at desc
        limit ?
      `
    )
    .bind(...bindings, limit)
    .all<AuditEventRow>();

  return result.results.map(mapAuditEventRow);
}
