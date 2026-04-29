import { NextResponse } from "next/server";
import { deleteApiKeyForSession } from "@/lib/server/api-keys";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";

type ApiKeyRouteContext = {
  params: Promise<{
    keyId: string;
  }>;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
}

export async function DELETE(request: Request, context: ApiKeyRouteContext) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const { keyId } = await context.params;
    if (!keyId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing API key id" },
        { status: 400 }
      );
    }

    await deleteApiKeyForSession({
      headers: request.headers,
      keyId,
    });

    try {
      await createAuditEvent({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "api_key.revoked",
        entityType: "api_key",
        entityId: keyId,
      });
    } catch (auditError) {
      console.error("[TrackDraw API keys] Failed to audit key revoke", {
        keyId,
        error: auditError,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to revoke API key",
      },
      { status: 500 }
    );
  }
}
