import "server-only";

import { NextResponse } from "next/server";
import { getApiIdentityFromBearerKey } from "@/lib/server/api-keys";
import type { ApiIdentity, ApiKeyPermissionSet } from "@/lib/server/api-keys";

const API_VERSION = "v1";

export type ApiAuthResult =
  | { ok: true; identity: ApiIdentity }
  | { ok: false; response: NextResponse };

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    {
      data,
      meta: {
        api_version: API_VERSION,
      },
    },
    init
  );
}

export function apiListSuccess<T>(
  data: T[],
  pagination: {
    limit: number;
    next_cursor: string | null;
    has_more: boolean;
  },
  init?: ResponseInit
) {
  return NextResponse.json(
    {
      data,
      pagination,
      meta: {
        api_version: API_VERSION,
      },
    },
    init
  );
}

export function apiProblem(options: {
  status: number;
  code: string;
  title: string;
  detail: string;
  headers?: HeadersInit;
}) {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/problem+json");

  return NextResponse.json(
    {
      title: options.title,
      status: options.status,
      detail: options.detail,
      code: options.code,
    },
    {
      status: options.status,
      headers,
    }
  );
}

export async function authenticateApiRequest(
  request: Request,
  permissions?: ApiKeyPermissionSet
): Promise<ApiAuthResult> {
  const result = await getApiIdentityFromBearerKey({
    headers: request.headers,
    permissions,
  });

  if (result.ok) {
    return result;
  }

  return {
    ok: false,
    response: apiProblem({
      status: result.status,
      code: result.code,
      title: result.status === 429 ? "Too Many Requests" : "Unauthorized",
      detail: result.detail,
      headers:
        result.status === 429 && result.retryAfterSeconds
          ? { "Retry-After": String(result.retryAfterSeconds) }
          : undefined,
    }),
  };
}
