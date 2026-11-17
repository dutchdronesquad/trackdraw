import { getDesktopAccount } from "@/lib/server/desktop/oauth";
import { readPersonalProject } from "@/lib/server/projects";
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
        design: project.design,
        team: { id: team.id, name: team.name },
      });
    }

    const result = await readPersonalProject(projectId, account.id, {});
    if (!result?.project) return json({ error: "not_found" }, 404);
    return json({
      accountId: account.id,
      design: result.project.design,
      team: null,
    });
  } catch (error) {
    if (error instanceof TeamProjectError)
      return json({ error: error.code }, error.status);
    return json({ error: "unavailable" }, 503);
  }
}
