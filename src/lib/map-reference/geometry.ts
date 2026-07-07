import { clamp } from "@/lib/utils";
import {
  MAP_REFERENCE_DEFAULT_ZOOM,
  MAP_REFERENCE_MAX_ZOOM,
  MAP_REFERENCE_MIN_ZOOM,
  MAP_REFERENCE_TILE_SIZE,
} from "@/lib/map-reference/provider";
import type { FieldSpec, MapReference } from "@/lib/types";

const EARTH_RADIUS_METERS = 6378137;
const EARTH_CIRCUMFERENCE_METERS = 2 * Math.PI * EARTH_RADIUS_METERS;
const MAX_MERCATOR_LAT = 85.05112878;
export const MAP_REFERENCE_MAX_RENDER_TILES = 64;

export interface GlobalPixel {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TileCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface MapReferenceTile extends TileCoordinate {
  canvasX: number;
  canvasY: number;
  canvasSize: number;
}

export interface PixelDelta {
  dx: number;
  dy: number;
}

export function normalizeLongitude(lng: number) {
  if (!Number.isFinite(lng)) return 0;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function clampLatitude(lat: number) {
  if (!Number.isFinite(lat)) return 0;
  return clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
}

export function normalizeMapReference(value: unknown): MapReference | null {
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;
  if (record.type !== "map") return null;
  if (record.provider !== "esri-world-imagery") return null;

  const centerLat = clampLatitude(
    typeof record.centerLat === "number" ? record.centerLat : 0
  );
  const centerLng = normalizeLongitude(
    typeof record.centerLng === "number" ? record.centerLng : 0
  );
  const zoom =
    typeof record.zoom === "number" && Number.isFinite(record.zoom)
      ? clamp(record.zoom, MAP_REFERENCE_MIN_ZOOM, MAP_REFERENCE_MAX_ZOOM)
      : MAP_REFERENCE_DEFAULT_ZOOM;
  const rotationDeg =
    typeof record.rotationDeg === "number" &&
    Number.isFinite(record.rotationDeg)
      ? ((record.rotationDeg % 360) + 360) % 360
      : 0;
  const opacity =
    typeof record.opacity === "number" && Number.isFinite(record.opacity)
      ? clamp(record.opacity, 0.05, 1)
      : 0.35;

  return {
    type: "map",
    provider: "esri-world-imagery",
    mapStyle: "satellite",
    centerLat,
    centerLng,
    zoom,
    rotationDeg,
    opacity,
    visible: typeof record.visible === "boolean" ? record.visible : true,
    locked: true,
  };
}

export function getMapTileZoom(zoom: number) {
  if (!Number.isFinite(zoom)) return MAP_REFERENCE_DEFAULT_ZOOM;
  return Math.round(
    clamp(zoom, MAP_REFERENCE_MIN_ZOOM, MAP_REFERENCE_MAX_ZOOM)
  );
}

export function latLngToGlobalPixel(
  lat: number,
  lng: number,
  zoom: number
): GlobalPixel {
  const safeLat = clampLatitude(lat);
  const safeLng = normalizeLongitude(lng);
  const sinLat = Math.sin((safeLat * Math.PI) / 180);
  const scale = MAP_REFERENCE_TILE_SIZE * 2 ** zoom;

  return {
    x: ((safeLng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

export function globalPixelToLatLng(pixel: GlobalPixel, zoom: number): LatLng {
  const scale = MAP_REFERENCE_TILE_SIZE * 2 ** zoom;
  const lng = (pixel.x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * pixel.y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return {
    lat: clampLatitude(lat),
    lng: normalizeLongitude(lng),
  };
}

export function metersPerPixelAtLatitude(lat: number, zoom: number) {
  return (
    (Math.cos((clampLatitude(lat) * Math.PI) / 180) *
      EARTH_CIRCUMFERENCE_METERS) /
    (MAP_REFERENCE_TILE_SIZE * 2 ** zoom)
  );
}

export function getMapReferenceRenderZoom({
  lat,
  ppm,
}: {
  lat: number;
  ppm: number;
}) {
  if (!Number.isFinite(ppm) || ppm <= 0) return MAP_REFERENCE_DEFAULT_ZOOM;

  const latitudeScale = Math.max(
    0.000001,
    Math.cos((clampLatitude(lat) * Math.PI) / 180)
  );
  const zoom = Math.log2(
    (latitudeScale * EARTH_CIRCUMFERENCE_METERS * ppm) / MAP_REFERENCE_TILE_SIZE
  );

  return Math.round(
    clamp(zoom, MAP_REFERENCE_MIN_ZOOM, MAP_REFERENCE_MAX_ZOOM)
  );
}

function getCoverageBounds({
  field,
  mapReference,
  tileZoom,
}: {
  field: Pick<FieldSpec, "width" | "height" | "ppm">;
  mapReference: MapReference;
  tileZoom: number;
}) {
  const centerPixel = latLngToGlobalPixel(
    mapReference.centerLat,
    mapReference.centerLng,
    tileZoom
  );
  const metersPerPixel = metersPerPixelAtLatitude(
    mapReference.centerLat,
    tileZoom
  );
  const tileCanvasSize = MAP_REFERENCE_TILE_SIZE * metersPerPixel * field.ppm;
  const fieldDiagonalMeters = Math.hypot(field.width, field.height);
  const halfFieldDiagonalMapPx = fieldDiagonalMeters / metersPerPixel / 2;
  const minTileX =
    Math.floor(
      (centerPixel.x - halfFieldDiagonalMapPx) / MAP_REFERENCE_TILE_SIZE
    ) - 1;
  const maxTileX =
    Math.floor(
      (centerPixel.x + halfFieldDiagonalMapPx) / MAP_REFERENCE_TILE_SIZE
    ) + 1;
  const minTileY =
    Math.floor(
      (centerPixel.y - halfFieldDiagonalMapPx) / MAP_REFERENCE_TILE_SIZE
    ) - 1;
  const maxTileY =
    Math.floor(
      (centerPixel.y + halfFieldDiagonalMapPx) / MAP_REFERENCE_TILE_SIZE
    ) + 1;
  const maxTile = 2 ** tileZoom;
  const clampedMinTileY = Math.max(0, minTileY);
  const clampedMaxTileY = Math.min(maxTile - 1, maxTileY);
  const tileColumnCount = Math.max(0, maxTileX - minTileX + 1);
  const tileRowCount =
    clampedMaxTileY >= clampedMinTileY
      ? clampedMaxTileY - clampedMinTileY + 1
      : 0;

  return {
    centerPixel,
    clampedMaxTileY,
    clampedMinTileY,
    maxTile,
    maxTileX,
    metersPerPixel,
    minTileX,
    tileCanvasSize,
    tileCount: tileColumnCount * tileRowCount,
  };
}

export function getFieldMapTileCoverage({
  field,
  mapReference,
}: {
  field: Pick<FieldSpec, "width" | "height" | "ppm">;
  mapReference: MapReference;
}): MapReferenceTile[] {
  if (
    !Number.isFinite(field.width) ||
    !Number.isFinite(field.height) ||
    !Number.isFinite(field.ppm) ||
    field.width <= 0 ||
    field.height <= 0 ||
    field.ppm <= 0
  ) {
    return [];
  }

  let tileZoom = getMapReferenceRenderZoom({
    lat: mapReference.centerLat,
    ppm: field.ppm,
  });
  let coverage = getCoverageBounds({ field, mapReference, tileZoom });
  while (
    coverage.tileCount > MAP_REFERENCE_MAX_RENDER_TILES &&
    tileZoom > MAP_REFERENCE_MIN_ZOOM
  ) {
    tileZoom -= 1;
    coverage = getCoverageBounds({ field, mapReference, tileZoom });
  }

  const tiles: MapReferenceTile[] = [];

  for (
    let tileY = coverage.clampedMinTileY;
    tileY <= coverage.clampedMaxTileY;
    tileY += 1
  ) {
    for (
      let tileX = coverage.minTileX;
      tileX <= coverage.maxTileX;
      tileX += 1
    ) {
      const wrappedTileX =
        ((tileX % coverage.maxTile) + coverage.maxTile) % coverage.maxTile;
      const tilePixelX = tileX * MAP_REFERENCE_TILE_SIZE;
      const tilePixelY = tileY * MAP_REFERENCE_TILE_SIZE;

      tiles.push({
        x: wrappedTileX,
        y: tileY,
        z: tileZoom,
        canvasX:
          (tilePixelX - coverage.centerPixel.x) *
          coverage.metersPerPixel *
          field.ppm,
        canvasY:
          (tilePixelY - coverage.centerPixel.y) *
          coverage.metersPerPixel *
          field.ppm,
        canvasSize: coverage.tileCanvasSize,
      });
    }
  }

  return tiles;
}

export function panLatLngByPixels({
  center,
  dx,
  dy,
  zoom,
}: {
  center: LatLng;
  dx: number;
  dy: number;
  zoom: number;
}) {
  const pixel = latLngToGlobalPixel(center.lat, center.lng, zoom);
  return globalPixelToLatLng({ x: pixel.x - dx, y: pixel.y - dy }, zoom);
}

export function screenDeltaToMapPixelDelta({
  dx,
  dy,
  rotationDeg,
}: PixelDelta & {
  rotationDeg: number;
}): PixelDelta {
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  return {
    dx: cos * dx - sin * dy,
    dy: sin * dx + cos * dy,
  };
}
