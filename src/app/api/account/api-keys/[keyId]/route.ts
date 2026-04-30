import { NextResponse } from "next/server";
import {
  deleteApiKeyForSession,
  getApiKeyForSession,
} from "@/lib/server/api-keys";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";

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

function forbiddenResponse() {
  return NextResponse.json(
    { ok: false, error: "Forbidden" },
    { status: 403 }
  );
}

function isBetterAuthNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    ("statusCode" in error
      ? (error as { statusCode: unknown }).statusCode === 404
      : false)
  );
}

export async function DELETE(request: Request, context: ApiKeyRouteContext) {
  if (!isTrustedRequest(request)) {
    return forbiddenResponse();
  }

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

    // Fetch key details before deleting so the audit event is self-describing.
    let keyName: string | null = null;
    let keyPrefix: string | null = null;
    let keyStart: string | null = null;
    try {
      const existing = await getApiKeyForSession({
        headers: request.headers,
        keyId,
      });
      keyName = existing?.name ?? null;
      keyPrefix = existing?.prefix ?? null;
      keyStart = existing?.start ?? null;
    } catch (lookupError) {
      if (isBetterAuthNotFound(lookupError)) {
        return NextResponse.json(
          { ok: false, error: "API key not found" },
          { status: 404 }
        );
      }
      // Non-404 lookup errors: proceed; delete will also fail or succeed.
    }

    try {
      await deleteApiKeyForSession({ headers: request.headers, keyId });
    } catch (deleteError) {
      if (isBetterAuthNotFound(deleteError)) {
        return NextResponse.json(
          { ok: false, error: "API key not found" },
          { status: 404 }
        );
      }
      throw deleteError;
    }

    try {
      await createAuditEvent({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "api_key.revoked",
        entityType: "api_key",
        entityId: keyId,
        metadata: {
          name: keyName,
          prefix: keyPrefix,
          start: keyStart,
        },
      });
    } catch (auditError) {
      console.error("[TrackDraw API keys] Failed to audit key revoke", {
        keyId,
        error: auditError,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TrackDraw API keys] Failed to revoke API key", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
