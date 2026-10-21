import "server-only";
import type { ProjectActor } from "@/lib/server/project-authorization";
import { TeamProjectError } from "@/lib/server/team-project-error";
import { z } from "zod";
import { getDesignShapes } from "@/lib/track/design";
import {
  getProjectForUser,
  getProjectForActor,
  ProjectCursorError,
  type StoredProject,
} from "@/lib/server/projects";

export function mcpTeamActor(
  userId: string,
  teamId: string | undefined,
  consent: boolean
): ProjectActor | undefined {
  if (!teamId) return undefined;
  if (!consent)
    throw new ProjectToolError(
      "team_consent_required",
      "Reconnect with teams:access consent, then explicitly select team_id. Personal access is unchanged."
    );
  return { userId, scope: { kind: "team", teamId } };
}

export const projectId = z.string().trim().min(1).max(128);
export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
export const MCP_MAX_RESULT_BYTES = 32_768;
export class ProjectToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly issues?: { path: string; code: string; message: string }[]
  ) {
    super(message);
  }
}
function result(data: Record<string, unknown>) {
  const text = JSON.stringify(data);
  if (new TextEncoder().encode(text).byteLength > MCP_MAX_RESULT_BYTES)
    throw new ProjectToolError(
      "response_too_large",
      "This result exceeds 32 KiB. Reduce the current tool’s page limit. For track geometry, use get_track with shape_id to page polyline points. Complete derived packages cannot be returned partially."
    );
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: data,
  };
}
export async function execute(run: () => Promise<Record<string, unknown>>) {
  try {
    return result(await run());
  } catch (error) {
    const known = error instanceof ProjectToolError;
    const invalidCursor = error instanceof ProjectCursorError;
    const teamError = error instanceof TeamProjectError;
    const failure = result({
      error: {
        ...(known && error.issues ? { issues: error.issues } : {}),
        code:
          known || teamError
            ? error.code
            : invalidCursor
              ? "invalid_cursor"
              : "unavailable",
        message: teamError
          ? error.code === "lease_unavailable"
            ? "Project is locked. Finish the other session or retry after expiry."
            : error.code === "conflict"
              ? "Read the current revision and preview a new proposal."
              : "Project or editing session is unavailable. Recheck access and start a new session."
          : known
            ? error.message
            : invalidCursor
              ? "The list cursor is unavailable. Restart list_projects without a cursor."
              : "Project data is temporarily unavailable. Retry the request.",
      },
    });
    // Error content is outside the successful structured output contract. SDK
    // clients validate any structuredContent against the discovered outputSchema.
    return { isError: true, content: failure.content };
  }
}
export async function ownedProject(
  id: string,
  userId: string,
  actor?: ProjectActor
) {
  const project = actor
    ? await getProjectForActor(id, actor)
    : await getProjectForUser(id, userId);
  if (!project)
    throw new ProjectToolError(
      "not_found",
      "Project not found or unavailable. Use an owned active project ID from list_projects; public share tokens are not project IDs."
    );
  return project;
}

export function assertDerivedDesign(
  project: Omit<StoredProject, "ownerUserId">
) {
  if (
    new TextEncoder().encode(JSON.stringify(project.design)).byteLength >
      524_288 ||
    getDesignShapes(project.design).length > 2000
  )
    throw new ProjectToolError(
      "response_too_large",
      "This design is too large for a complete derived result. Use get_project and paged get_track instead."
    );
}
