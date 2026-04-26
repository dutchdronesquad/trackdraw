import { clamp } from "@/lib/canvas/shared";
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

export function getFieldMapTileCoverage({
  field,
  mapReference,
}: {
  field: Pick<FieldSpec, "width" | "height" | "ppm">;
  mapReference: MapReference;
}): MapReferenceTile[] {
  const tileZoom = getMapReferenceRenderZoom({
    lat: mapReference.centerLat,
    ppm: field.ppm,
  });
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
  const minTileX = Math.floor(
    (centerPixel.x - halfFieldDiagonalMapPx) / MAP_REFERENCE_TILE_SIZE
  );
  const maxTileX = Math.floor(
    (centerPixel.x + halfFieldDiagonalMapPx) / MAP_REFERENCE_TILE_SIZE
  );
  const minTileY = Math.floor(
    (centerPixel.y - halfFieldDiagonalMapPx) / MAP_REFERENCE_TILE_SIZE
  );
  const maxTileY = Math.floor(
    (centerPixel.y + halfFieldDiagonalMapPx) / MAP_REFERENCE_TILE_SIZE
  );
  const maxTile = 2 ** tileZoom;
  const tiles: MapReferenceTile[] = [];

  for (let tileY = minTileY - 1; tileY <= maxTileY + 1; tileY += 1) {
    if (tileY < 0 || tileY >= maxTile) continue;

    for (let tileX = minTileX - 1; tileX <= maxTileX + 1; tileX += 1) {
      const wrappedTileX = ((tileX % maxTile) + maxTile) % maxTile;
      const tilePixelX = tileX * MAP_REFERENCE_TILE_SIZE;
      const tilePixelY = tileY * MAP_REFERENCE_TILE_SIZE;

      tiles.push({
        x: wrappedTileX,
        y: tileY,
        z: tileZoom,
        canvasX: (tilePixelX - centerPixel.x) * metersPerPixel * field.ppm,
        canvasY: (tilePixelY - centerPixel.y) * metersPerPixel * field.ppm,
        canvasSize: tileCanvasSize,
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
