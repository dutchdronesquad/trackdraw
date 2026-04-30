import { NextResponse } from "next/server";
import { z } from "zod";
import {
  apiKeyExpiryDayOptions,
  createApiKeyForSession,
  listApiKeysForSession,
  normalizeApiKeyExpiryDays,
  normalizeApiKeyRecord,
  normalizeCreatedApiKey,
} from "@/lib/server/api-keys";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";

const MAX_BODY_BYTES = 4096;

const createApiKeyRequestSchema = z.object({
  name: z.string().trim().min(1).max(64),
  expiresInDays: z
    .union([
      z.literal(apiKeyExpiryDayOptions[0]),
      z.literal(apiKeyExpiryDayOptions[1]),
      z.literal(apiKeyExpiryDayOptions[2]),
      z.literal(apiKeyExpiryDayOptions[3]),
    ])
    .optional(),
});

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
}

function forbiddenResponse() {
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const result = await listApiKeysForSession(request.headers);
    return NextResponse.json({
      ok: true,
      apiKeys: result.apiKeys.map(normalizeApiKeyRecord),
      total: result.total,
    });
  } catch (error) {
    console.error("[TrackDraw API keys] Failed to list API keys", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) {
    return forbiddenResponse();
  }

  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Request body too large" },
        { status: 413 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parseResult = createApiKeyRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid API key payload" },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    const apiKey = await createApiKeyForSession({
      headers: request.headers,
      name: body.name,
      expiresInDays: normalizeApiKeyExpiryDays(body.expiresInDays),
    });
    const normalizedApiKey = normalizeCreatedApiKey(apiKey);

    try {
      await createAuditEvent({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "api_key.created",
        entityType: "api_key",
        entityId: normalizedApiKey.id,
        metadata: {
          name: normalizedApiKey.name,
          prefix: normalizedApiKey.prefix,
          start: normalizedApiKey.start,
          expiresAt: normalizedApiKey.expiresAt,
          permissions: normalizedApiKey.permissions,
        },
      });
    } catch (auditError) {
      console.error("[TrackDraw API keys] Failed to audit key creation", {
        keyId: normalizedApiKey.id,
        error: auditError,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        apiKey: normalizedApiKey,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[TrackDraw API keys] Failed to create API key", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
