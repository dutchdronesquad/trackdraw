import "server-only";

import { getAuthEmailPreviewContent } from "@/lib/server/auth-email";
import { buildAccountRetentionEmail } from "@/lib/email/account-retention-email";

export const emailPreviewKeys = [
  "magic-link",
  "verify-email",
  "change-email",
  "retention-first",
  "retention-final",
] as const;
export type EmailPreviewKey = (typeof emailPreviewKeys)[number];
export type EmailPreviewFlow = "authentication" | "retention";

export const emailPreviewMeta: Record<
  EmailPreviewKey,
  { flow: EmailPreviewFlow; recipient: string }
> = {
  "magic-link": { flow: "authentication", recipient: "pilot@trackdraw.app" },
  "verify-email": { flow: "authentication", recipient: "pilot@trackdraw.app" },
  "change-email": { flow: "authentication", recipient: "old@trackdraw.app" },
  "retention-first": { flow: "retention", recipient: "pilot@trackdraw.app" },
  "retention-final": { flow: "retention", recipient: "pilot@trackdraw.app" },
};

export function getEmailPreviewContent(key: EmailPreviewKey) {
  if (key === "retention-first" || key === "retention-final") {
    const stage = key === "retention-first" ? "first" : "final";
    return buildAccountRetentionEmail(
      stage,
      new Date("2026-11-03T00:17:00.000Z"),
      new Date("2025-11-03T00:17:00.000Z"),
      new Date(
        stage === "first"
          ? "2026-10-03T00:17:00.000Z"
          : "2026-10-27T00:17:00.000Z"
      )
    );
  }
  return getAuthEmailPreviewContent(key);
}
