import { describe, expect, it } from "vitest";
import {
  parseResolvedTheme,
  parseThemePreference,
  resolveTheme,
} from "@/lib/theme";

describe("theme helpers", () => {
  it("parses only supported stored theme values", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference("auto")).toBeNull();
    expect(parseResolvedTheme("light")).toBe("light");
    expect(parseResolvedTheme("system")).toBeNull();
  });

  it("resolves system preferences against the media-query result", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
