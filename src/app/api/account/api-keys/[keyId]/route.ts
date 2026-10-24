import { z } from "zod";
import { apiKeyProjectAccessSchema } from "@/lib/api/project-access";
import { validateApiKeyProjectAccess } from "@/lib/server/api-key-project-access";
import { NextResponse } from "next/server";
import { auditEventTypes } from "@/lib/audit-events";
import {
  deleteApiKeyForSession,
  getApiKeyForSession,
  updateApiKeyProjectAccessForSession,
  normalizeApiKeyRecord,
} from "@/lib/server/api-keys";
import { recordAuditEvent } from "@/lib/server/audit";
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
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
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

    await recordAuditEvent({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: auditEventTypes.apiKeyRevoked,
      entityType: "api_key",
      entityId: keyId,
      metadata: {
        name: keyName,
        prefix: keyPrefix,
        start: keyStart,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TrackDraw API keys] Failed to revoke API key", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}

const updateScopeSchema = z
  .object({ projectAccess: apiKeyProjectAccessSchema })
  .strict();

export async function PATCH(request: Request, context: ApiKeyRouteContext) {
  if (!isTrustedRequest(request)) return forbiddenResponse();
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return unauthorizedResponse();
    const { keyId } = await context.params;
    if (!keyId.trim())
      return NextResponse.json(
        { ok: false, error: "Missing API key id" },
        { status: 400 }
      );
    if (
      !(request.headers.get("content-type") ?? "").includes("application/json")
    )
      return NextResponse.json(
        { ok: false, error: "Content-Type must be application/json" },
        { status: 415 }
      );
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 16384)
      return NextResponse.json(
        { ok: false, error: "Request body too large" },
        { status: 413 }
      );
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const parsed = updateScopeSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, error: "Invalid API key payload" },
        { status: 400 }
      );
    // Check session ownership before looking up projects, and again during the update.
    const existing = await getApiKeyForSession({
      headers: request.headers,
      keyId,
    });
    if (!existing)
      return NextResponse.json(
        { ok: false, error: "API key not found" },
        { status: 404 }
      );
    const accessError = await validateApiKeyProjectAccess(
      user.id,
      parsed.data.projectAccess
    );
    if (accessError)
      return NextResponse.json(
        { ok: false, error: accessError },
        { status: 400 }
      );
    const updated = await updateApiKeyProjectAccessForSession({
      headers: request.headers,
      keyId,
      projectAccess: parsed.data.projectAccess,
      metadata: existing.metadata,
    });
    const apiKey = normalizeApiKeyRecord(updated);
    await recordAuditEvent({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: auditEventTypes.apiKeyAccessUpdated,
      entityType: "api_key",
      entityId: keyId,
      metadata: { name: apiKey.name, projectAccess: apiKey.projectAccess },
    });
    return NextResponse.json({ ok: true, apiKey });
  } catch (error) {
    if (isBetterAuthNotFound(error))
      return NextResponse.json(
        { ok: false, error: "API key not found" },
        { status: 404 }
      );
    console.error("[TrackDraw API keys] Failed to update project access", {
      error,
    });
    return NextResponse.json(
      { ok: false, error: "Failed to update project access" },
      { status: 500 }
    );
  }
}
