import "server-only";

import type {
  ProductEventMetadata,
  ProductEventName,
} from "@/lib/product-events";
import { getDatabase } from "@/lib/server/db";

export type ProductEventInput = {
  event: ProductEventName;
  sessionId: string | null;
  userId: string | null;
  projectId?: string | null;
  shareToken?: string | null;
  metadata?: ProductEventMetadata;
};

export async function recordProductEvent(input: ProductEventInput) {
  const db = await getDatabase();
  await db
    .prepare(
      `
        insert into product_events (
          id,
          event_type,
          session_id,
          user_id,
          project_id,
          share_token,
          metadata_json,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      crypto.randomUUID(),
      input.event,
      input.sessionId,
      input.userId,
      input.projectId ?? null,
      input.shareToken ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      new Date().toISOString()
    )
    .run();
}
