import "server-only";

import type {
  ProductEventName,
  ProductEventProperties,
} from "@/lib/product-events";
import { getDatabase } from "@/lib/server/db";

const PRODUCT_EVENT_RETENTION_DAYS = 180;

export type ProductEventInput = {
  contractVersion: "1.0.0";
  event: ProductEventName;
  sessionId: string | null;
  userId: string | null;
  projectId?: string | null;
  shareToken?: string | null;
  properties?: ProductEventProperties;
};

export async function recordProductEvent(input: ProductEventInput) {
  const db = await getDatabase();
  const occurredAt = new Date();
  const expiresAt = new Date(
    occurredAt.getTime() + PRODUCT_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  await db
    .prepare(
      `
    insert or ignore into product_events (
      id, contract_version, event_type, session_id, user_id, project_id,
      share_token, metadata_json, created_at, expires_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .bind(
      crypto.randomUUID(),
      input.contractVersion,
      input.event,
      input.sessionId,
      input.userId,
      input.projectId ?? null,
      input.shareToken ?? null,
      input.properties ? JSON.stringify(input.properties) : null,
      occurredAt.toISOString(),
      expiresAt.toISOString()
    )
    .run();
}

export async function deleteProductEventsForSession(sessionId: string) {
  const db = await getDatabase();
  await db
    .prepare("delete from product_events where session_id = ?")
    .bind(sessionId)
    .run();
}

export async function setProductAnalyticsPreference(
  userId: string,
  enabled: boolean
) {
  const db = await getDatabase();
  await db
    .prepare(
      `
    update users
    set product_analytics_enabled = ?, updatedAt = ?
    where id = ?
  `
    )
    .bind(enabled ? 1 : 0, new Date().toISOString(), userId)
    .run();
}

export async function deleteProductEventsForUser(userId: string) {
  const db = await getDatabase();
  await db
    .prepare(
      `
    delete from product_events
    where user_id = ?
      or project_id in (select id from projects where owner_user_id = ?)
      or share_token in (select token from shares where owner_user_id = ?)
  `
    )
    .bind(userId, userId, userId)
    .run();
  await db
    .prepare("delete from product_metric_creator_activations where user_id = ?")
    .bind(userId)
    .run();
}
