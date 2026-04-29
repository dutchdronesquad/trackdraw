import { NextResponse } from "next/server";
import { deleteApiKeyForSession } from "@/lib/server/api-keys";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";

type ApiKeyRouteContext = {
  params: Promise<{
    keyId: string;
  }>;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
}

export async function DELETE(request: Request, context: ApiKeyRouteContext) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return unauthorizedResponse();
    }

    const { keyId } = await context.params;
    if (!keyId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing API key id" },
        { status: 400 }
      );
    }

    await deleteApiKeyForSession({
      headers: request.headers,
      keyId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to revoke API key",
      },
      { status: 500 }
    );
  }
}
