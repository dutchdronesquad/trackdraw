import { NextResponse } from "next/server";
import { z } from "zod";
import { productEventNames } from "@/lib/product-events";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { recordProductEvent } from "@/lib/server/product-events";

const scalarMetadataSchema = z.union([
  z.string().max(80),
  z.number().finite(),
  z.boolean(),
]);

const productEventSchema = z.object({
  event: z.enum(productEventNames),
  sessionId: z.string().uuid().nullable(),
  projectId: z.string().min(1).max(100).nullable().optional(),
  shareToken: z.string().min(1).max(160).nullable().optional(),
  metadata: z.record(z.string().max(40), scalarMetadataSchema).optional(),
});

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const input = productEventSchema.parse(await request.json());
    if (input.metadata && Object.keys(input.metadata).length > 8) {
      return NextResponse.json(
        { ok: false, error: "Too many metadata fields" },
        { status: 400 }
      );
    }

    const user = await getCurrentUserFromHeaders(request.headers);
    await recordProductEvent({
      event: input.event,
      sessionId: input.sessionId,
      userId: user?.id ?? null,
      projectId: input.projectId,
      shareToken: input.shareToken,
      metadata: input.metadata,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid product event" },
        { status: 400 }
      );
    }

    console.error("[TrackDraw] Failed to record product event", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to record product event" },
      { status: 500 }
    );
  }
}
