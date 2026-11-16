import { getDesktopAccount } from "@/lib/server/desktop/oauth";
import { z } from "zod";
import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";
import { parseDesign, serializeDesign } from "@/lib/track/design";
import {
  acquireProjectLease,
  releaseProjectLease,
  saveTeamProject,
} from "@/lib/server/team-project-leases";
import {
  getProjectForActor,
  readPersonalProject,
  saveProjectForUser,
  PersonalProjectUnavailableError,
  ProjectVersionConflictError,
} from "@/lib/server/projects";
import { readTeamProject, TeamProjectError } from "@/lib/server/team-projects";

const headers = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { headers, status });

export async function GET(request: Request) {
  try {
    const account = await getDesktopAccount(request);
    if (!account) return json({ error: "invalid_token" }, 401);
    if (!account.projectAccess)
      return json({ error: "insufficient_scope" }, 403);

    const params = new URL(request.url).searchParams;
    const projectId = params.get("projectId");
    const teamId = params.get("teamId");
    if (
      !projectId?.trim() ||
      projectId.length > 128 ||
      (teamId !== null && (!teamId.trim() || teamId.length > 128))
    )
      return json({ error: "invalid" }, 400);

    if (teamId) {
      const { project, team } = await readTeamProject(
        account.id,
        teamId,
        projectId
      );
      return json({
        accountId: account.id,
        design: { ...project.design, id: projectId },
        revision: project.revision,
        canEdit: !team.recovery && team.role !== "viewer",
        team: { id: team.id, name: team.name, role: team.role },
      });
    }

    const result = await readPersonalProject(projectId, account.id, {});
    if (!result?.project) return json({ error: "not_found" }, 404);
    return json({
      accountId: account.id,
      design: { ...result.project.design, id: projectId },
      revision: result.revision,
      canEdit: true,
      team: null,
    });
  } catch (error) {
    if (error instanceof TeamProjectError)
      return json({ error: error.code }, error.status);
    return json({ error: "unavailable" }, 503);
  }
}

const saveInput = z.object({
  projectId: z.string().trim().min(1).max(128),
  teamId: z.string().trim().min(1).max(128).nullable(),
  revision: z.number().int().positive(),
  design: z.unknown(),
});

export async function PUT(request: Request) {
  try {
    const account = await getDesktopAccount(request);
    if (!account) return json({ error: "invalid_token" }, 401);
    if (!account.projectWriteAccess)
      return json({ error: "insufficient_scope" }, 403);

    const body = await readBoundedRequestBody(request, 2 * 1024 * 1024);
    if (body.tooLarge) return json({ error: "too_large" }, 413);
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder().decode(body.bytes));
    } catch {
      return json({ error: "invalid" }, 400);
    }
    const input = saveInput.safeParse(value);
    if (!input.success) return json({ error: "invalid" }, 400);
    const { projectId, teamId, revision } = input.data;
    const design = parseDesign(input.data.design);
    if (!design || design.id !== projectId)
      return json({ error: "invalid" }, 400);

    if (!teamId) {
      const saved = await saveProjectForUser(account.id, design, {
        projectId,
        baseRevision: revision,
        requireExisting: true,
      });
      return json({ revision: saved.revision });
    }

    const actor = {
      userId: account.id,
      scope: { kind: "team" as const, teamId },
    };
    if (!(await getProjectForActor(projectId, actor, "update")))
      return json({ error: "not_found" }, 404);
    const { lease, project } = await acquireProjectLease(
      account.id,
      teamId,
      projectId
    );
    try {
      if (
        project.revision >= revision &&
        JSON.stringify(serializeDesign(project.design)) ===
          JSON.stringify(serializeDesign(design))
      )
        return json({ revision: project.revision });

      return json(
        await saveTeamProject(
          account.id,
          teamId,
          projectId,
          lease.sessionId,
          revision,
          design
        )
      );
    } finally {
      await releaseProjectLease(account.id, projectId, lease.sessionId);
    }
  } catch (error) {
    if (error instanceof ProjectVersionConflictError)
      return json({ error: "conflict" }, 409);
    if (error instanceof PersonalProjectUnavailableError)
      return json({ error: "not_found" }, 404);
    if (error instanceof TeamProjectError)
      return json({ error: error.code }, error.status);
    return json({ error: "unavailable" }, 503);
  }
}
