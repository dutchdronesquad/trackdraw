import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";
import { teamProjectCommandSchema } from "@/lib/team-projects";
import {
  createTeamProject,
  listTeamProjects,
  movePersonalProject,
  previewProjectMove,
  readTeamProject,
  TeamProjectError,
} from "@/lib/server/team-projects";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
function failure(error: unknown) {
  if (error instanceof TeamProjectError)
    return json({ ok: false, code: error.code }, error.status);
  console.error("[TrackDraw] Team project operation failed");
  return json({ ok: false, code: "failed" }, 500);
}
export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return json({ ok: false, code: "unauthorized" }, 401);
    const params = new URL(request.url).searchParams;
    const projectId = params.get("projectId");
    if (params.get("previewMove") === "1" && projectId)
      return json({
        ok: true,
        preview: await previewProjectMove(user.id, projectId),
      });
    const teamId = params.get("teamId");
    if (!teamId || teamId.length > 128 || (projectId?.length ?? 0) > 128)
      return json({ ok: false, code: "invalid" }, 400);
    return json({
      ok: true,
      ...(projectId
        ? await readTeamProject(user.id, teamId, projectId)
        : await listTeamProjects(
            user.id,
            teamId,
            params.get("after") ?? undefined
          )),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  if (!isTrustedRequest(request))
    return json({ ok: false, code: "unauthorized" }, 403);
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return json({ ok: false, code: "unauthorized" }, 401);
    const body = await readBoundedRequestBody(request, 4096);
    if (body.tooLarge) return json({ ok: false, code: "invalid" }, 413);
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(body.bytes));
    } catch {
      return json({ ok: false, code: "invalid" }, 400);
    }
    const parsed = teamProjectCommandSchema.safeParse(input);
    if (!parsed.success) return json({ ok: false, code: "invalid" }, 400);
    const command = parsed.data;
    return json({
      ok: true,
      ...(command.action === "create"
        ? await createTeamProject(user.id, command.teamId, command.title)
        : await movePersonalProject(
            user.id,
            command.teamId,
            command.projectId,
            command.revision,
            command.publicationVersion
          )),
    });
  } catch (error) {
    return failure(error);
  }
}
