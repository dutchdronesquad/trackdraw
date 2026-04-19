import { NextResponse } from "next/server";
import { z } from "zod";
import { parseDesign } from "@/lib/track/design";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { listProjectsForUser, saveProjectForUser } from "@/lib/server/projects";

const saveProjectRequestSchema = z.object({
  design: z.unknown(),
  projectId: z.string().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
});

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Authenticated cloud project access is not available for this request.",
    },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const projects = await listProjectsForUser(user.id);
    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to list projects",
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

    const body = saveProjectRequestSchema.parse(await request.json());
    const design = parseDesign(body.design);
    if (!design) {
      return NextResponse.json(
        { ok: false, error: "Invalid design payload" },
        { status: 400 }
      );
    }

    const project = await saveProjectForUser(user.id, design, {
      projectId: body.projectId,
      title: body.title,
      description: body.description,
    });

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid project payload"
        : error instanceof Error
          ? error.message
          : "Failed to save project";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
