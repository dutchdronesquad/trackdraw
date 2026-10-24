import "server-only";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDatabase } from "@/lib/server/db";
import { annotations, execute } from "./project-context";

/** Available only after explicit teams:access consent; never chooses a team. */
// Schemas contain no account state. Reuse them while keeping servers and handlers request-local.
const listTeamsInputSchema = z.strictObject({
  after_id: z.string().min(1).max(128).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
const listTeamsOutputSchema = z.object({
  teams: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.enum(["owner", "editor", "viewer"]),
    })
  ),
  next_id: z.string().nullable(),
});

export function registerTeamTools(server: McpServer, userId: string) {
  server.registerTool(
    "list_teams",
    {
      title: "List authorized teams",
      description:
        "List live team memberships so the user can explicitly choose a team_id. Does not select a team or return member identities. Omitted team_id on project tools always means personal projects.",
      annotations,
      inputSchema: listTeamsInputSchema,
      outputSchema: listTeamsOutputSchema,
    },
    ({ after_id, limit }) =>
      execute(async () => {
        const db = await getDatabase();
        const { results } = await db
          .prepare(
            "SELECT t.id,t.name,m.role FROM teams t JOIN team_members m ON m.organizationId=t.id WHERE m.userId=? AND (? IS NULL OR t.id>?) ORDER BY t.id LIMIT ?"
          )
          .bind(userId, after_id ?? null, after_id ?? null, limit + 1)
          .all<{
            id: string;
            name: string;
            role: "owner" | "editor" | "viewer";
          }>();
        const teams = results.slice(0, limit);
        return {
          teams,
          next_id: results.length > limit ? teams.at(-1)!.id : null,
        };
      })
  );
}
