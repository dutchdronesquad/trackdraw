"use client";

import { useEffect, useMemo, useState } from "react";
import { Group, Image as KonvaImage } from "react-konva";
import {
  getFieldMapTileCoverage,
  type MapReferenceTile,
} from "@/lib/map-reference/geometry";
import { getMapReferenceTileUrl } from "@/lib/map-reference/tiles";
import type { FieldSpec, MapReference } from "@/lib/types";

export function MapReferenceLayer({
  field,
  heightPx,
  mapReference,
  widthPx,
}: {
  field: Pick<FieldSpec, "width" | "height" | "ppm">;
  heightPx: number;
  mapReference?: MapReference | null;
  widthPx: number;
}) {
  const tiles = useMemo(() => {
    if (!mapReference?.visible) return [];
    return getFieldMapTileCoverage({ field, mapReference });
  }, [field, mapReference]);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    if (!mapReference?.visible) return;

    const tileUrls = new Set(tiles.map(getMapReferenceTileUrl));
    let mounted = true;
    const missingTiles = tiles.filter(
      (tile) => !images[getMapReferenceTileUrl(tile)]
    );

    for (const tile of missingTiles) {
      const url = getMapReferenceTileUrl(tile);
      const image = new window.Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        if (!mounted) return;
        setImages((current) => {
          const next: Record<string, HTMLImageElement> = {};
          for (const [k, v] of Object.entries(current)) {
            if (tileUrls.has(k)) next[k] = v;
          }
          if (!next[url]) next[url] = image;
          return next;
        });
      };
      image.src = url;
    }

    return () => {
      mounted = false;
    };
  }, [images, mapReference?.visible, tiles]);

  if (!mapReference?.visible || tiles.length === 0) return null;

  return (
    <Group
      clipX={0}
      clipY={0}
      clipWidth={widthPx}
      clipHeight={heightPx}
      opacity={mapReference.opacity}
      listening={false}
    >
      <Group
        x={widthPx / 2}
        y={heightPx / 2}
        rotation={-mapReference.rotationDeg}
        listening={false}
      >
        {tiles.map((tile) => (
          <MapTileImage
            key={`${tile.z}-${tile.x}-${tile.y}-${Math.round(tile.canvasX)}-${Math.round(tile.canvasY)}`}
            image={images[getMapReferenceTileUrl(tile)]}
            tile={tile}
          />
        ))}
      </Group>
    </Group>
  );
}

function MapTileImage({
  image,
  tile,
}: {
  image?: HTMLImageElement;
  tile: MapReferenceTile;
}) {
  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={tile.canvasX}
      y={tile.canvasY}
      width={tile.canvasSize}
      height={tile.canvasSize}
      listening={false}
    />
  );
}
