import { apiSuccess, authenticateApiRequest } from "@/lib/server/api-v1";
import { normalizeApiKeyPermissions } from "@/lib/server/api-keys";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  return apiSuccess({
    type: "api_identity",
    account: {
      id: auth.identity.user.id,
      name: auth.identity.user.name,
    },
    permissions: normalizeApiKeyPermissions(auth.identity.key.permissions),
    expires_at:
      auth.identity.key.expiresAt instanceof Date
        ? auth.identity.key.expiresAt.toISOString()
        : (auth.identity.key.expiresAt ?? null),
  });
}
