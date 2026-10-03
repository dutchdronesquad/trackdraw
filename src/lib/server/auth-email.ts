import "server-only";

import { buildEmailShell } from "@/lib/server/email-shell";

export type AuthEmailContent = {
  subject: string;
  htmlBody: string;
  textBody: string;
};

export type AuthEmailPreviewKey =
  "magic-link" | "verify-email" | "change-email";

export function buildMagicLinkConfirmationUrl(url: string) {
  const verifyUrl = new URL(url);
  const confirmationUrl = new URL("/login/magic-link", verifyUrl.origin);
  confirmationUrl.search = verifyUrl.search;
  return confirmationUrl.toString();
}

export function buildMagicLinkEmail(url: string): AuthEmailContent {
  const confirmationUrl = buildMagicLinkConfirmationUrl(url);

  return {
    subject: "Your TrackDraw sign-in link",
    htmlBody: buildEmailShell({
      title: "Secure sign-in link",
      eyebrow: "Magic Link",
      intro:
        "Use the button below to sign in and reopen your TrackDraw projects. This link expires in 10 minutes.",
      actionLabel: "Open TrackDraw",
      url: confirmationUrl,
      note: "This sign-in link is intended for you only. If you did not request it, you can safely ignore this email.",
    }),
    textBody:
      `Sign in to TrackDraw\n\n` +
      `Open this one-time sign-in link within 10 minutes:\n${confirmationUrl}\n\n` +
      `If you did not request this email, you can ignore it.`,
  };
}

export function buildEmailVerificationEmail(
  url: string,
  email: string
): AuthEmailContent {
  return {
    subject: "Verify your TrackDraw email",
    htmlBody: buildEmailShell({
      title: "Verify your email",
      eyebrow: "Account Setup",
      intro: `Confirm ${email} to finish setting up your TrackDraw account.`,
      actionLabel: "Verify email",
      url,
      note: "Verifying your email helps protect account access and makes future sign-in and email changes more reliable.",
    }),
    textBody:
      `Verify your TrackDraw email\n\n` +
      `Confirm ${email} by opening this link:\n${url}`,
  };
}

export function buildChangeEmailConfirmationEmail(
  url: string,
  currentEmail: string,
  newEmail: string
): AuthEmailContent {
  return {
    subject: "Confirm your TrackDraw email change",
    htmlBody: buildEmailShell({
      title: "Confirm your email change",
      eyebrow: "Account Security",
      intro: `We received a request to change your TrackDraw email from ${currentEmail} to ${newEmail}.`,
      actionLabel: "Confirm email change",
      url,
      note: "If you did not request this change, do not open the link. Your existing email will remain in place until the change is confirmed.",
    }),
    textBody:
      `Confirm your TrackDraw email change\n\n` +
      `Change ${currentEmail} to ${newEmail} by opening this link:\n${url}`,
  };
}

export function getAuthEmailPreviewContent(
  key: AuthEmailPreviewKey
): AuthEmailContent {
  switch (key) {
    case "verify-email":
      return buildEmailVerificationEmail(
        "https://dev.trackdraw.app/api/auth/verify-email?token=example",
        "pilot@trackdraw.app"
      );
    case "change-email":
      return buildChangeEmailConfirmationEmail(
        "https://dev.trackdraw.app/api/auth/change-email/confirm?token=example",
        "old@trackdraw.app",
        "new@trackdraw.app"
      );
    case "magic-link":
    default:
      return buildMagicLinkEmail(
        "https://dev.trackdraw.app/api/auth/magic-link/verify?token=example&callbackURL=%2Fstudio"
      );
  }
}
