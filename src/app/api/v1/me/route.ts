import { apiSuccess, authenticateApiRequest } from "@/lib/server/api-v1";
import { toApiIdentitySummary } from "@/lib/server/api-identity";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  return apiSuccess(toApiIdentitySummary(auth.identity));
}
