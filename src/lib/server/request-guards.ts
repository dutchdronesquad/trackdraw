const SAFE_PAGE_METHODS = "GET, HEAD, OPTIONS";
const SAFE_PAGE_METHOD_SET = new Set(
  SAFE_PAGE_METHODS.split(",").map((method) => method.trim())
);

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function noStoreHeaders(extra?: HeadersInit) {
  return {
    "cache-control": "no-store",
    ...extra,
  };
}

export function getEarlyWorkerResponse(request: Request): Response | null {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const isApiRequest = isApiPath(url.pathname);

  if (
    method === "POST" &&
    request.headers.has("next-action") &&
    !isApiRequest
  ) {
    return new Response("Not found", {
      status: 404,
      headers: noStoreHeaders(),
    });
  }

  if (!isApiRequest && !SAFE_PAGE_METHOD_SET.has(method)) {
    return new Response("Method not allowed", {
      status: 405,
      headers: noStoreHeaders({ allow: SAFE_PAGE_METHODS }),
    });
  }

  return null;
}
