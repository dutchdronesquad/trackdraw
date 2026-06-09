import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isTrustedRequest } from "@/lib/server/csrf";

describe("CSRF request trust guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trusts the configured public site origin and additional auth origins", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");
    vi.stubEnv(
      "BETTER_AUTH_TRUSTED_ORIGINS",
      "https://preview.trackdraw.app, https://admin.trackdraw.app"
    );

    expect(
      isTrustedRequest(
        new Request("https://trackdraw.app/api/projects", {
          method: "POST",
          headers: { origin: "https://trackdraw.app" },
        })
      )
    ).toBe(true);
    expect(
      isTrustedRequest(
        new Request("https://trackdraw.app/api/projects", {
          method: "POST",
          headers: {
            referer: "https://admin.trackdraw.app/dashboard/gallery",
          },
        })
      )
    ).toBe(true);
  });

  it("rejects missing, malformed, and untrusted origins by default", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");

    expect(
      isTrustedRequest(new Request("https://trackdraw.app/api/projects"))
    ).toBe(false);
    expect(
      isTrustedRequest(
        new Request("https://trackdraw.app/api/projects", {
          headers: { origin: "not a url" },
        })
      )
    ).toBe(false);
    expect(
      isTrustedRequest(
        new Request("https://trackdraw.app/api/projects", {
          headers: { origin: "https://evil.example" },
        })
      )
    ).toBe(false);
  });
});
