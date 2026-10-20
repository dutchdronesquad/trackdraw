import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { listMcpConnections } from "@/lib/server/mcp/connections";

export async function GET(request: Request) {
  const user = await getCurrentUserFromHeaders(request.headers);
  if (!user)
    return Response.json(
      { error: "Authentication required" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  return Response.json(
    { connections: await listMcpConnections(user.id) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
