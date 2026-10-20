import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { listMcpConnections } from "@/lib/server/mcp/connections";
import { McpConnections } from "@/components/mcp/connections";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const user = await getCurrentUserFromHeaders(await headers());
  if (!user) redirect("/login?callbackURL=%2Fmcp%2Fconnections");
  return (
    <McpConnections initialConnections={await listMcpConnections(user.id)} />
  );
}
