import { getDesktopAccount } from "@/lib/server/desktop/oauth";
import {
  listProjectSummariesForUser,
  ProjectCursorError,
} from "@/lib/server/projects";
import { listTeamProjects, TeamProjectError } from "@/lib/server/team-projects";
import { listTeams } from "@/lib/server/teams";

const headers = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { headers, status });

export async function GET(request: Request) {
  try {
    const account = await getDesktopAccount(request);
    if (!account) return json({ error: "invalid_token" }, 401);
    if (!account.libraryAccess)
      return json({ error: "insufficient_scope" }, 403);

    const params = new URL(request.url).searchParams;
    const scope = params.get("scope");
    const teamId = params.get("teamId") ?? undefined;
    const after = params.get("after") ?? undefined;
    if ((teamId?.length ?? 0) > 128 || (after?.length ?? 0) > 128)
      return json({ error: "invalid" }, 400);

    if (scope === "teams") {
      const { teams } = await listTeams(account.id);
      return json({
        teams: teams.map(({ id, name, role, recovery }) => ({
          id,
          name,
          role,
          recovery,
        })),
      });
    }
    if (scope === "team" && teamId) {
      const { team, projects, nextCursor } = await listTeamProjects(
        account.id,
        teamId,
        after
      );
      return json({
        team: {
          id: team.id,
          name: team.name,
          role: team.role,
          canEdit: !team.recovery && team.role !== "viewer",
        },
        projects,
        nextCursor,
      });
    }
    if (scope === "personal") {
      const summaries = await listProjectSummariesForUser(
        account.id,
        undefined,
        {
          afterId: after,
          limit: 51,
        }
      );
      const projects = summaries
        .slice(0, 50)
        .map(({ id, title, updatedAt, shapeCount }) => ({
          id,
          title,
          updatedAt,
          shapeCount,
        }));
      return json({
        projects,
        nextCursor: summaries.length > 50 ? projects.at(-1)!.id : null,
      });
    }
    return json({ error: "invalid" }, 400);
  } catch (error) {
    if (error instanceof ProjectCursorError)
      return json({ error: "invalid" }, 400);
    if (error instanceof TeamProjectError)
      return json({ error: error.code }, error.status);
    return json({ error: "unavailable" }, 503);
  }
}
