import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildChangeEmailConfirmationEmail,
  buildEmailVerificationEmail,
  buildMagicLinkEmail,
  getAuthEmailPreviewContent,
} from "@/lib/server/auth-email";

describe("auth email templates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds magic-link emails with the configured TrackDraw brand URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.trackdraw.app");

    const email = buildMagicLinkEmail(
      "https://preview.trackdraw.app/api/auth/magic-link/verify?token=abc"
    );

    expect(email.subject).toBe("Your TrackDraw sign-in link");
    expect(email.htmlBody).toContain(
      "https://preview.trackdraw.app/assets/brand/trackdraw-logo-color-darkbg.svg"
    );
    expect(email.htmlBody).toContain("Open TrackDraw");
    expect(email.textBody).toContain("Open this one-time sign-in link");
  });

  it("escapes verification email values in HTML while keeping plain text readable", () => {
    const email = buildEmailVerificationEmail(
      'https://trackdraw.app/verify?token=<bad>&next="/studio"',
      "pilot+<script>@example.com"
    );

    expect(email.htmlBody).toContain("pilot+&lt;script&gt;@example.com");
    expect(email.htmlBody).toContain(
      "https://trackdraw.app/verify?token=&lt;bad&gt;&amp;next=&quot;/studio&quot;"
    );
    expect(email.htmlBody).not.toContain("pilot+<script>@example.com");
    expect(email.textBody).toContain("pilot+<script>@example.com");
  });

  it("describes both old and new addresses for email change confirmations", () => {
    const email = buildChangeEmailConfirmationEmail(
      "https://trackdraw.app/change-email?token=abc",
      "old@example.com",
      "new@example.com"
    );

    expect(email.subject).toBe("Confirm your TrackDraw email change");
    expect(email.htmlBody).toContain("old@example.com");
    expect(email.htmlBody).toContain("new@example.com");
    expect(email.textBody).toContain(
      "Change old@example.com to new@example.com"
    );
  });

  it("returns preview content for all supported auth email previews", () => {
    expect(getAuthEmailPreviewContent("magic-link").subject).toBe(
      "Your TrackDraw sign-in link"
    );
    expect(getAuthEmailPreviewContent("verify-email").subject).toBe(
      "Verify your TrackDraw email"
    );
    expect(getAuthEmailPreviewContent("change-email").subject).toBe(
      "Confirm your TrackDraw email change"
    );
  });
});
