import "server-only";
import { apiKeyProjectAccess } from "@/lib/api/project-access";

import {
  normalizeApiKeyPermissions,
  type ApiIdentity,
} from "@/lib/server/api-keys";

/** Shared minimal account contract; each transport supplies its granted permissions. */
export function toAccountIdentitySummary(
  account: { id: string; name: string | null },
  permissions: Record<string, string[]> | null,
  expiresAt: Date | string | null
) {
  return {
    type: "api_identity" as const,
    account: { id: account.id, name: account.name },
    permissions,
    expires_at: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
  };
}

export function toApiIdentitySummary(identity: ApiIdentity) {
  return {
    ...toAccountIdentitySummary(
      identity.user,
      normalizeApiKeyPermissions(identity.key.permissions),
      identity.key.expiresAt ?? null
    ),
    project_access: apiKeyProjectAccess(identity.key.metadata),
  };
}
