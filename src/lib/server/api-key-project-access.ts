import "server-only";
import type { ApiKeyProjectAccess } from "@/lib/api/project-access";
import {
  getProjectForActor,
  listProjectSummariesForUser,
} from "@/lib/server/projects";
import { getAuthorizedTeam } from "@/lib/server/project-authorization";

/** Validate both newly created and edited key scopes against current ownership. */
export async function validateApiKeyProjectAccess(
  userId: string,
  access: ApiKeyProjectAccess
): Promise<string | null> {
  if (access?.teamId) {
    const actor = {
      userId: userId,
      scope: { kind: "team" as const, teamId: access.teamId },
    };
    if (!(await getAuthorizedTeam(actor, "read")))
      return "Invalid project context";
    if (access.mode === "selected") {
      for (const id of new Set(access.projectIds))
        if (!(await getProjectForActor(id, actor)))
          return "Invalid project selection";
    }
  } else if (access?.mode === "selected") {
    const projects = await listProjectSummariesForUser(userId, access);
    const ids = new Set(projects.map((project) => project.id));
    if (access.projectIds.some((id) => !ids.has(id)))
      return "Invalid project selection";
  }
  return null;
}
