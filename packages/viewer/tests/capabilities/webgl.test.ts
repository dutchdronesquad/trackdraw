// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { detectWebglSupport } from "@trackdraw/viewer/capabilities/webgl";

function fakeCanvas(context: unknown): HTMLCanvasElement {
  return {
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
}

describe("detectWebglSupport", () => {
  it("returns supported when getContext yields a context", () => {
    expect(detectWebglSupport(() => fakeCanvas({}))).toBe("supported");
  });

  it("returns unsupported when getContext returns null", () => {
    expect(detectWebglSupport(() => fakeCanvas(null))).toBe("unsupported");
  });

  it("returns unsupported when getContext throws", () => {
    const canvas = {
      getContext: () => {
        throw new Error("no webgl");
      },
    } as unknown as HTMLCanvasElement;
    expect(detectWebglSupport(() => canvas)).toBe("unsupported");
  });
});
