import { describe, expect, it } from "vitest";
import {
  isViewerCompatible,
  RENDERER_CAPABILITIES,
  RENDERER_VERSION,
} from "@trackdraw/viewer/snapshot/version";
import {
  VIEWER_SNAPSHOT_SCHEMA,
  type RequiredViewer,
} from "@trackdraw/viewer/snapshot/types";

const installed = {
  rendererVersion: RENDERER_VERSION,
  capabilities: new Set<string>(RENDERER_CAPABILITIES),
};

function required(overrides: Partial<RequiredViewer> = {}): RequiredViewer {
  return {
    schema: VIEWER_SNAPSHOT_SCHEMA,
    minRendererVersion: "0.1.0",
    capabilities: ["shape:gate"],
    ...overrides,
  };
}

describe("isViewerCompatible", () => {
  it("is compatible when schema matches, version is satisfied, and capabilities are a subset", () => {
    expect(isViewerCompatible(required(), installed)).toBe(true);
  });

  it("is incompatible when the installed renderer version is too low", () => {
    expect(
      isViewerCompatible(required({ minRendererVersion: "9.9.9" }), installed)
    ).toBe(false);
  });

  it("is incompatible when a required capability is missing", () => {
    expect(
      isViewerCompatible(
        required({ capabilities: ["shape:nonexistent"] }),
        installed
      )
    ).toBe(false);
  });

  it("is incompatible on a schema mismatch regardless of version/capabilities", () => {
    expect(
      isViewerCompatible(
        { ...required(), schema: "trackdraw.viewer-snapshot.v2" as never },
        installed
      )
    ).toBe(false);
  });
});
