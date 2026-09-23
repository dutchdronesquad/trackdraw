import { viewerSnapshotFromApi } from "@trackdraw/viewer/snapshot/api";
import { getViewerSnapshotId } from "@trackdraw/viewer/snapshot/identity";
import { describe, expect, it } from "vitest";
import { trackdrawOpenApiSchema } from "@/lib/api/openapi";

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object record");
  }

  return value as Record<string, unknown>;
}

describe("OpenAPI schema", () => {
  it("documents the optional overlay duration estimate", () => {
    const overlayPackage =
      trackdrawOpenApiSchema.components.schemas.OverlayPackage;

    expect(overlayPackage.required).not.toContain("duration_estimate");
    expect(
      overlayPackage.properties.duration_estimate.anyOf[0].required
    ).toEqual([
      "estimated_lap_ms",
      "route_length_m",
      "assumed_speed_mps",
      "source",
      "confidence",
    ]);
    expect(
      overlayPackage.properties.duration_estimate.anyOf[0].properties.source
        .enum
    ).toEqual(["trackdraw_default"]);
  });

  it("documents overlay readiness as part of the public overlay package", () => {
    const overlayPackage =
      trackdrawOpenApiSchema.components.schemas.OverlayPackage;

    expect(overlayPackage.required).toContain("readiness");
    expect(overlayPackage.properties.readiness.required).toEqual([
      "status",
      "race_route_id",
      "route_length_m",
      "issues",
      "timing_points",
    ]);
    expect(overlayPackage.properties.readiness.properties.status.enum).toEqual([
      "ready",
      "blocked",
    ]);
    expect(
      overlayPackage.properties.readiness.properties.timing_points.items
        .required
    ).toEqual([
      "shape_id",
      "role",
      "timing_id",
      "split_index",
      "title",
      "path_distance_m",
      "projected_point",
      "route_distance_m",
      "route_progress",
    ]);
  });

  it("keeps the overlay response example aligned with the readiness field", () => {
    const overlayResponse = asRecord(
      trackdrawOpenApiSchema.paths["/api/v1/projects/{projectId}/overlay"].get
        .responses["200"]
    );
    const overlayContent = asRecord(overlayResponse.content);
    const overlayJson = asRecord(overlayContent["application/json"]);
    const overlayEnvelope = asRecord(overlayJson.example);
    const overlayExample = asRecord(overlayEnvelope.data);

    expect(overlayExample.schema).toBe("trackdraw.overlay.v1");
    expect(Object.hasOwn(overlayExample, "readiness")).toBe(true);
    expect(Object.hasOwn(overlayExample, "duration_estimate")).toBe(true);
    expect(Object.hasOwn(overlayExample, "prep")).toBe(false);
    expect(asRecord(overlayExample.duration_estimate)).toMatchObject({
      estimated_lap_ms: 12600,
      source: "trackdraw_default",
      confidence: "low",
    });
    expect(asRecord(overlayExample.readiness)).toMatchObject({
      status: "ready",
      race_route_id: "route_123",
      issues: [],
    });
  });

  it("documents the viewer snapshot package's required top-level fields", () => {
    const viewerSnapshotPackage =
      trackdrawOpenApiSchema.components.schemas.ViewerSnapshotPackage;

    expect(viewerSnapshotPackage.required).toEqual([
      "type",
      "schema",
      "source",
      "title",
      "updated_at",
      "snapshot_id",
      "required_viewer",
      "design",
      "assets",
    ]);
    expect(viewerSnapshotPackage.properties.schema.const).toBe(
      "trackdraw.viewer-snapshot.v1"
    );
    expect(viewerSnapshotPackage.properties.required_viewer.required).toEqual([
      "schema",
      "min_renderer_version",
      "capabilities",
    ]);
    expect(viewerSnapshotPackage.properties.assets.items.required).toEqual([
      "path",
      "content_type",
      "size_bytes",
      "sha256",
    ]);
  });

  it("keeps the viewer snapshot response example aligned with its schema", () => {
    const response = asRecord(
      trackdrawOpenApiSchema.paths[
        "/api/v1/projects/{projectId}/viewer-snapshot"
      ].get.responses["200"]
    );
    const content = asRecord(response.content);
    const json = asRecord(content["application/json"]);
    const envelope = asRecord(json.example);
    const example = asRecord(envelope.data);

    const snapshot = viewerSnapshotFromApi(example);
    expect(getViewerSnapshotId(snapshot)).toBe(snapshot.snapshotId);
    expect(example.schema).toBe("trackdraw.viewer-snapshot.v1");
    expect(Object.hasOwn(example, "assets")).toBe(true);
    expect(Object.hasOwn(example, "snapshot_id")).toBe(true);
    expect(Object.hasOwn(example, "required_viewer")).toBe(true);
  });

  it("documents the cursor query parameter on the project list route", () => {
    const listParameters =
      trackdrawOpenApiSchema.paths["/api/v1/projects"].get.parameters;

    expect(listParameters).toContainEqual({
      $ref: "#/components/parameters/Cursor",
    });
    expect(trackdrawOpenApiSchema.components.parameters.Cursor.in).toBe(
      "query"
    );
  });
});
