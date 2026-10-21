import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";
import { teamEditingCommandSchema } from "@/lib/team-projects";
import { parseDesign } from "@/lib/track/design";
import { TeamProjectError } from "@/lib/server/team-project-error";
import {
  acquireProjectLease,
  renewProjectLease,
  releaseProjectLease,
  saveTeamProject,
} from "@/lib/server/team-project-leases";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
export async function POST(request: Request) {
  if (!isTrustedRequest(request))
    return json({ ok: false, code: "unauthorized" }, 403);
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) return json({ ok: false, code: "unauthorized" }, 401);
    const body = await readBoundedRequestBody(request, 2 * 1024 * 1024);
    if (body.tooLarge) return json({ ok: false, code: "invalid" }, 413);
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder().decode(body.bytes));
    } catch {
      return json({ ok: false, code: "invalid" }, 400);
    }
    const parsed = teamEditingCommandSchema.safeParse(value);
    if (!parsed.success) return json({ ok: false, code: "invalid" }, 400);
    const c = parsed.data;
    let result: unknown;
    switch (c.action) {
      case "acquire":
        result = await acquireProjectLease(user.id, c.teamId, c.projectId);
        break;
      case "renew":
        result = await renewProjectLease(
          user.id,
          c.teamId,
          c.projectId,
          c.sessionId
        );
        break;
      case "release":
        result = await releaseProjectLease(user.id, c.projectId, c.sessionId);
        break;
      case "save": {
        const design = parseDesign(c.design);
        if (!design) return json({ ok: false, code: "invalid" }, 400);
        result = await saveTeamProject(
          user.id,
          c.teamId,
          c.projectId,
          c.sessionId,
          c.revision,
          design
        );
        break;
      }
    }
    return json({ ok: true, ...(result as object) });
  } catch (error) {
    if (error instanceof TeamProjectError)
      return json({ ok: false, code: error.code }, error.status);
    console.error("[TrackDraw] Team editing operation failed");
    return json({ ok: false, code: "failed" }, 500);
  }
}
