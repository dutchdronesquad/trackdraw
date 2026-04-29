import { apiSuccess, authenticateApiRequest } from "@/lib/server/api-v1";
import { normalizeApiKeyRecord } from "@/lib/server/api-keys";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  return apiSuccess({
    type: "account",
    id: auth.identity.user.id,
    email: auth.identity.user.email,
    name: auth.identity.user.name,
    apiKey: normalizeApiKeyRecord(auth.identity.key),
  });
}
