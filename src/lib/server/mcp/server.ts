import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { z } from "zod";
import type { toAccountIdentitySummary } from "@/lib/server/api-identity";

/** A fresh server per authenticated request prevents cross-account state reuse. */
export function createMcpServer(
  identity: ReturnType<typeof toAccountIdentitySummary>
) {
  const server = new McpServer(
    { name: "trackdraw", version: "1.0.0" },
    {
      jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
      instructions:
        "TrackDraw currently exposes only an account connection check. Project reads, draft creation, editing and publishing are unavailable through MCP. Local-only Studio projects are not uploaded or accessible.",
    }
  );

  // The transport enforces the read scope, resource binding and live consent.
  // Future project tools need their own explicit scope and ownership checks.
  server.registerTool(
    "get_account",
    {
      title: "Check TrackDraw account",
      description:
        "Return the account authorized by this OAuth connection, its MCP permissions and available capabilities. Does not return the email address, tokens or project contents.",
      inputSchema: z.strictObject({}),
      outputSchema: z.object({
        type: z.literal("api_identity"),
        account: z.object({ id: z.string(), name: z.string().nullable() }),
        permissions: z.record(z.string(), z.array(z.string())).nullable(),
        expires_at: z.string().nullable(),
        mcp: z.object({
          tools: z.array(z.literal("get_account")),
          project_reads: z.literal(false),
          project_writes: z.literal(false),
        }),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const result = {
        ...identity,
        mcp: {
          tools: ["get_account"],
          project_reads: false,
          project_writes: false,
        },
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    }
  );

  return server;
}
