import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildChangeEmailConfirmationEmail,
  buildEmailVerificationEmail,
  buildMagicLinkConfirmationUrl,
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
      "https://preview.trackdraw.app/assets/brand/trackdraw-logo-color-darkbg@2x.png"
    );
    expect(email.htmlBody).toContain("Open TrackDraw");
    expect(email.htmlBody).toContain(
      "https://preview.trackdraw.app/login/magic-link?token=abc"
    );
    expect(email.htmlBody).not.toContain("/api/auth/magic-link/verify");
    expect(email.textBody).toContain("Open this one-time sign-in link");
    expect(email.textBody).toContain(
      "https://preview.trackdraw.app/login/magic-link?token=abc"
    );
  });

  it("rewrites magic-link verification URLs to the confirmation page", () => {
    expect(
      buildMagicLinkConfirmationUrl(
        "https://trackdraw.app/api/auth/magic-link/verify?token=abc&callbackURL=%2Fstudio%2F2%2Fproject-1"
      )
    ).toBe(
      "https://trackdraw.app/login/magic-link?token=abc&callbackURL=%2Fstudio%2F2%2Fproject-1"
    );
  });

  it("keeps the Outlook layout on tables without wrapping the full email card in VML", () => {
    const email = buildMagicLinkEmail(
      "https://trackdraw.app/api/auth/magic-link/verify?token=abc"
    );

    expect(email.htmlBody).toMatch(
      /<!--\[if mso\]>[\s\S]*?<table\b(?=[^>]*\swidth=["']600["'])(?=[^>]*\salign=["']center["'])[^>]*>[\s\S]*?<!\[endif\]-->/
    );
    expect(email.htmlBody).toContain("<v:roundrect");
    expect(email.htmlBody).not.toContain("<v:textbox");
    expect(email.htmlBody).not.toContain("<w:txbxContent");
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
