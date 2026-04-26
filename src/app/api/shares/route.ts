import { NextResponse } from "next/server";
import { z } from "zod";
import { parseDesign } from "@/lib/track/design";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getProjectForUser } from "@/lib/server/projects";
import {
  createShare,
  getShareByProjectIdForUser,
  getSharesByUserId,
} from "@/lib/server/shares";
import { buildStoredSharePath } from "@/lib/share";
import { parseEditorView } from "@/lib/view";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const requestUrl = new URL(request.url);
    const projectId = requestUrl.searchParams.get("projectId")?.trim();

    if (projectId) {
      const share = await getShareByProjectIdForUser(user.id, projectId);
      return NextResponse.json({ ok: true, share });
    }

    const shares = await getSharesByUserId(user.id);
    return NextResponse.json({ ok: true, shares });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list shares",
      },
      { status: 500 }
    );
  }
}

const createShareRequestSchema = z.object({
  design: z.unknown(),
  view: z.string().optional(),
  projectId: z.string().min(1).optional(),
  expiresInDays: z
    .union([z.literal(7), z.literal(30), z.literal(90)])
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = createShareRequestSchema.parse(await request.json());
    const user = await getCurrentUserFromHeaders(request.headers);

    const design = parseDesign(body.design);
    if (!design) {
      return NextResponse.json(
        { ok: false, error: "Invalid design payload" },
        { status: 400 }
      );
    }

    if (body.projectId && !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project-linked publish requires an authenticated user",
        },
        { status: 401 }
      );
    }

    if (body.projectId && user) {
      const project = await getProjectForUser(body.projectId, user.id);
      if (!project) {
        return NextResponse.json(
          { ok: false, error: "Project not found" },
          { status: 404 }
        );
      }
    }

    const share = await createShare(design, {
      expiresInDays: body.expiresInDays ?? 90,
      ownerUserId: user?.id ?? null,
      projectId: body.projectId ?? null,
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
        ownerUserId: share.ownerUserId,
        projectId: share.projectId,
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
