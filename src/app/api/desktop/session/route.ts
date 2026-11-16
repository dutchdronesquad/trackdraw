import { getDesktopAccount } from "@/lib/server/desktop/oauth";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const account = await getDesktopAccount(request);
    return account
      ? Response.json({ account }, { headers })
      : Response.json(
          { error: "invalid_token" },
          { status: 401, headers: { ...headers, "WWW-Authenticate": "Bearer" } }
        );
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
