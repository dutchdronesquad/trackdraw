import { describe, expect, it } from "vitest";
import { create24HourDateTimeFormatter } from "@/lib/date-time";

describe("24-hour date and time formatting", () => {
  it("uses a 24-hour clock even for locales that default to AM and PM", () => {
    const formatted = create24HourDateTimeFormatter("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date("2026-08-15T23:05:00.000Z"));

    expect(formatted).toContain("23:05");
    expect(formatted).not.toMatch(/AM|PM/);
  });
});
