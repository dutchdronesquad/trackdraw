import { buildEmailShell } from "@/lib/email/email-shell";

export function buildTeamSuccessionEmail({
  event,
  teamName,
  state,
  deadline,
  applicant,
}: {
  event: string;
  teamName: string;
  state: string;
  deadline: string;
  applicant: string;
}) {
  const text =
    event === "application"
      ? `${applicant} requested ownership of ${teamName}. Ownership cannot transfer before the 30-day waiting period has elapsed after notice delivery. The first eligible editor to complete the 30-day process becomes owner. If you have concerns, contact TrackDraw support; an administrator can correct ownership. The current team recovery deadline is ${deadline}.`
      : event === "outcome"
        ? `Ownership of ${teamName} has been transferred. Sign in to review the team's current ownership and access.`
        : `${teamName} ${state === "recovery" ? "has no owner and is read-only" : "may lose its owner through account inactivity"}. ${state === "recovery" ? `The team and its published links will be permanently removed after ${deadline}, subject to the notified reminder periods.` : `The owner's account removal is scheduled no earlier than ${deadline}.`} Existing members can review succession in Teams. During recovery you can view and export projects; published links remain accessible until final removal. An eligible editor can request ownership. Downloaded copies cannot be recalled.`;
  const url = "https://trackdraw.app/studio?dialog=account&section=teams";

  return {
    subject: "TrackDraw team ownership update",
    textBody: `${text}\n${url}`,
    htmlBody: buildEmailShell({
      title: "Team ownership update",
      eyebrow: "TrackDraw teams",
      intro: text,
      actionLabel: "Review team",
      url,
      note: "Only existing authorized members can access private team projects.",
    }),
  };
}
