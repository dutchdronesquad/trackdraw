import {
  externalProject,
  withExternalErrors,
} from "@/lib/server/external-projects";
import {
  apiProblem,
  apiSuccess,
  authenticateApiRequest,
} from "@/lib/server/api-v1";
import { trackReadPermission } from "@/lib/server/api-keys";
import { toApiViewerSnapshotPackage } from "@/lib/server/api-projects";

type ViewerSnapshotRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function read(request: Request, context: ViewerSnapshotRouteContext) {
  const auth = await authenticateApiRequest(request, trackReadPermission);
  if (!auth.ok) {
    return auth.response;
  }

  const { projectId } = await context.params;
  if (!projectId.trim()) {
    return apiProblem({
      status: 400,
      code: "bad_request",
      title: "Bad Request",
      detail: "Missing project id.",
    });
  }

  const project = await externalProject(request, auth.identity, projectId);
  if (!project) {
    return apiProblem({
      status: 404,
      code: "not_found",
      title: "Not Found",
      detail: "Project not found.",
    });
  }

  try {
    return apiSuccess(toApiViewerSnapshotPackage(project));
  } catch {
    return apiProblem({
      status: 500,
      code: "internal_error",
      title: "Internal Server Error",
      detail: "Failed to build the viewer snapshot for this project.",
    });
  }
}

export const GET = withExternalErrors(read);
