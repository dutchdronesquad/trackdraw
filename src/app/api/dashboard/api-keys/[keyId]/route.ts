import { NextResponse } from "next/server";
import { auditEventTypes } from "@/lib/audit-events";
import { revokeApiKeyForAdmin } from "@/lib/server/api-keys";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { isTrustedRequest } from "@/lib/server/csrf";

type DashboardApiKeyRouteContext = {
  params: Promise<{
    keyId: string;
  }>;
};

export async function DELETE(
  request: Request,
  context: DashboardApiKeyRouteContext
) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const actor = await getCurrentUserFromHeaders(request.headers);
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!hasCapability(actor.role, "admin.api-keys.update")) {
      return NextResponse.json(
        { ok: false, error: "Only admins can revoke API keys." },
        { status: 403 }
      );
    }

    const { keyId } = await context.params;
    if (!keyId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing API key id" },
        { status: 400 }
      );
    }

    const revoked = await revokeApiKeyForAdmin(keyId);
    if (!revoked) {
      return NextResponse.json(
        { ok: false, error: "API key not found" },
        { status: 404 }
      );
    }

    await createAuditEvent({
      actorUserId: actor.id,
      targetUserId: revoked.ownerUserId,
      eventType: auditEventTypes.apiKeyRevoked,
      entityType: "api_key",
      entityId: revoked.id,
      metadata: {
        name: revoked.name,
        prefix: revoked.prefix,
        start: revoked.start,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TrackDraw dashboard] Failed to revoke API key", {
      error,
    });
    return NextResponse.json(
      { ok: false, error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
