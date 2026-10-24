import "server-only";
import { buildEmailShell } from "@/lib/email/email-shell";
import { getSiteUrl } from "@/lib/seo";
import { isPlunkConfigured, sendPlunkMail } from "@/lib/server/plunk";

export function buildTeamInvitationEmail(id: string, teamName: string) {
  const url = new URL(
    `/teams/invitation/${encodeURIComponent(id)}`,
    getSiteUrl()
  ).toString();
  return {
    subject: "You are invited to a TrackDraw team",
    htmlBody: buildEmailShell({
      title: "Join a TrackDraw team",
      eyebrow: "Team invitation",
      intro: `You have been invited to join ${teamName}. Sign in with this email address and accept within 7 days.`,
      actionLabel: "Review invitation",
      url,
      note: "Accepting joins this team using your own account. If you were not expecting this invitation, you can ignore it.",
    }),
    textBody: `You have been invited to join ${teamName} on TrackDraw. Sign in with this email address and accept within 7 days:\n${url}`,
  };
}
export async function sendTeamInvitationEmail(
  id: string,
  email: string,
  teamName: string
) {
  const content = buildTeamInvitationEmail(id, teamName);
  if (isPlunkConfigured()) {
    await sendPlunkMail({
      to: { address: email },
      ...content,
      emailType: "team-invitation",
      idempotencyKey: `team-invitation-${id}`,
    });
    return;
  }
  if (process.env.NEXT_PUBLIC_APP_ENV !== "production") {
    // Local development only, mirroring magic-link delivery. No production tokens in logs.
    console.info("[TrackDraw local team invitation]", content.textBody);
    return;
  }
  throw new Error("Invitation delivery unavailable");
}
