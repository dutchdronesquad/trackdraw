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

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function parseCursor(
  request: Request
): { ok: true; id: string | null } | { ok: false } {
  const url = new URL(request.url);
  const raw = url.searchParams.get("cursor");
  if (raw === null) return { ok: true, id: null };

  try {
    const id = Buffer.from(raw, "base64url").toString("utf8");
    return id ? { ok: true, id } : { ok: false };
  } catch {
    return { ok: false };
  }
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

  const cursor = parseCursor(request);
  if (!cursor.ok) {
    return apiProblem({
      status: 400,
      code: "bad_request",
      title: "Bad Request",
      detail: "Invalid cursor parameter.",
    });
  }

  try {
    const projects = await listProjectSummariesForUser(auth.identity.user.id);

    let startIndex = 0;
    if (cursor.id !== null) {
      const foundIndex = projects.findIndex(
        (project) => project.id === cursor.id
      );
      if (foundIndex === -1) {
        return apiProblem({
          status: 400,
          code: "bad_request",
          title: "Bad Request",
          detail: "Invalid or expired cursor.",
        });
      }
      startIndex = foundIndex + 1;
    }

    const page = projects.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < projects.length;
    const lastItem = page.at(-1);

    return apiListSuccess(page.map(toApiProjectSummaryLight), {
      limit,
      next_cursor: hasMore && lastItem ? encodeCursor(lastItem.id) : null,
      has_more: hasMore,
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
