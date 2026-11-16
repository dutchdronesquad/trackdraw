import { NextResponse } from "next/server";
import { parseKnownProjectRevision } from "@/lib/api/project-revision";
import { auditEventTypes } from "@/lib/audit-events";
import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  archiveProjectForUser,
  getProjectForUser,
  readPersonalProject,
} from "@/lib/server/projects";

type ProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

function json(body: unknown, options?: ResponseInit) {
  return NextResponse.json(body, {
    ...options,
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
}

function unauthorizedResponse() {
  return json(
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
      return json({ ok: false, error: "Missing project id" }, { status: 400 });
    }

    const known = new URL(request.url).searchParams.get("knownRevision");
    const knownRevision =
      known === null ? null : parseKnownProjectRevision(known);
    if (known !== null && knownRevision === null) {
      return json(
        { ok: false, error: "Invalid knownRevision" },
        { status: 400 }
      );
    }

    const result = await readPersonalProject(projectId, user.id, {
      knownRevision: knownRevision ?? undefined,
    });
    if (!result) {
      return json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    return json(
      knownRevision === null
        ? { ok: true, project: result.project }
        : { ok: true, ...result }
    );
  } catch (error) {
    console.error("[TrackDraw] Failed to load project", { error });
    return json(
      { ok: false, error: "Failed to load project" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: ProjectRouteContext) {
  if (!isTrustedRequest(request)) {
    return json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const { projectId } = await context.params;
    if (!projectId.trim()) {
      return json({ ok: false, error: "Missing project id" }, { status: 400 });
    }

    const project = await getProjectForUser(projectId, user.id);
    if (!project) {
      return json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const archived = await archiveProjectForUser(projectId, user.id);
    if (archived) {
      await recordAuditEvent({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: auditEventTypes.projectArchived,
        entityType: "project",
        entityId: projectId,
        metadata: {
          title: project.title,
          shapeCount: project.shapeCount,
        },
      });
    }
    return json({ ok: true });
  } catch (error) {
    console.error("[TrackDraw] Failed to archive project", { error });
    return json(
      { ok: false, error: "Failed to archive project" },
      { status: 500 }
    );
  }
}
