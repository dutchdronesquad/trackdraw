import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { disconnectMcpConnection } from "@/lib/server/mcp/connections";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ consentId: string }> }
) {
  const headers = { "Cache-Control": "no-store" };
  if (!isTrustedRequest(request))
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  const user = await getCurrentUserFromHeaders(request.headers);
  if (!user)
    return Response.json(
      { error: "Authentication required" },
      { status: 401, headers }
    );
  const { consentId } = await params;
  const deleted = await disconnectMcpConnection(user.id, consentId);
  return Response.json(
    { ok: deleted },
    { status: deleted ? 200 : 404, headers }
  );
}
