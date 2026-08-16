const INTERNAL_COUNTRY_HEADER = "x-trackdraw-visitor-country";

type CloudflareRequest = Request & {
  cf?: { country?: string | null };
};

export function normalizeCountryCode(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const code = value.trim().toUpperCase();
  if (code === "XX" || code === "T1") return "unknown";
  return /^[A-Z]{2}$/.test(code) ? code : "unknown";
}

export function addInternalCountryHeader(request: Request): Request {
  const headers = new Headers(request.headers);
  const country = normalizeCountryCode(
    (request as CloudflareRequest).cf?.country
  );

  // Never trust a client-provided value for the internal edge header.
  headers.delete(INTERNAL_COUNTRY_HEADER);
  headers.set(INTERNAL_COUNTRY_HEADER, country);
  return new Request(request, { headers });
}

export function getInternalCountryCode(request: Request): string {
  return normalizeCountryCode(request.headers.get(INTERNAL_COUNTRY_HEADER));
}
