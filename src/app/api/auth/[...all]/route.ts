import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";
import { getAuth } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    return await (await getAuth()).handler(request);
  } catch (error) {
    console.error("[TrackDraw auth][GET]", error);
    throw error;
  }
}

export async function POST(request: Request) {
  const oauth = new URL(request.url).pathname.startsWith("/api/auth/oauth2/");
  try {
    if (oauth) {
      const body = await readBoundedRequestBody(request, 16_384);
      if (body.tooLarge)
        return Response.json(
          {
            error: "invalid_request",
            error_description: "OAuth request exceeds 16384 bytes.",
          },
          { status: 413, headers: { "Cache-Control": "no-store" } }
        );
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        signal: request.signal,
        body: body.bytes,
      });
    }
    return await (await getAuth()).handler(request);
  } catch (error) {
    if (oauth) {
      console.error("[TrackDraw OAuth] Authentication request failed");
      return Response.json(
        { error: "server_error" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("[TrackDraw auth][POST]", error);
    throw error;
  }
}
