import { describe, expect, it } from "vitest";
import {
  getFieldMapTileCoverage,
  getMapReferenceRenderZoom,
  getMapTileZoom,
  globalPixelToLatLng,
  latLngToGlobalPixel,
  metersPerPixelAtLatitude,
  normalizeMapReference,
  panLatLngByPixels,
  screenDeltaToMapPixelDelta,
} from "@/lib/map-reference/geometry";
import type { MapReference } from "@/lib/types";

const reference: MapReference = {
  type: "map",
  provider: "esri-world-imagery",
  mapStyle: "satellite",
  centerLat: 52.1,
  centerLng: 5.2,
  zoom: 18,
  rotationDeg: 0,
  opacity: 0.35,
  visible: true,
  locked: true,
};

describe("map reference geometry", () => {
  it("round-trips lat/lng through global pixels", () => {
    const pixel = latLngToGlobalPixel(52.1, 5.2, 18);
    const latLng = globalPixelToLatLng(pixel, 18);

    expect(latLng.lat).toBeCloseTo(52.1, 6);
    expect(latLng.lng).toBeCloseTo(5.2, 6);
  });

  it("normalizes map reference metadata", () => {
    expect(
      normalizeMapReference({
        type: "map",
        provider: "esri-world-imagery",
        mapStyle: "satellite",
        centerLat: 95,
        centerLng: 365,
        zoom: 30,
        rotationDeg: -10,
        opacity: -1,
      })
    ).toMatchObject({
      centerLat: 85.05112878,
      centerLng: 5,
      zoom: 20,
      rotationDeg: 350,
      opacity: 0.05,
      visible: true,
      locked: true,
    });
  });

  it("keeps fractional zoom metadata while selecting an integer tile zoom", () => {
    const normalized = normalizeMapReference({
      type: "map",
      provider: "esri-world-imagery",
      centerLat: 52.1,
      centerLng: 5.2,
      zoom: 18.4,
      rotationDeg: 0,
      opacity: 0.35,
    });

    expect(normalized?.zoom).toBe(18.4);
    expect(getMapTileZoom(normalized?.zoom ?? 0)).toBe(18);
    expect(getMapTileZoom(18.6)).toBe(19);
  });

  it("calculates tile coverage from field dimensions", () => {
    const tiles = getFieldMapTileCoverage({
      field: { width: 60, height: 40, ppm: 20 },
      mapReference: reference,
    });

    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((tile) => tile.z === 20)).toBe(true);
    expect(tiles.every((tile) => tile.canvasSize > 0)).toBe(true);
    expect(
      tiles.some(
        (tile) =>
          tile.canvasX <= 0 &&
          tile.canvasX + tile.canvasSize >= 0 &&
          tile.canvasY <= 0 &&
          tile.canvasY + tile.canvasSize >= 0
      )
    ).toBe(true);
  });

  it("uses project scale instead of picker zoom for editor tile coverage", () => {
    const lowPickerZoomTiles = getFieldMapTileCoverage({
      field: { width: 60, height: 40, ppm: 20 },
      mapReference: { ...reference, zoom: 12 },
    });
    const highPickerZoomTiles = getFieldMapTileCoverage({
      field: { width: 60, height: 40, ppm: 20 },
      mapReference: { ...reference, zoom: 19 },
    });

    expect(
      getMapReferenceRenderZoom({ lat: reference.centerLat, ppm: 20 })
    ).toBe(20);
    expect(new Set(lowPickerZoomTiles.map((tile) => tile.z))).toEqual(
      new Set([20])
    );
    expect(new Set(highPickerZoomTiles.map((tile) => tile.z))).toEqual(
      new Set([20])
    );
    expect(lowPickerZoomTiles[0]?.canvasSize).toBeCloseTo(
      highPickerZoomTiles[0]?.canvasSize ?? 0,
      6
    );
  });

  it("pans lat/lng by screen pixels", () => {
    const center = { lat: 52.1, lng: 5.2 };
    const eastMetersPerPixel = metersPerPixelAtLatitude(center.lat, 18);
    const next = panLatLngByPixels({
      center,
      dx: 20,
      dy: 0,
      zoom: 18,
    });

    expect(eastMetersPerPixel).toBeGreaterThan(0);
    expect(next.lng).toBeLessThan(center.lng);
  });

  it("converts screen pan deltas into rotated map pixel deltas", () => {
    expect(
      screenDeltaToMapPixelDelta({ dx: 12, dy: -4, rotationDeg: 0 })
    ).toEqual({ dx: 12, dy: -4 });

    const rightDragAtNinetyDegrees = screenDeltaToMapPixelDelta({
      dx: 10,
      dy: 0,
      rotationDeg: 90,
    });

    expect(rightDragAtNinetyDegrees.dx).toBeCloseTo(0, 6);
    expect(rightDragAtNinetyDegrees.dy).toBeCloseTo(10, 6);
  });
});
