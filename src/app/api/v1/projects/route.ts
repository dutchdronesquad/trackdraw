import {
  apiListSuccess,
  apiProblem,
  authenticateApiRequest,
} from "@/lib/server/api-v1";
import { trackReadPermission } from "@/lib/server/api-keys";
import { toApiProjectSummaryLight } from "@/lib/server/api-projects";
import { listProjectSummariesForUser } from "@/lib/server/projects";

function parseLimit(request: Request): number | null {
  const url = new URL(request.url);
  const raw = url.searchParams.get("limit");
  if (raw === null) return 50;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return null;
  return Math.max(1, Math.min(parsed, 100));
}

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, trackReadPermission);
  if (!auth.ok) {
    return auth.response;
  }

  const limit = parseLimit(request);
  if (limit === null) {
    return apiProblem({
      status: 400,
      code: "bad_request",
      title: "Bad Request",
      detail: "Invalid limit parameter. Must be an integer between 1 and 100.",
    });
  }

  try {
    const projects = await listProjectSummariesForUser(auth.identity.user.id);
    const page = projects.slice(0, limit);

    return apiListSuccess(page.map(toApiProjectSummaryLight), {
      limit,
      next_cursor: null,
      has_more: projects.length > limit,
    });
  } catch {
    return apiProblem({
      status: 500,
      code: "internal_error",
      title: "Internal Server Error",
      detail: "Failed to list projects.",
    });
  }
}
