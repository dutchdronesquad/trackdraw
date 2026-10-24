import "server-only";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  previewProjectEdit,
  applyProjectEdit,
  listProjectVersions,
  trackEditChanges,
} from "@/lib/server/project-edits";
import {
  annotations,
  execute,
  projectId,
  ProjectToolError,
  mcpTeamActor,
} from "./project-context";

export const EDIT_TOOLS = [
  "preview_track_edit",
  "apply_track_edit",
  "list_project_versions",
] as const;
const revision = z.number().int().positive();
// Schemas contain no account state. Reuse them while keeping servers and handlers request-local.
const previewTrackEditInputSchema = z.strictObject({
  team_id: projectId.optional(),
  project_id: projectId,
  base_revision: revision,
  changes: trackEditChanges.optional(),
  restore_version_id: z.string().uuid().optional(),
});
const applyTrackEditInputSchema = z.strictObject({
  team_id: projectId.optional(),
  project_id: projectId,
  proposal_id: z.string().uuid(),
  base_revision: revision,
});
const listProjectVersionsInputSchema = z.strictObject({
  team_id: projectId.optional(),
  project_id: projectId,
  cursor: revision.optional(),
});

export function registerEditTools(
  server: McpServer,
  userId: string,
  teamConsent = false
) {
  server.registerTool(
    "preview_track_edit",
    {
      title: "Preview changes to a track",
      description:
        "Preview moving, rotating or naming existing unlocked items using Studio's shared mutations. Does not modify the saved project. Read get_project for base_revision. Supply changes OR restore_version_id from list_project_versions. Review affected items and validation feedback with the user before explicitly calling apply_track_edit. Proposals expire after 30 minutes. No deletion, publication or share changes.",
      inputSchema: previewTrackEditInputSchema,
      annotations: {
        ...annotations,
        readOnlyHint: false,
        idempotentHint: false,
      },
    },
    ({ project_id, base_revision, changes, restore_version_id, team_id }) =>
      execute(async () => {
        if (Boolean(changes) === Boolean(restore_version_id))
          throw new ProjectToolError(
            "validation_failed",
            "Provide changes or restore_version_id, exclusively."
          );
        return previewProjectEdit(
          userId,
          project_id,
          base_revision,
          {
            changes,
            restoreVersionId: restore_version_id,
          },
          mcpTeamActor(userId, team_id, teamConsent)
        );
      })
  );
  server.registerTool(
    "apply_track_edit",
    {
      title: "Apply a reviewed track change",
      description:
        "Explicitly apply the exact proposal the user reviewed. Requires its proposal_id, project_id and base_revision; never accepts replacement patches. Any intervening project write causes revision_conflict. Retrying the same proposal returns the original applied revision without rewriting later work. Returns a recoverable previous_version_id. Never deletes, publishes or changes sharing.",
      inputSchema: applyTrackEditInputSchema,
      annotations: { ...annotations, readOnlyHint: false },
    },
    ({ project_id, proposal_id, base_revision, team_id }) =>
      execute(() =>
        applyProjectEdit(
          userId,
          project_id,
          proposal_id,
          base_revision,
          mcpTeamActor(userId, team_id, teamConsent)
        )
      )
  );
  server.registerTool(
    "list_project_versions",
    {
      title: "Find recoverable project versions",
      description:
        "List durable pre-change versions saved when MCP proposals were applied. To recover, preview_track_edit with restore_version_id and the project's CURRENT base_revision, review the preview, then apply_track_edit. Recovery also saves the version it replaces. Only the authorized account's active project is accessible.",
      inputSchema: listProjectVersionsInputSchema,
      annotations,
    },
    ({ project_id, cursor, team_id }) =>
      execute(() =>
        listProjectVersions(
          userId,
          project_id,
          cursor,
          mcpTeamActor(userId, team_id, teamConsent)
        )
      )
  );
}
