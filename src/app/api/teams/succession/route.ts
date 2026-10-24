import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getDatabase } from "@/lib/server/db";
import { isTrustedRequest } from "@/lib/server/csrf";
import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";
import {
  executeSuccessionCommand,
  readSuccessionCases,
  SuccessionError,
} from "@/lib/server/team-succession";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
export async function GET(request: Request) {
  const user = await getCurrentUserFromHeaders(request.headers);
  if (!user) return json({ ok: false }, 401);
  const params = new URL(request.url).searchParams;
  const admin = params.get("admin") === "1";
  if (
    (params.get("after")?.length ?? 0) > 128 ||
    (params.get("teamId")?.length ?? 0) > 128
  )
    return json({ ok: false }, 400);
  if (admin && user.role !== "admin") return json({ ok: false }, 403);
  return json({
    ok: true,
    cases: await readSuccessionCases(await getDatabase(), user.id, admin, {
      after: params.get("after") ?? undefined,
      teamId: params.get("teamId") ?? undefined,
    }),
  });
}
export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return json({ ok: false }, 403);
  const user = await getCurrentUserFromHeaders(request.headers);
  if (!user) return json({ ok: false }, 401);
  const body = await readBoundedRequestBody(request, 4096);
  if (body.tooLarge) return json({ ok: false }, 413);
  try {
    await executeSuccessionCommand(
      await getDatabase(),
      user.id,
      JSON.parse(new TextDecoder().decode(body.bytes)),
      user.role === "admin"
    );
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false }, error instanceof SuccessionError ? 409 : 400);
  }
}
