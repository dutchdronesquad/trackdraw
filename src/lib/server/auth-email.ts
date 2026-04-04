import "server-only";

import { getSiteUrl } from "@/lib/seo";

export type AuthEmailContent = {
  subject: string;
  htmlBody: string;
  textBody: string;
};

export type AuthEmailPreviewKey =
  | "magic-link"
  | "verify-email"
  | "change-email";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailShell({
  title,
  eyebrow,
  intro,
  actionLabel,
  url,
  note,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  actionLabel: string;
  url: string;
  note: string;
}) {
  const escapedUrl = escapeHtml(url);
  const escapedTitle = escapeHtml(title);
  const escapedEyebrow = escapeHtml(eyebrow);
  const escapedIntro = escapeHtml(intro);
  const escapedActionLabel = escapeHtml(actionLabel);
  const escapedNote = escapeHtml(note);
  const brandLogoUrl = escapeHtml(
    `${getSiteUrl()}/assets/brand/trackdraw-logo-color-lightbg.svg`
  );

  return `
    <div style="margin: 0; padding: 40px 16px; background: #eef2f7;">
      <div style="margin: 0 auto; max-width: 600px; font-family: Arial, sans-serif; color: #111827;">
        <div style="margin: 0 0 18px; text-align: center;">
          <span style="display: inline-block; border: 1px solid #d7e3f4; border-radius: 999px; background: #f8fbff; padding: 7px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #225b93;">
            ${escapedEyebrow}
          </span>
        </div>
        <div style="overflow: hidden; border: 1px solid #d8e1eb; border-radius: 24px; background: #ffffff; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);">
          <div style="padding: 28px 30px 24px; background: radial-gradient(circle at top right, rgba(30, 147, 219, 0.24), transparent 32%), linear-gradient(135deg, #081122 0%, #111827 100%);">
            <div style="margin-bottom: 22px;">
              <img
                src="${brandLogoUrl}"
                alt="TrackDraw"
                width="154"
                height="30"
                style="display: block; width: 154px; height: auto; max-width: 100%;"
              />
            </div>
            <h1 style="margin: 0 0 10px; max-width: 420px; font-size: 30px; line-height: 1.15; font-weight: 700; letter-spacing: -0.03em; color: #ffffff;">
              ${escapedTitle}
            </h1>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: rgba(226, 232, 240, 0.92); white-space: nowrap;">
              Secure access to your TrackDraw projects and planning tools.
            </p>
          </div>
          <div style="padding: 30px;">
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.75; color: #334155;">
              ${escapedIntro}
            </p>
            <div style="margin: 0 0 24px;">
              <a
                href="${escapedUrl}"
                style="display: inline-block; border-radius: 14px; background: linear-gradient(135deg, #1e93db 0%, #1677b8 100%); padding: 13px 20px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; box-shadow: 0 10px 20px rgba(30, 147, 219, 0.22);"
              >
                ${escapedActionLabel}
              </a>
            </div>
            <div style="margin: 0 0 22px; border-left: 4px solid #f0761d; border-radius: 14px; background: #f8fafc; padding: 16px 18px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #475569;">
                ${escapedNote}
              </p>
            </div>
            <div style="margin: 0 0 22px; border-top: 1px solid #e2e8f0;"></div>
            <p style="margin: 0 0 8px; font-size: 12px; line-height: 1.6; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b;">
              Direct link
            </p>
            <p style="margin: 0; word-break: break-all; font-size: 13px; line-height: 1.7;">
              <a href="${escapedUrl}" style="color: #1e4d8f; text-decoration: underline;">
                ${escapedUrl}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

export function buildMagicLinkEmail(url: string): AuthEmailContent {
  return {
    subject: "Your TrackDraw sign-in link",
    htmlBody: buildEmailShell({
      title: "Sign in to TrackDraw",
      eyebrow: "Magic Link",
      intro:
        "Use the button below to sign in and reopen your TrackDraw projects.",
      actionLabel: "Open TrackDraw",
      url,
      note: "This sign-in link is intended for you only. If you did not request it, you can safely ignore this email.",
    }),
    textBody:
      `Sign in to TrackDraw\n\n` +
      `Open this one-time sign-in link:\n${url}\n\n` +
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
