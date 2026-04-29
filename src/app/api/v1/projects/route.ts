import {
  apiListSuccess,
  apiProblem,
  authenticateApiRequest,
} from "@/lib/server/api-v1";
import { trackReadPermission } from "@/lib/server/api-keys";
import { toApiProjectSummary } from "@/lib/server/api-projects";
import { listProjectsForUser } from "@/lib/server/projects";

function parseLimit(request: Request) {
  const url = new URL(request.url);
  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  if (Number.isNaN(rawLimit)) {
    return 50;
  }
  return Math.max(1, Math.min(rawLimit, 100));
}

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, trackReadPermission);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const limit = parseLimit(request);
    const projects = await listProjectsForUser(auth.identity.user.id);
    const page = projects.slice(0, limit);

    return apiListSuccess(page.map(toApiProjectSummary), {
      limit,
      next_cursor: null,
      has_more: false,
    });
  } catch (error) {
    return apiProblem({
      status: 500,
      code: "internal_error",
      title: "Internal Server Error",
      detail:
        error instanceof Error ? error.message : "Failed to list projects.",
    });
  }
}
