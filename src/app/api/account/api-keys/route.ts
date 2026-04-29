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

const createApiKeyRequestSchema = z.object({
  name: z.string().trim().min(1).max(64),
  expiresInDays: z
    .number()
    .int()
    .refine((value) => apiKeyExpiryDayOptions.includes(value as never))
    .optional(),
});

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
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
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to list API keys",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = createApiKeyRequestSchema.parse(await request.json());
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
    const message =
      error instanceof z.ZodError
        ? "Invalid API key payload"
        : error instanceof Error
          ? error.message
          : "Failed to create API key";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
