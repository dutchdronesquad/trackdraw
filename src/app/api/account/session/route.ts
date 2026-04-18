import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);
    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to resolve session",
      },
      { status: 500 }
    );
  }
}
