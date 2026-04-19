import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listUsersForAdmin } from "@/lib/server/users";

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    { ok: false, error: "You do not have access to the users module." },
    { status: 403 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeaders(request.headers);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!hasCapability(user.role, "admin.users.read")) {
      return forbiddenResponse();
    }

    const users = await listUsersForAdmin();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load users",
      },
      { status: 500 }
    );
  }
}
