import { describe, expect, it } from "vitest";
import { mergeMessagesWithFallback } from "@/lib/i18n/merge-messages";

describe("mergeMessagesWithFallback", () => {
  it("keeps translations and recursively fills missing objects and arrays", () => {
    expect(
      mergeMessagesWithFallback(
        {
          title: "Source title",
          nested: { translated: "Source", missing: "Fallback" },
          bullets: ["One", "Two"],
        },
        {
          title: "Vertaalde titel",
          nested: { translated: "Vertaald", extra: "Ignored" },
          bullets: ["Eén"],
          extra: "Ignored",
        }
      )
    ).toEqual({
      title: "Vertaalde titel",
      nested: { translated: "Vertaald", missing: "Fallback" },
      bullets: ["Eén", "Two"],
    });
  });

  it("uses the fallback for empty or structurally invalid translations", () => {
    expect(mergeMessagesWithFallback("Source", "   ")).toBe("Source");
    expect(
      mergeMessagesWithFallback({ label: "Source" }, "invalid structure")
    ).toEqual({ label: "Source" });
  });
});
