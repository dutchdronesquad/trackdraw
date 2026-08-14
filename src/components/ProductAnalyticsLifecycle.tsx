"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import {
  syncProductEventAuthState,
  trackProductEvent,
} from "@/lib/product-events";

function getLandingSurface(pathname: string) {
  if (pathname === "/") return "home" as const;
  if (pathname.startsWith("/studio")) return "studio" as const;
  if (pathname.startsWith("/gallery")) return "gallery" as const;
  if (pathname.startsWith("/share/")) return "share" as const;
  if (pathname.startsWith("/embed/")) return "embed" as const;
  return "other" as const;
}

function getAcquisitionSource() {
  const campaignKeys = ["utm_source", "utm_medium", "utm_campaign"];
  if (
    campaignKeys.some((key) =>
      new URLSearchParams(window.location.search).has(key)
    )
  ) {
    return "campaign" as const;
  }
  if (!document.referrer) return "direct" as const;

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return "internal" as const;
    const hostname = referrer.hostname.toLowerCase();
    if (/google\.|bing\.|duckduckgo\.|search\.brave\./.test(hostname))
      return "search" as const;
    if (
      /facebook\.|instagram\.|linkedin\.|x\.com$|twitter\.|youtube\.|tiktok\./.test(
        hostname
      )
    )
      return "social" as const;
    if (/discord\.|reddit\.|multigp\.|dutchdronesquad\./.test(hostname))
      return "community" as const;
    return "referral" as const;
  } catch {
    return "unknown" as const;
  }
}

export function ProductAnalyticsLifecycle() {
  const { data, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    syncProductEventAuthState(Boolean(data?.user));
    trackProductEvent(
      "acquisition.session_attributed",
      {
        properties: {
          source: getAcquisitionSource(),
          landing_surface: getLandingSurface(window.location.pathname),
        },
      },
      { oncePerSession: "acquisition" }
    );
  }, [data?.user, isPending]);

  return null;
}
