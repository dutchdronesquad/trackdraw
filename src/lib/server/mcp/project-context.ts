import "server-only";
import { z } from "zod";
import { getDesignShapes } from "@/lib/track/design";
import {
  getProjectForUser,
  ProjectCursorError,
  type StoredProject,
} from "@/lib/server/projects";

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
    return {
      isError: true,
      ...result({
        error: {
          ...(known && error.issues ? { issues: error.issues } : {}),
          code: known
            ? error.code
            : invalidCursor
              ? "invalid_cursor"
              : "unavailable",
          message: known
            ? error.message
            : invalidCursor
              ? "The list cursor is unavailable. Restart list_projects without a cursor."
              : "Project data is temporarily unavailable. Retry the request.",
        },
      }),
    };
  }
}
export async function ownedProject(id: string, userId: string) {
  const project = await getProjectForUser(id, userId);
  if (!project)
    throw new ProjectToolError(
      "not_found",
      "Project not found or unavailable. Use an owned active project ID from list_projects; public share tokens are not project IDs."
    );
  return project;
}

export function assertDerivedDesign(project: StoredProject) {
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
