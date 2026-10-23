import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getDatabase } from "@/lib/server/db";
import { isTrustedRequest } from "@/lib/server/csrf";
import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";
import {
  listAdminTeams,
  readAdminTeam,
  correctTeamOwner,
} from "@/lib/server/admin-teams";
import { SuccessionError } from "@/lib/server/team-succession";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
export async function GET(request: Request) {
  const user = await getCurrentUserFromHeaders(request.headers);
  if (!user) return json({ ok: false }, 401);
  if (user.role !== "admin") return json({ ok: false }, 403);
  const p = new URL(request.url).searchParams;
  if (
    ["teamId", "after", "search"].some(
      (k) => (p.get(k)?.length ?? 0) > (k === "search" ? 200 : 128)
    )
  )
    return json({ ok: false }, 400);
  const db = await getDatabase();
  if (p.has("teamId")) {
    const detail = await readAdminTeam(db, user.id, p.get("teamId")!);
    return detail ? json({ ok: true, ...detail }) : json({ ok: false }, 404);
  }
  return json({
    ok: true,
    ...(await listAdminTeams(db, user.id, {
      search: p.get("search") ?? undefined,
      after: p.get("after") ?? undefined,
      attention: p.get("attention") === "1",
    })),
  });
}
export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return json({ ok: false }, 403);
  const user = await getCurrentUserFromHeaders(request.headers);
  if (!user) return json({ ok: false }, 401);
  if (user.role !== "admin") return json({ ok: false }, 403);
  const body = await readBoundedRequestBody(request, 4096);
  if (body.tooLarge) return json({ ok: false }, 413);
  try {
    await correctTeamOwner(
      await getDatabase(),
      user.id,
      JSON.parse(new TextDecoder().decode(body.bytes))
    );
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false }, error instanceof SuccessionError ? 409 : 400);
  }
}
