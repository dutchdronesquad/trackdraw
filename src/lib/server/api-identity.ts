import "server-only";

import {
  normalizeApiKeyPermissions,
  type ApiIdentity,
} from "@/lib/server/api-keys";

/** The same minimal account contract is used by REST and MCP. */
export function toApiIdentitySummary(identity: ApiIdentity) {
  return {
    type: "api_identity" as const,
    account: {
      id: identity.user.id,
      name: identity.user.name,
    },
    permissions: normalizeApiKeyPermissions(identity.key.permissions),
    expires_at:
      identity.key.expiresAt instanceof Date
        ? identity.key.expiresAt.toISOString()
        : (identity.key.expiresAt ?? null),
  };
}
