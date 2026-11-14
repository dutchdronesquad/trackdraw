import "server-only";

import { getAuthEmailPreviewContent } from "@/lib/server/auth-email";
import { buildAccountRetentionEmail } from "@/lib/email/account-retention-email";
import { buildTeamSuccessionEmail } from "@/lib/email/team-succession-email";
import { buildTeamInvitationEmail } from "@/lib/server/team-mail";

export const emailPreviewKeys = [
  "magic-link",
  "verify-email",
  "change-email",
  "team-invitation",
  "team-ownership-risk",
  "team-ownership-application",
  "team-ownership-recovery",
  "team-ownership-transferred",
  "retention-first",
  "retention-final",
] as const;
export type EmailPreviewKey = (typeof emailPreviewKeys)[number];
export type EmailPreviewFlow = "authentication" | "teams" | "retention";

export const emailPreviewMeta: Record<
  EmailPreviewKey,
  { flow: EmailPreviewFlow; recipient: string }
> = {
  "magic-link": { flow: "authentication", recipient: "pilot@trackdraw.app" },
  "verify-email": { flow: "authentication", recipient: "pilot@trackdraw.app" },
  "change-email": { flow: "authentication", recipient: "old@trackdraw.app" },
  "team-invitation": { flow: "teams", recipient: "pilot@trackdraw.app" },
  "team-ownership-risk": { flow: "teams", recipient: "pilot@trackdraw.app" },
  "team-ownership-application": {
    flow: "teams",
    recipient: "pilot@trackdraw.app",
  },
  "team-ownership-recovery": {
    flow: "teams",
    recipient: "pilot@trackdraw.app",
  },
  "team-ownership-transferred": {
    flow: "teams",
    recipient: "pilot@trackdraw.app",
  },
  "retention-first": { flow: "retention", recipient: "pilot@trackdraw.app" },
  "retention-final": { flow: "retention", recipient: "pilot@trackdraw.app" },
};

const teamSuccessionSamples = {
  "team-ownership-risk": { event: "risk", state: "open" },
  "team-ownership-application": { event: "application", state: "open" },
  "team-ownership-recovery": { event: "ownerless", state: "recovery" },
  "team-ownership-transferred": { event: "outcome", state: "resolved" },
};

export function getEmailPreviewContent(key: EmailPreviewKey) {
  if (key === "team-invitation") {
    return buildTeamInvitationEmail("preview-team-invitation", "FPV Race Club");
  }
  if (
    key === "team-ownership-risk" ||
    key === "team-ownership-application" ||
    key === "team-ownership-recovery" ||
    key === "team-ownership-transferred"
  ) {
    return buildTeamSuccessionEmail({
      ...teamSuccessionSamples[key],
      teamName: "FPV Race Club",
      deadline: "2026-12-15T00:00:00.000Z",
      applicant: "Alex Morgan",
    });
  }
  if (key === "retention-first" || key === "retention-final") {
    const stage = key === "retention-first" ? "first" : "final";
    return buildAccountRetentionEmail(
      stage,
      new Date("2026-11-03T00:00:00.000Z"),
      new Date("2025-11-03T00:00:00.000Z"),
      new Date(
        stage === "first"
          ? "2026-10-03T00:00:00.000Z"
          : "2026-10-27T00:00:00.000Z"
      )
    );
  }
  return getAuthEmailPreviewContent(key);
}
