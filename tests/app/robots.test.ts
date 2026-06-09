import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";

describe("robots metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows public crawling and points at the configured sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.trackdraw.app");

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: "*",
          allow: "/",
        },
      ],
      sitemap: "https://preview.trackdraw.app/sitemap.xml",
      host: "https://preview.trackdraw.app",
    });
  });
});
