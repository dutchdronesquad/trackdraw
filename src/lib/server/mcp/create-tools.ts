import "server-only";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  draftProposalSchema,
  validateTrackDraft,
  DRAFT_UNVALIDATED_CONSTRAINTS,
} from "@/lib/track/draft";
import { trackElementCatalog } from "@/lib/track/elements/catalog";
import {
  createMcpProjectForUser,
  ProjectCreateRequestError,
} from "@/lib/server/projects";
import { getSiteUrl } from "@/lib/seo";
import {
  annotations,
  execute,
  ProjectToolError,
  mcpTeamActor,
  projectId,
} from "./project-context";

export const CATALOG_TOOLS = ["get_track_catalog"] as const;
export const CREATE_TOOLS = ["create_track"] as const;
const record = z.record(z.string(), z.unknown());
export function registerCreateTools(
  server: McpServer,
  userId: string,
  canCreate: boolean,
  teamConsent = false
) {
  server.registerTool(
    "get_track_catalog",
    {
      title: "Inspect track catalog and creation schema",
      description:
        "Return a page of supported physical catalog items and the exact version-2 track proposal JSON Schema. All lengths are meters, rotation is degrees with 0 as stored forward, coordinates use a top-left field origin. Catalog placements use catalog_id and keep canonical dimensions/metadata; custom shapes use kind and explicit dimensions. Inventory counts complete placed assemblies including towers. Query before creating a track; no account project data is returned.",
      inputSchema: z.strictObject({
        offset: z.number().int().min(0).max(1000).default(0),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      outputSchema: z.object({
        type: z.literal("track_catalog"),
        schema: z.literal("trackdraw.mcp.project-create.v1"),
        design_version: z.literal(2),
        proposal_schema: record,
        items: z.array(record),
        pagination: z.object({
          offset: z.number(),
          has_more: z.boolean(),
          next_offset: z.number().nullable(),
        }),
        unvalidated_constraints: z.array(z.string()),
      }),
      annotations,
    },
    ({ offset, limit }) =>
      execute(async () => {
        const catalog = trackElementCatalog.filter(
          (entry) => entry.kind !== "label"
        );
        const more = offset + limit < catalog.length;
        return {
          type: "track_catalog",
          schema: "trackdraw.mcp.project-create.v1",
          design_version: 2,
          proposal_schema: z.toJSONSchema(draftProposalSchema),
          items: catalog.slice(offset, offset + limit).map((entry) => ({
            catalog_id: entry.id,
            name: entry.name,
            kind: entry.kind,
            dimensions: entry.dimensions,
            template: {
              id: "unique-item-id",
              catalog_id: entry.id,
              x: 5,
              y: 5,
              rotation: 0,
            },
          })),
          pagination: {
            offset,
            has_more: more,
            next_offset: more ? offset + limit : null,
          },
          unvalidated_constraints: DRAFT_UNVALIDATED_CONSTRAINTS,
        };
      })
  );
  if (!canCreate) return;
  server.registerTool(
    "create_track",
    {
      title: "Create a track project",
      description:
        "Create a new track project in the authorized account from a proposed version-2 track and explicit field/inventory constraints. Requires projects:create consent; never edits, replaces or publishes an existing project. First get_track_catalog for schema, units and supported items. Use a unique idempotency_key for each new project and the SAME key+proposal when retrying; changed proposals require a new key. Returns actionable validation issues or a stable Studio opening URL. Field footprints and assembly counts are checked; clearance and flight safety require user review.",
      inputSchema: z.strictObject({
        team_id: projectId.optional(),
        idempotency_key: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
        proposal: z.unknown(),
      }),
      outputSchema: z.object({
        type: z.literal("project"),
        schema: z.literal("trackdraw.mcp.project-create.v1"),
        project_id: z.string(),
        title: z.string(),
        studio_url: z.string(),
        replayed: z.boolean(),
        design_version: z.literal(2),
        validation: z.object({
          required_inventory: record,
          unvalidated_constraints: z.array(z.string()),
        }),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ idempotency_key, proposal, team_id }) =>
      execute(async () => {
        const actor = mcpTeamActor(userId, team_id, teamConsent);
        const validated = validateTrackDraft(proposal);
        if (!validated.ok)
          throw new ProjectToolError(
            "validation_failed",
            "Correct the proposed track and retry. No project was created.",
            validated.issues
          );
        const bytes = new TextEncoder().encode(
          JSON.stringify(
            actor
              ? { proposal: validated.proposal, teamId: team_id }
              : validated.proposal
          )
        );
        const hash = [
          ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        ]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        try {
          const { project, replayed } = actor
            ? await createMcpProjectForUser(
                userId,
                validated.design,
                idempotency_key,
                hash,
                actor
              )
            : await createMcpProjectForUser(
                userId,
                validated.design,
                idempotency_key,
                hash
              );
          return {
            type: "project",
            schema: "trackdraw.mcp.project-create.v1",
            project_id: project.id,
            title: project.title,
            studio_url: new URL(
              team_id
                ? `/studio?teamId=${encodeURIComponent(team_id)}&teamProject=${encodeURIComponent(project.id)}`
                : `/studio/open/${encodeURIComponent(project.id)}`,
              getSiteUrl()
            ).href,
            replayed,
            design_version: 2,
            validation: {
              required_inventory: validated.required,
              unvalidated_constraints: validated.unvalidated,
            },
          };
        } catch (error) {
          if (error instanceof ProjectCreateRequestError)
            throw new ProjectToolError(error.code, error.message);
          throw error;
        }
      })
  );
}
