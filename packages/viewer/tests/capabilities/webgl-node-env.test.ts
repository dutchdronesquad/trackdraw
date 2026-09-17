import { describe, expect, it } from "vitest";
import { detectWebglSupport } from "@trackdraw/viewer/capabilities/webgl";

describe("detectWebglSupport (no DOM environment)", () => {
  it("returns unsupported when document is undefined", () => {
    expect(typeof document).toBe("undefined");
    expect(detectWebglSupport()).toBe("unsupported");
  });
});
