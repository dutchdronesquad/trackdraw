import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpServer } from "@/lib/server/mcp/server";
import { toAccountIdentitySummary } from "@/lib/server/api-identity";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn() }));

const servers: McpServer[] = [];
const clients: Client[] = [];
type ToolRegistration = [
  name: string,
  config: { inputSchema?: unknown; outputSchema?: unknown },
  handler: unknown,
];
const allPermissions = {
  mcp: ["read"],
  tracks: ["read"],
  projects: ["create", "update"],
  teams: ["access"],
};
function createServer(id: string, permissions = allPermissions) {
  const server = createMcpServer(
    toAccountIdentitySummary({ id, name: id }, permissions, null)
  );
  servers.push(server);
  return server;
}
async function connect(server: McpServer) {
  const client = new Client({ name: "schema-isolation-test", version: "1" });
  clients.push(client);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("MCP server schema reuse", () => {
  it("reuses every tool's schemas across fresh servers without sharing handlers", () => {
    const register = vi.spyOn(McpServer.prototype, "registerTool");
    const first = createServer("first");
    const firstCalls: ToolRegistration[] = [...register.mock.calls];
    register.mockClear();
    const second = createServer("second");
    const secondCalls: ToolRegistration[] = register.mock.calls;

    expect(first).not.toBe(second);
    expect(firstCalls).toHaveLength(14);
    expect(secondCalls.map(([name]) => name)).toEqual(
      firstCalls.map(([name]) => name)
    );
    for (const [index, [name, config, handler]] of firstCalls.entries()) {
      const [, otherConfig, otherHandler] = secondCalls[index];
      expect(otherConfig.inputSchema, `${name} input`).toBe(config.inputSchema);
      expect(otherConfig.outputSchema, `${name} output`).toBe(
        config.outputSchema
      );
      expect(otherHandler, `${name} handler`).not.toBe(handler);
    }
  });

  it("keeps interleaved clients' identities, consent and lifetimes independent", async () => {
    const writer = await connect(createServer("writer"));
    const reader = await connect(
      createServer("reader", {
        mcp: ["read"],
        tracks: ["read"],
        projects: [],
        teams: [],
      })
    );
    const [writerTools, readerTools] = await Promise.all([
      writer.listTools(),
      reader.listTools(),
    ]);
    expect(writerTools.tools.map(({ name }) => name)).toContain("create_track");
    expect(writerTools.tools.map(({ name }) => name)).toContain("list_teams");
    expect(readerTools.tools.map(({ name }) => name)).not.toContain(
      "create_track"
    );
    expect(readerTools.tools.map(({ name }) => name)).not.toContain(
      "list_teams"
    );
    for (const client of [writer, reader, writer, reader]) {
      const result = await client.callTool({
        name: "get_account",
        arguments: {},
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        account: {
          id: client === writer ? "writer" : "reader",
          name: client === writer ? "writer" : "reader",
        },
      });
    }
    const denied = await reader.callTool({
      name: "create_track",
      arguments: {},
    });
    expect(denied.isError).toBe(true);
    await writer.close();
    const stillConnected = await reader.callTool({
      name: "get_account",
      arguments: {},
    });
    expect(stillConnected.isError).not.toBe(true);
    expect(stillConnected.structuredContent).toMatchObject({
      account: { id: "reader", name: "reader" },
    });
  });
});
