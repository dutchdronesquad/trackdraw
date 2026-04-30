import { describe, expect, it } from "vitest";
import { trackdrawOpenApiSchema } from "@/lib/api/openapi";

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object record");
  }

  return value as Record<string, unknown>;
}

describe("OpenAPI schema", () => {
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
    expect(Object.hasOwn(overlayExample, "prep")).toBe(false);
    expect(asRecord(overlayExample.readiness)).toMatchObject({
      status: "ready",
      race_route_id: "route_123",
      issues: [],
    });
  });
});
