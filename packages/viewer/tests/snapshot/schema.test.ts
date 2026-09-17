import { describe, expect, it } from "vitest";
import {
  MAX_VIEWER_SNAPSHOT_BYTES,
  ViewerSnapshotValidationError,
  validateViewerDesignSnapshot,
} from "@trackdraw/viewer/snapshot/schema";
import { VIEWER_SNAPSHOT_SCHEMA } from "@trackdraw/viewer/snapshot/types";
import type { ViewerDesignSnapshot } from "@trackdraw/viewer/snapshot/types";

function validSnapshot(): ViewerDesignSnapshot {
  return {
    schema: VIEWER_SNAPSHOT_SCHEMA,
    snapshotId: "snap-1",
    requiredViewer: {
      schema: VIEWER_SNAPSHOT_SCHEMA,
      minRendererVersion: "0.1.0",
      capabilities: ["shape:gate"],
    },
    design: {
      version: 2,
      title: "Test Track",
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [{ id: "gate-1", kind: "gate", x: 0, y: 0, rotation: 0 }],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    assets: [],
  };
}

describe("validateViewerDesignSnapshot", () => {
  it("round-trips a valid snapshot unchanged", () => {
    const snapshot = validSnapshot();
    expect(validateViewerDesignSnapshot(snapshot)).toEqual(snapshot);
  });

  it("throws a schema validation error when a required field is missing", () => {
    const snapshot = validSnapshot();
    // @ts-expect-error deliberately corrupting the snapshot for the test
    delete snapshot.snapshotId;

    try {
      validateViewerDesignSnapshot(snapshot);
      expect.unreachable("expected validateViewerDesignSnapshot to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ViewerSnapshotValidationError);
      expect((error as ViewerSnapshotValidationError).cause_.type).toBe(
        "schema"
      );
    }
  });

  it("rejects a schema literal mismatch", () => {
    const snapshot = validSnapshot();
    // @ts-expect-error deliberately corrupting the snapshot for the test
    snapshot.schema = "trackdraw.viewer-snapshot.v2";

    expect(() => validateViewerDesignSnapshot(snapshot)).toThrow(
      ViewerSnapshotValidationError
    );
  });

  it("rejects a design.version literal mismatch", () => {
    const snapshot = validSnapshot();
    // @ts-expect-error deliberately corrupting the snapshot for the test
    snapshot.design.version = 1;

    expect(() => validateViewerDesignSnapshot(snapshot)).toThrow(
      ViewerSnapshotValidationError
    );
  });

  it("rejects an asset entry with a non-hex or uppercase sha256", () => {
    const snapshot = validSnapshot();
    snapshot.assets = [
      {
        path: "/assets/models/textures/multigp-obstacles/x.webp",
        contentType: "image/webp",
        sizeBytes: 100,
        sha256: "A".repeat(64),
      },
    ];

    expect(() => validateViewerDesignSnapshot(snapshot)).toThrow(
      ViewerSnapshotValidationError
    );
  });

  it("rejects negative field dimensions", () => {
    const snapshot = validSnapshot();
    snapshot.design.field.width = -1;

    expect(() => validateViewerDesignSnapshot(snapshot)).toThrow(
      ViewerSnapshotValidationError
    );
  });

  it("throws a too_large error when the serialized snapshot exceeds the byte cap", () => {
    const snapshot = validSnapshot();
    snapshot.design.title = "x".repeat(MAX_VIEWER_SNAPSHOT_BYTES + 1);

    try {
      validateViewerDesignSnapshot(snapshot);
      expect.unreachable("expected validateViewerDesignSnapshot to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ViewerSnapshotValidationError);
      const failure = (error as ViewerSnapshotValidationError).cause_;
      expect(failure.type).toBe("too_large");
      if (failure.type === "too_large") {
        expect(failure.byteLength).toBeGreaterThan(MAX_VIEWER_SNAPSHOT_BYTES);
      }
    }
  });
});
