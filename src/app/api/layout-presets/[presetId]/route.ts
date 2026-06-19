import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  deleteLayoutPresetForUser,
  renameLayoutPresetForUser,
} from "@/lib/server/layout-presets";

const renamePresetRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required." },
    { status: 401 }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ presetId: string }> }
) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return unauthorizedResponse();

    const { presetId } = await params;
    const body = renamePresetRequestSchema.parse(await request.json());
    await renameLayoutPresetForUser(presetId, user.id, body.name);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload." },
        { status: 400 }
      );
    }
    console.error("[TrackDraw] Failed to rename layout preset", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to rename layout preset." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ presetId: string }> }
) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return unauthorizedResponse();

    const { presetId } = await params;
    await deleteLayoutPresetForUser(presetId, user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TrackDraw] Failed to delete layout preset", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to delete layout preset." },
      { status: 500 }
    );
  }
}
