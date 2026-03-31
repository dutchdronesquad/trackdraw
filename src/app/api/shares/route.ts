import { NextResponse } from "next/server";
import { z } from "zod";
import { parseDesign } from "@/lib/track/design";
import { createShare } from "@/lib/server/shares";
import { buildStoredSharePath } from "@/lib/share";
import { parseEditorView } from "@/lib/view";

const createShareRequestSchema = z.object({
  design: z.unknown(),
  view: z.string().optional(),
  expiresInDays: z
    .union([z.literal(7), z.literal(30), z.literal(90)])
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = createShareRequestSchema.parse(await request.json());

    const design = parseDesign(body.design);
    if (!design) {
      return NextResponse.json(
        { ok: false, error: "Invalid design payload" },
        { status: 400 }
      );
    }

    const share = await createShare(design, {
      expiresInDays: body.expiresInDays ?? 90,
    });
    const path = buildStoredSharePath(
      share.token,
      parseEditorView(body.view) ?? undefined
    );

    return NextResponse.json({
      ok: true,
      share: {
        token: share.token,
        path,
        expiresAt: share.expiresAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid share publish payload"
        : error instanceof Error
          ? error.message
          : "Unknown share publish error";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
