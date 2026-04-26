import { mapReferenceProvider } from "@/lib/map-reference/provider";
import type { TileCoordinate } from "@/lib/map-reference/geometry";

export function getMapReferenceTileUrl(tile: TileCoordinate) {
  return mapReferenceProvider.styles.satellite.tileUrl
    .replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}
