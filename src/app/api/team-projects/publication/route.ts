import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";
import { TeamProjectError } from "@/lib/server/team-project-error";
import {
  readTeamPublication,
  changeTeamPublication,
} from "@/lib/server/team-project-publication";
import { teamPublicationCommandSchema } from "@/lib/team-projects";
import { buildStoredSharePath } from "@/lib/share";
import { recordAuditEvent } from "@/lib/server/audit";
import { auditEventTypes } from "@/lib/audit-events";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
function failure(error: unknown) {
  if (error instanceof TeamProjectError)
    return json({ ok: false, code: error.code }, error.status);
  console.error("[TrackDraw] Team publication failed");
  return json({ ok: false, code: "failed" }, 500);
}
export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return json({ ok: false, code: "unauthorized" }, 401);
    const params = new URL(request.url).searchParams;
    const teamId = params.get("teamId"),
      projectId = params.get("projectId");
    if (!teamId || !projectId || teamId.length > 128 || projectId.length > 128)
      return json({ ok: false, code: "invalid" }, 400);
    return json({
      ok: true,
      ...(await readTeamPublication(user.id, teamId, projectId)),
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
    const parsed = teamPublicationCommandSchema.safeParse(input);
    if (!parsed.success) return json({ ok: false, code: "invalid" }, 400);
    const command = parsed.data;
    if (command.action === "list" && !user.name?.trim())
      return json({ ok: false, code: "invalid" }, 400);
    const share = await changeTeamPublication(user.id, command);
    await recordAuditEvent({
      actorUserId: user.id,
      eventType:
        command.action === "publish"
          ? auditEventTypes.sharePublished
          : command.action === "revoke"
            ? auditEventTypes.shareRevoked
            : command.action === "unlist"
              ? auditEventTypes.galleryEntryUnlisted
              : command.action === "update"
                ? auditEventTypes.galleryEntryMetadataUpdated
                : auditEventTypes.galleryEntryListed,
      entityType: "share",
      entityId:
        share?.token ??
        ("token" in command ? command.token : command.projectId),
      metadata: { projectId: command.projectId, teamId: command.teamId },
    });
    return json({
      ok: true,
      share: share
        ? {
            ...share,
            path: buildStoredSharePath(
              share.token,
              command.action === "publish" ? command.view : undefined
            ),
          }
        : null,
    });
  } catch (error) {
    return failure(error);
  }
}
