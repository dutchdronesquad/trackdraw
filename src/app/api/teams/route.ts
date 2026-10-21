import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";
import {
  executeTeamCommand,
  getTeamDetails,
  getTeamInvitationForUser,
  listTeams,
  TeamError,
} from "@/lib/server/teams";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
function failure(error: unknown) {
  if (error instanceof TeamError)
    return json({ ok: false, code: error.code }, error.status);
  // Never log mail recipients, invite identifiers, tokens or request content.
  console.error("[TrackDraw] Team operation failed");
  return json({ ok: false, code: "failed" }, 500);
}
export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return json({ ok: false, code: "unauthorized" }, 401);
    const params = new URL(request.url).searchParams;
    const invitationId = params.get("invitationId");
    if (invitationId)
      return json({
        ok: true,
        invitation: await getTeamInvitationForUser(user.id, invitationId),
      });
    const teamId = params.get("teamId");
    return json(
      teamId
        ? { ok: true, team: await getTeamDetails(user.id, teamId) }
        : { ok: true, ...(await listTeams(user.id)) }
    );
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
    return json({ ok: true, ...(await executeTeamCommand(user.id, input)) });
  } catch (error) {
    return failure(error);
  }
}
