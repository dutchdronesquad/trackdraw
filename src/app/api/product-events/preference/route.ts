import { NextResponse } from "next/server";
import { z } from "zod";
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
