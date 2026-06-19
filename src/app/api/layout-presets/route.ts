import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import type { LayoutPreset } from "@/lib/planning/layout-presets";
import {
  listLayoutPresetsForUser,
  saveLayoutPresetForUser,
} from "@/lib/server/layout-presets";

const layoutPresetShapeSchema = z
  .object({
    kind: z.string().refine((k) => k !== "polyline", {
      message: "Polyline shapes cannot be stored in presets.",
    }),
    x: z.number(),
    y: z.number(),
    rotation: z.number().optional(),
    color: z.string().optional(),
  })
  .passthrough();

const savePresetRequestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(""),
  shapes: z.array(layoutPresetShapeSchema).min(1, {
    message: "A preset must contain at least one shape.",
  }),
});

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required." },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return unauthorizedResponse();

    const presets = await listLayoutPresetsForUser(user.id);
    return NextResponse.json({ ok: true, presets });
  } catch (error) {
    console.error("[TrackDraw] Failed to list layout presets", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to list layout presets." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return unauthorizedResponse();

    const body = savePresetRequestSchema.parse(await request.json());
    const preset = await saveLayoutPresetForUser(user.id, {
      id: body.id,
      name: body.name,
      description: body.description,
      shapes: body.shapes as LayoutPreset["shapes"],
    });

    return NextResponse.json({ ok: true, preset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid preset payload." },
        { status: 400 }
      );
    }
    console.error("[TrackDraw] Failed to save layout preset", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to save layout preset." },
      { status: 500 }
    );
  }
}
