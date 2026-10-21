import "server-only";
import { getDatabase } from "./db";

// shares is the mutation table (or the explicit alias in a gallery subquery).
export function shareManagementPredicate(userId: string) {
  return {
    sql: `((shares.project_id IS NULL AND shares.owner_user_id=?) OR EXISTS (
    SELECT 1 FROM projects p WHERE p.id=shares.project_id AND p.archived_at IS NULL AND (
      (p.owner_team_id IS NULL AND p.owner_user_id=?) OR
      (p.owner_user_id IS NULL AND EXISTS(SELECT 1 FROM team_members m
        WHERE m.organizationId=p.owner_team_id AND m.userId=? AND m.role='owner')))))`,
    bindings: [userId, userId, userId],
  };
}
export async function canManageShare(userId: string, token: string) {
  const db = await getDatabase();
  const guard = shareManagementPredicate(userId);
  return Boolean(
    await db
      .prepare(`SELECT token FROM shares WHERE token=? AND ${guard.sql}`)
      .bind(token, ...guard.bindings)
      .first()
  );
}
