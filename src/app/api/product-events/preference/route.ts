import { NextResponse } from "next/server";
import { z } from "zod";
import { auditEventTypes } from "@/lib/audit-events";
import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  deleteProductEventsForSession,
  deleteProductEventsForUser,
  setProductAnalyticsPreference,
} from "@/lib/server/product-events";

const preferenceSchema = z
  .object({
    enabled: z.boolean(),
    sessionId: z.string().uuid().nullable(),
  })
  .strict();

export async function GET(request: Request) {
  const user = await getCurrentUserFromHeaders(request.headers);
  return NextResponse.json({
    ok: true,
    enabled: user?.productAnalyticsEnabled ?? true,
    authenticated: Boolean(user),
  });
}

export async function PUT(request: Request) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const input = preferenceSchema.parse(await request.json());
    const user = await getCurrentUserFromHeaders(request.headers);

    if (user) await setProductAnalyticsPreference(user.id, input.enabled);
    if (!input.enabled) {
      if (user) await deleteProductEventsForUser(user.id);
      if (input.sessionId) await deleteProductEventsForSession(input.sessionId);
    }

    if (user && user.productAnalyticsEnabled !== input.enabled) {
      await recordAuditEvent({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: auditEventTypes.privacyAnalyticsChanged,
        entityType: "privacy_preference",
        entityId: user.id,
        metadata: {
          previousEnabled: user.productAnalyticsEnabled,
          nextEnabled: input.enabled,
          storedEventsDeleted: !input.enabled,
        },
      });
    }

    return NextResponse.json({ ok: true, enabled: input.enabled });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: "Invalid preference" },
        { status: 400 }
      );
    }
    console.error("[TrackDraw] Failed to update product analytics preference", {
      category: "storage",
    });
    return NextResponse.json(
      { ok: false, error: "Failed to update preference" },
      { status: 500 }
    );
  }
}
