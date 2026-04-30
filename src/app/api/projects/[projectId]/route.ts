import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  archiveProjectForUser,
  getProjectForUser,
} from "@/lib/server/projects";

type ProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

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

export async function GET(request: Request, context: ProjectRouteContext) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const { projectId } = await context.params;
    if (!projectId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing project id" },
        { status: 400 }
      );
    }

    const project = await getProjectForUser(projectId, user.id);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load project",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: ProjectRouteContext) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const { projectId } = await context.params;
    if (!projectId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing project id" },
        { status: 400 }
      );
    }

    await archiveProjectForUser(projectId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to archive project",
      },
      { status: 500 }
    );
  }
}
