const EMBED_REFERRER_ONCE_KEY_PREFIX = "trackdraw.embedReferrer.";

function isPrivateOrIpHostname(hostname: string) {
  if (hostname === "localhost" || !hostname.includes(".")) return true;
  if (hostname.includes(":")) return true;
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

export function normalizeEmbedReferrerHostname(value: string | null) {
  if (!value) return null;

  const hostname = value.trim().toLowerCase().replace(/\.$/, "");
  if (
    hostname.length === 0 ||
    hostname.length > 253 ||
    isPrivateOrIpHostname(hostname)
  ) {
    return null;
  }
  if (hostname === "trackdraw.app" || hostname.endsWith(".trackdraw.app")) {
    return null;
  }

  const labels = hostname.split(".");
  if (
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    )
  ) {
    return null;
  }

  return hostname;
}

export function getEmbedReferrerHostname(
  referrer: string,
  currentHostname: string
) {
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const hostname = normalizeEmbedReferrerHostname(url.hostname);
    const normalizedCurrentHostname =
      normalizeEmbedReferrerHostname(currentHostname);
    if (!hostname || hostname === normalizedCurrentHostname) return null;
    return hostname;
  } catch {
    return null;
  }
}

export function trackEmbedReferrer(shareToken: string) {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") return;

  const hostname = getEmbedReferrerHostname(
    document.referrer,
    window.location.hostname
  );
  if (!hostname) return;

  const onceKey = `${EMBED_REFERRER_ONCE_KEY_PREFIX}${shareToken}:${hostname}`;
  try {
    if (window.sessionStorage.getItem(onceKey)) return;
    window.sessionStorage.setItem(onceKey, "1");
  } catch {
    // Aggregation remains best effort when browser storage is unavailable.
  }

  void fetch("/api/embed-referrers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ shareToken, hostname }),
    keepalive: true,
  }).catch(() => {
    // Referrer aggregation must never interrupt the embedded viewer.
  });
}
