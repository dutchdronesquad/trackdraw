import { NextResponse } from "next/server";
import { revokeShare } from "@/lib/server/shares";

type ShareTokenRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: ShareTokenRouteContext
) {
  try {
    const { token } = await context.params;

    if (!token.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing share token" },
        { status: 400 }
      );
    }

    await revokeShare(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to revoke share",
      },
      { status: 500 }
    );
  }
}
