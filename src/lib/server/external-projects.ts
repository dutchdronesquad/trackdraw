import "server-only";
import { apiKeyProjectAccess } from "@/lib/api/project-access";
import type { ApiIdentity } from "./api-keys";
import {
  getProjectForActor,
  getProjectForUser,
  listProjectSummariesForActor,
  listProjectSummariesForUser,
  ProjectCursorError,
  ProjectVersionConflictError,
  ProjectCreateRequestError,
} from "./projects";
import { type ProjectActor, type ProjectAction } from "./project-authorization";
import { apiProblem } from "./api-v1";
import { TeamProjectError } from "./team-project-error";

export class ExternalProjectError extends Error {
  constructor(
    readonly code: string,
    readonly status = 404
  ) {
    super(code);
  }
}
export function externalActor(
  request: Request,
  identity: ApiIdentity
): ProjectActor {
  const teamId = new URL(request.url).searchParams.get("team_id");
  const access = apiKeyProjectAccess(identity.key.metadata);
  if (teamId !== null && (!teamId.trim() || teamId.length > 128))
    throw new ExternalProjectError("invalid_context", 400);
  if ((teamId ?? undefined) !== access.teamId)
    throw new ExternalProjectError("not_found");
  return {
    userId: identity.user.id,
    scope: teamId ? { kind: "team", teamId } : { kind: "personal" },
    ...(access.mode === "selected" ? { projectIds: access.projectIds } : {}),
  };
}
export async function externalProject(
  request: Request,
  identity: ApiIdentity,
  id: string,
  action: ProjectAction = "read"
) {
  const actor = externalActor(request, identity);
  const project =
    actor.scope.kind === "personal"
      ? await getProjectForUser(
          id,
          identity.user.id,
          apiKeyProjectAccess(identity.key.metadata)
        )
      : await getProjectForActor(id, actor, action);
  if (!project) throw new ExternalProjectError("not_found");
  return project;
}
export async function externalProjectList(
  request: Request,
  identity: ApiIdentity,
  limit: number,
  afterId?: string
) {
  const actor = externalActor(request, identity);
  if (actor.scope.kind === "personal")
    return listProjectSummariesForUser(
      identity.user.id,
      apiKeyProjectAccess(identity.key.metadata),
      { limit, afterId }
    );
  return listProjectSummariesForActor(actor, limit, afterId);
}
export async function requireExternalProject(
  actor: ProjectActor,
  id: string,
  action: ProjectAction
) {
  const project = await getProjectForActor(id, actor, action);
  if (!project) throw new ExternalProjectError("not_found");
  return project;
}
export function externalFailure(error: unknown) {
  if (error instanceof ProjectVersionConflictError)
    error = new ExternalProjectError("conflict", 409);
  if (error instanceof ProjectCreateRequestError)
    error = new ExternalProjectError(
      error.code,
      error.code === "idempotency_conflict" ? 409 : 404
    );
  const known =
    error instanceof ExternalProjectError || error instanceof TeamProjectError
      ? error
      : null;
  const code = known
    ? known.code
    : error instanceof ProjectCursorError
      ? "bad_request"
      : "unavailable";
  const status = known
    ? known.status
    : error instanceof ProjectCursorError
      ? 400
      : 500;
  return apiProblem({
    status,
    code,
    headers: { "Cache-Control": "no-store" },
    title:
      status === 409
        ? "Conflict"
        : status === 404
          ? "Not Found"
          : "Request unavailable",
    detail:
      code === "lease_unavailable"
        ? "Project is locked. Finish the other editing session or retry after it expires."
        : code === "lease_lost"
          ? "Editing session expired or access changed. Acquire a new session and read the latest revision."
          : code === "conflict"
            ? "The revision changed. Read the current revision before retrying."
            : status === 404
              ? "Project not found."
              : error instanceof ProjectCursorError
                ? "Invalid or expired cursor."
                : "Check the request and context, then retry.",
  });
}
export function withExternalErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
) {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      return externalFailure(error);
    }
  };
}
