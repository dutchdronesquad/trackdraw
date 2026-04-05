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
    `${getSiteUrl()}/assets/brand/trackdraw-logo-color-darkbg.svg`
  );

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <title>${escapedTitle}</title>
      </head>
      <body style="margin: 0; padding: 0; color: #111827;">
        <table
          role="presentation"
          cellpadding="0"
          cellspacing="0"
          border="0"
          width="100%"
          style="border-collapse: collapse; width: 100%; margin: 0; padding: 0;"
        >
          <tr>
            <td align="center" style="padding: 40px 16px;">
              <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
                width="100%"
                style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;"
              >
                <tr>
                  <td align="center" style="padding: 0 0 18px;">
                    <span style="display: inline-block; border: 1px solid #d7e3f4; border-radius: 999px; background-color: #f8fbff; padding: 7px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #225b93;">
                      ${escapedEyebrow}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="overflow: hidden; border-radius: 24px; background-color: #ffffff; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);">
                      <table
                        role="presentation"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        width="100%"
                        style="border-collapse: collapse; width: 100%;"
                      >
                        <tr>
                          <td bgcolor="#0f172a" style="padding: 28px 30px 24px; background-color: #0f172a; border-top-left-radius: 24px; border-top-right-radius: 24px;">
                            <div style="margin: 0 0 22px;">
                              <img
                                src="${brandLogoUrl}"
                                alt="TrackDraw"
                                width="154"
                                height="30"
                                style="display: block; width: 154px; height: auto; max-width: 100%;"
                              />
                            </div>
                            <table
                              role="presentation"
                              cellpadding="0"
                              cellspacing="0"
                              border="0"
                              width="420"
                              style="border-collapse: collapse; width: 100%; max-width: 420px;"
                            >
                              <tr>
                                <td>
                                  <h1 style="margin: 0 0 10px; font-size: 30px; line-height: 1.15; font-weight: 700; letter-spacing: -0.03em; color: #ffffff;">
                                    ${escapedTitle}
                                  </h1>
                                  <p style="margin: 0; font-size: 13px; line-height: 1.65; color: #dbe5f0;">
                                    Access your TrackDraw projects and planning tools.
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 30px; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
                            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.75; color: #334155;">
                              ${escapedIntro}
                            </p>
                            <table
                              role="presentation"
                              cellpadding="0"
                              cellspacing="0"
                              border="0"
                              style="border-collapse: separate; margin: 0 0 24px;"
                            >
                              <tr>
                                <td bgcolor="#1e93db" style="border-radius: 14px; background-color: #1e93db;">
                                  <a
                                    href="${escapedUrl}"
                                    style="display: inline-block; border-radius: 14px; padding: 13px 20px; font-size: 14px; font-weight: 700; line-height: 1; color: #ffffff; text-decoration: none;"
                                  >
                                    ${escapedActionLabel}
                                  </a>
                                </td>
                              </tr>
                            </table>
                            <table
                              role="presentation"
                              cellpadding="0"
                              cellspacing="0"
                              border="0"
                              width="100%"
                              style="border-collapse: collapse; width: 100%; margin: 0 0 22px;"
                            >
                              <tr>
                                <td style="border-left: 4px solid #f0761d; border-top-right-radius: 14px; border-bottom-right-radius: 14px; padding: 16px 18px;">
                                  <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #475569;">
                                    ${escapedNote}
                                  </p>
                                </td>
                              </tr>
                            </table>
                            <div style="margin: 0 0 22px; border-top: 1px solid #e2e8f0;"></div>
                            <p style="margin: 0 0 8px; font-size: 12px; line-height: 1.6; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b;">
                              Direct link
                            </p>
                            <p style="margin: 0; word-break: break-all; font-size: 13px; line-height: 1.7;">
                              <a href="${escapedUrl}" style="color: #1e4d8f; text-decoration: underline;">
                                ${escapedUrl}
                              </a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();
}

export function buildMagicLinkEmail(url: string): AuthEmailContent {
  return {
    subject: "Your TrackDraw sign-in link",
    htmlBody: buildEmailShell({
      title: "Secure sign-in link",
      eyebrow: "Magic Link",
      intro:
        "Use the button below to sign in and reopen your TrackDraw projects. This link expires in 10 minutes.",
      actionLabel: "Open TrackDraw",
      url,
      note: "This sign-in link is intended for you only. If you did not request it, you can safely ignore this email.",
    }),
    textBody:
      `Sign in to TrackDraw\n\n` +
      `Open this one-time sign-in link within 10 minutes:\n${url}\n\n` +
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
