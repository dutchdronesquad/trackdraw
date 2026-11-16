import {
  ExternalProjectError,
  externalActor,
  externalProject,
  withExternalErrors,
} from "@/lib/server/external-projects";
import {
  apiProblem,
  apiSuccess,
  authenticateApiRequest,
} from "@/lib/server/api-v1";
import { trackReadPermission } from "@/lib/server/api-keys";
import { toApiTrackPackage } from "@/lib/server/api-projects";
import { apiKeyProjectAccess } from "@/lib/api/project-access";
import { parseKnownProjectRevision } from "@/lib/api/project-revision";
import { readPersonalProject } from "@/lib/server/projects";

type ProjectTrackRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function read(request: Request, context: ProjectTrackRouteContext) {
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

  const known = new URL(request.url).searchParams.get("known_revision");
  if (known !== null) {
    const actor = externalActor(request, auth.identity);
    const knownRevision = parseKnownProjectRevision(known);
    if (knownRevision === null || actor.scope.kind !== "personal") {
      return apiProblem({
        status: 400,
        code: "bad_request",
        title: "Bad Request",
        detail:
          "known_revision must be a positive safe integer for a personal project.",
      });
    }
    const result = await readPersonalProject(projectId, actor.userId, {
      knownRevision,
      projectAccess: apiKeyProjectAccess(auth.identity.key.metadata),
    });
    if (!result) throw new ExternalProjectError("not_found");
    return apiSuccess({
      revision: result.revision,
      track: result.project ? toApiTrackPackage(result.project) : null,
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

  return apiSuccess(toApiTrackPackage(project));
}

export const GET = withExternalErrors(read);
