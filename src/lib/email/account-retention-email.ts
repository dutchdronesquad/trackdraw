import { getSiteUrl } from "@/lib/seo";
import { formatAccountInactivity } from "@/lib/server/account-retention-timeline";
import { buildEmailShell } from "@/lib/email/email-shell";

export type AccountRetentionNoticeStage = "first" | "final";

export function buildAccountRetentionEmail(
  stage: AccountRetentionNoticeStage,
  removalAt: Date,
  activityAt: Date,
  now: Date
) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(removalAt);
  const deadline = date;
  const title =
    stage === "first"
      ? "Keep your TrackDraw account"
      : "Final warning before account removal";
  const intro =
    stage === "first"
      ? `Your TrackDraw account has been inactive for about ${formatAccountInactivity(activityAt, now)}. Your account and its cloud data are scheduled for permanent removal on ${deadline}.`
      : `This is the final warning before your inactive TrackDraw account and its cloud data are permanently removed on ${deadline}.`;
  const note =
    "Sign in and use TrackDraw before this date to keep your account and restart the inactivity period. This is a service notice about your account, independent of marketing preferences.";
  const actionLabel = "Sign in to keep your account";
  const url = new URL("/login?callbackURL=%2Fstudio", getSiteUrl()).toString();
  return {
    subject:
      stage === "first"
        ? "Sign in to keep your TrackDraw account"
        : "Final warning: sign in to keep your TrackDraw account",
    htmlBody: buildEmailShell({
      title,
      eyebrow: "Account retention",
      intro,
      actionLabel,
      url,
      note,
    }),
    textBody: `${title}\n\n${intro}\n\n${actionLabel}: ${url}\n\n${note}`,
  };
}
