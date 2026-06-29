import { describe, expect, it } from "vitest";
import { createTestTranslate } from "./shapes-translate";

describe("createTestTranslate", () => {
  it("handles placeholders inside plural forms", () => {
    const t = createTestTranslate({
      summary:
        "{count, plural, one {{name} has # gate} other {{name} has # gates}}",
    });

    expect(t("summary", { count: 1, name: "Track A" })).toBe(
      "Track A has 1 gate"
    );
    expect(t("summary", { count: 3, name: "Track A" })).toBe(
      "Track A has 3 gates"
    );
  });
});
