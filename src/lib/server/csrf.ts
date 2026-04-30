import "server-only";

function getTrustedOrigins(): string[] {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const additionalTrustedOrigins = (
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? ""
  )
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8787",
    "http://127.0.0.1:8787",
    configuredSiteUrl,
    ...additionalTrustedOrigins,
  ].filter((v): v is string => Boolean(v));
}

function normalizeOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Rejects requests whose Origin or Referer does not match a trusted origin.
 * Call this on cookie-authenticated mutation endpoints to prevent CSRF.
 */
export function isTrustedRequest(request: Request): boolean {
  const trusted = getTrustedOrigins();

  const rawOrigin =
    request.headers.get("origin") ?? request.headers.get("referer");

  if (!rawOrigin) {
    // No origin header — deny by default for cookie-authenticated mutations.
    return false;
  }

  const origin = normalizeOrigin(rawOrigin);
  if (!origin) {
    return false;
  }

  return trusted.some((t) => {
    try {
      return new URL(t).origin === origin;
    } catch {
      return false;
    }
  });
}
