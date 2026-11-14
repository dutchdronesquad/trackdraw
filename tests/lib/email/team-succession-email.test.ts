import { describe, expect, it } from "vitest";
import { buildTeamSuccessionEmail } from "@/lib/email/team-succession-email";

describe("team succession email deadlines", () => {
  it.each([
    ["risk", "open", "no earlier than"],
    ["application", "open", "deadline is"],
    ["ownerless", "recovery", "removed after"],
  ])("formats the deadline for the %s notice", (event, state, prefix) => {
    const deadline = "2026-12-15T14:05:37.000Z";
    const { htmlBody, textBody } = buildTeamSuccessionEmail({
      event,
      state,
      deadline,
      teamName: "FPV Race Club",
      applicant: "Alex Morgan",
    });

    for (const body of [htmlBody, textBody]) {
      const punctuation = state === "recovery" ? "," : ".";
      expect(body).toContain(`${prefix} 15 December 2026${punctuation}`);
    }
  });
});
