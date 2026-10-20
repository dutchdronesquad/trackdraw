import { getSiteUrl } from "@/lib/seo";
import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getProjectForUser } from "@/lib/server/projects";

// A route handler avoids the intentionally static Studio layout's empty headers.
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const user = await getCurrentUserFromHeaders(request.headers);
  const path = `/studio/open/${encodeURIComponent(projectId)}`;
  if (!user) {
    const response = NextResponse.redirect(
      new URL(`/login?callbackURL=${encodeURIComponent(path)}`, getSiteUrl())
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  if (!(await getProjectForUser(projectId, user.id)))
    return new Response("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  const response = NextResponse.redirect(
    new URL(`/studio?project=${encodeURIComponent(projectId)}`, getSiteUrl())
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
