import { NextResponse } from "next/server";
import { z } from "zod";
import { parseDesign } from "@/lib/track/design";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  listProjectsForUser,
  ProjectVersionConflictError,
  saveProjectForUser,
} from "@/lib/server/projects";

const saveProjectRequestSchema = z.object({
  design: z.unknown(),
  projectId: z.string().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  forceWrite: z.boolean().optional(),
  baseDesignUpdatedAt: z.string().min(1).nullable().optional(),
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

    const projects = (await listProjectsForUser(user.id)).map((project) => ({
      id: project.id,
      title: project.title,
      updatedAt: project.updatedAt,
      designUpdatedAt: project.designUpdatedAt,
      shapeCount: project.shapeCount,
    }));

    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    console.error("[TrackDraw] Failed to list projects", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to list projects" },
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
      forceWrite: body.forceWrite,
      baseDesignUpdatedAt: body.baseDesignUpdatedAt,
    });

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    if (error instanceof ProjectVersionConflictError) {
      const cloudProject = error.cloudProject;
      return NextResponse.json(
        {
          ok: false,
          code: "project_version_conflict",
          error: error.message,
          conflict: {
            projectId: error.projectId,
            title: error.title,
            localUpdatedAt: error.localUpdatedAt,
            cloudUpdatedAt: error.cloudUpdatedAt,
          },
          project: {
            id: cloudProject.id,
            title: cloudProject.title,
            updatedAt: cloudProject.updatedAt,
            designUpdatedAt: cloudProject.designUpdatedAt,
            shapeCount: cloudProject.shapeCount,
          },
        },
        { status: 409 }
      );
    }

    const message =
      error instanceof z.ZodError
        ? "Invalid project payload"
        : "Failed to save project";
    console.error("[TrackDraw] Failed to save project", { error });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
