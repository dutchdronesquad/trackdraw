import { describe, expect, it } from "vitest";
import { getMapReferenceTileUrl } from "@/lib/map-reference/tiles";

describe("map reference tiles", () => {
  it("builds the configured satellite tile URL from xyz coordinates", () => {
    expect(getMapReferenceTileUrl({ x: 134_122, y: 86_214, z: 18 })).toBe(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/86214/134122"
    );
  });
});
