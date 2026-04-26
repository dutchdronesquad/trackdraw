"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus, RotateCcw, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MobileDrawer } from "@/components/MobileDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsDesktopInspector } from "@/components/inspector/views/layout";
import {
  clampLatitude,
  globalPixelToLatLng,
  getMapTileZoom,
  latLngToGlobalPixel,
  metersPerPixelAtLatitude,
  normalizeLongitude,
  panLatLngByPixels,
  screenDeltaToMapPixelDelta,
  type LatLng,
} from "@/lib/map-reference/geometry";
import {
  MAP_REFERENCE_DEFAULT_ZOOM,
  MAP_REFERENCE_MAX_ZOOM,
  MAP_REFERENCE_MIN_ZOOM,
  MAP_REFERENCE_TILE_SIZE,
  mapReferenceProvider,
} from "@/lib/map-reference/provider";
import { getMapReferenceTileUrl } from "@/lib/map-reference/tiles";
import type { FieldSpec, MapReference } from "@/lib/types";

const PICKER_WIDTH = 760;
const PICKER_HEIGHT = 430;
const WHEEL_LINE_HEIGHT_PX = 16;
const WHEEL_PAGE_HEIGHT_PX = 420;
const WHEEL_PAN_FACTOR = 0.65;
const PINCH_ZOOM_FACTOR = 0.008;
const LOCATION_SEARCH_DEBOUNCE_MS = 350;
const LOCATION_SEARCH_MIN_LENGTH = 3;

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWheelDelta(delta: number, deltaMode: number) {
  if (deltaMode === 1) return delta * WHEEL_LINE_HEIGHT_PX;
  if (deltaMode === 2) return delta * WHEEL_PAGE_HEIGHT_PX;
  return delta;
}

type WebKitGestureEvent = Event & {
  clientX?: number;
  clientY?: number;
  scale?: number;
};

interface LocationSearchResult {
  address: string;
  id: string;
  lat: number;
  lng: number;
  score: number;
}

function parseCoordinateQuery(query: string): LatLng | null {
  const matches = query.match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length < 2) return null;

  const first = Number(matches[0].replace(",", "."));
  const second = Number(matches[1].replace(",", "."));
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return {
      lat: clampLatitude(first),
      lng: normalizeLongitude(second),
    };
  }

  if (Math.abs(first) <= 180 && Math.abs(second) <= 90) {
    return {
      lat: clampLatitude(second),
      lng: normalizeLongitude(first),
    };
  }

  return null;
}

function createReference({
  center,
  rotationDeg,
  zoom,
}: {
  center: LatLng;
  rotationDeg: number;
  zoom: number;
}): MapReference {
  return {
    type: "map",
    provider: "esri-world-imagery",
    mapStyle: "satellite",
    centerLat: center.lat,
    centerLng: center.lng,
    zoom,
    rotationDeg,
    opacity: 0.35,
    visible: true,
    locked: true,
  };
}

function getVisibleTiles({
  center,
  height,
  width,
  zoom,
  coverageHeight = height,
  coverageWidth = width,
}: {
  coverageHeight?: number;
  coverageWidth?: number;
  center: LatLng;
  height: number;
  width: number;
  zoom: number;
}) {
  const tileZoom = getMapTileZoom(zoom);
  const tileScale = 2 ** (zoom - tileZoom);
  const centerPixel = latLngToGlobalPixel(center.lat, center.lng, tileZoom);
  const minTileX = Math.floor(
    (centerPixel.x - coverageWidth / tileScale / 2) / MAP_REFERENCE_TILE_SIZE
  );
  const maxTileX = Math.floor(
    (centerPixel.x + coverageWidth / tileScale / 2) / MAP_REFERENCE_TILE_SIZE
  );
  const minTileY = Math.floor(
    (centerPixel.y - coverageHeight / tileScale / 2) / MAP_REFERENCE_TILE_SIZE
  );
  const maxTileY = Math.floor(
    (centerPixel.y + coverageHeight / tileScale / 2) / MAP_REFERENCE_TILE_SIZE
  );
  const maxTile = 2 ** tileZoom;
  const tiles: Array<{
    key: string;
    left: number;
    size: number;
    top: number;
    url: string;
  }> = [];

  for (let y = minTileY - 1; y <= maxTileY + 1; y += 1) {
    if (y < 0 || y >= maxTile) continue;

    for (let x = minTileX - 1; x <= maxTileX + 1; x += 1) {
      const wrappedX = ((x % maxTile) + maxTile) % maxTile;
      const left =
        (x * MAP_REFERENCE_TILE_SIZE - centerPixel.x) * tileScale + width / 2;
      const top =
        (y * MAP_REFERENCE_TILE_SIZE - centerPixel.y) * tileScale + height / 2;

      tiles.push({
        key: `${tileZoom}-${x}-${wrappedX}-${y}`,
        left,
        size: MAP_REFERENCE_TILE_SIZE * tileScale,
        top,
        url: getMapReferenceTileUrl({ x: wrappedX, y, z: tileZoom }),
      });
    }
  }

  return tiles;
}

export function MapReferenceDialog({
  field,
  initialReference,
  open,
  onOpenChange,
  onConfirm,
}: {
  field: Pick<FieldSpec, "width" | "height">;
  initialReference?: MapReference | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reference: MapReference) => void;
}) {
  const isDesktop = useIsDesktopInspector();
  const [center, setCenter] = useState<LatLng>({
    lat: initialReference?.centerLat ?? 52.1326,
    lng: initialReference?.centerLng ?? 5.2913,
  });
  const [zoom, setZoom] = useState(
    initialReference?.zoom ?? MAP_REFERENCE_DEFAULT_ZOOM
  );
  const [rotationDeg, setRotationDeg] = useState(
    initialReference?.rotationDeg ?? 0
  );
  const [latInput, setLatInput] = useState(String(center.lat.toFixed(6)));
  const [lngInput, setLngInput] = useState(String(center.lng.toFixed(6)));
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<
    LocationSearchResult[]
  >([]);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null
  );
  const [locationSearchPending, setLocationSearchPending] = useState(false);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");
  const dragRef = useRef<{
    lastX: number;
    lastY: number;
    moved: boolean;
    totalDx: number;
    totalDy: number;
  } | null>(null);
  const tileLayerRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const rotationRef = useRef(rotationDeg);
  const gestureScaleRef = useRef(1);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const locationSearchAbortRef = useRef<AbortController | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [pickerElement, setPickerElement] = useState<HTMLDivElement | null>(
    null
  );
  const [pickerSize, setPickerSize] = useState({
    width: PICKER_WIDTH,
    height: PICKER_HEIGHT,
  });

  const metersPerPixel = metersPerPixelAtLatitude(center.lat, zoom);
  const fieldWidthPx = field.width / metersPerPixel;
  const fieldHeightPx = field.height / metersPerPixel;
  const tiles = useMemo(
    () =>
      getVisibleTiles({
        coverageHeight: Math.ceil(
          Math.hypot(pickerSize.width, pickerSize.height)
        ),
        coverageWidth: Math.ceil(
          Math.hypot(pickerSize.width, pickerSize.height)
        ),
        center,
        height: pickerSize.height,
        width: pickerSize.width,
        zoom,
      }),
    [center, pickerSize.height, pickerSize.width, zoom]
  );

  const setPickerNode = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    setPickerElement(node);

    if (!node) return;

    const updatePickerSize = () => {
      setPickerSize({
        width: Math.max(1, node.clientWidth),
        height: Math.max(1, node.clientHeight),
      });
    };

    updatePickerSize();
    resizeObserverRef.current = new ResizeObserver(updatePickerSize);
    resizeObserverRef.current.observe(node);
  }, []);

  const syncCenter = useCallback((nextCenter: LatLng) => {
    centerRef.current = nextCenter;
    setCenter(nextCenter);
    setLatInput(nextCenter.lat.toFixed(6));
    setLngInput(nextCenter.lng.toFixed(6));
  }, []);

  const syncZoom = useCallback((nextZoom: number) => {
    const safeZoom = clampValue(
      nextZoom,
      MAP_REFERENCE_MIN_ZOOM,
      MAP_REFERENCE_MAX_ZOOM
    );
    zoomRef.current = safeZoom;
    setZoom(safeZoom);
  }, []);

  const syncRotation = useCallback((nextRotationDeg: number) => {
    const safeRotation = ((nextRotationDeg % 360) + 360) % 360;
    rotationRef.current = safeRotation;
    setRotationDeg(safeRotation);
  }, []);

  const applyTypedCenter = () => {
    const lat = Number(latInput);
    const lng = Number(lngInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    syncCenter({ lat: clampLatitude(lat), lng: normalizeLongitude(lng) });
  };

  const panByScreenPixels = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      const panDelta = screenDeltaToMapPixelDelta({
        dx,
        dy,
        rotationDeg: rotationRef.current,
      });
      syncCenter(
        panLatLngByPixels({
          center: centerRef.current,
          dx: panDelta.dx,
          dy: panDelta.dy,
          zoom: zoomRef.current,
        })
      );
    },
    [syncCenter]
  );

  useEffect(() => {
    if (!pickerElement) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode);
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);

      if (event.ctrlKey) {
        syncZoom(zoomRef.current - deltaY * PINCH_ZOOM_FACTOR);
        return;
      }

      panByScreenPixels({
        dx: -deltaX * WHEEL_PAN_FACTOR,
        dy: -deltaY * WHEEL_PAN_FACTOR,
      });
    };

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      gestureScaleRef.current = 1;
    };

    const handleGestureChange = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();

      const gestureEvent = event as WebKitGestureEvent;
      const nextScale = gestureEvent.scale ?? 1;
      const zoomDelta = Math.log2(nextScale / gestureScaleRef.current);
      gestureScaleRef.current = nextScale;
      if (!Number.isFinite(zoomDelta) || zoomDelta === 0) return;

      syncZoom(zoomRef.current + zoomDelta);
    };

    const handleGestureEnd = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      gestureScaleRef.current = 1;
    };

    pickerElement.addEventListener("wheel", handleWheel, { passive: false });
    pickerElement.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    pickerElement.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });
    pickerElement.addEventListener("gestureend", handleGestureEnd, {
      passive: false,
    });

    return () => {
      pickerElement.removeEventListener("wheel", handleWheel);
      pickerElement.removeEventListener("gesturestart", handleGestureStart);
      pickerElement.removeEventListener("gesturechange", handleGestureChange);
      pickerElement.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [panByScreenPixels, pickerElement, syncZoom]);

  useEffect(() => {
    if (!pickerElement) return;

    const handlePointerDown = (event: PointerEvent) => {
      pickerElement.setPointerCapture(event.pointerId);
      const pointerId = event.pointerId;
      dragRef.current = {
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
        totalDx: 0,
        totalDy: 0,
      };

      const handleMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId || !dragRef.current) return;
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        if (Math.abs(dx) + Math.abs(dy) > 1) dragRef.current.moved = true;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        dragRef.current.totalDx += dx;
        dragRef.current.totalDy += dy;
        if (tileLayerRef.current) {
          tileLayerRef.current.style.transform = `translate(${dragRef.current.totalDx}px, ${dragRef.current.totalDy}px) rotate(${-rotationRef.current}deg)`;
        }
      };

      const finish = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        pickerElement.removeEventListener("pointermove", handleMove);
        pickerElement.removeEventListener("pointerup", finish);
        pickerElement.removeEventListener("pointercancel", finish);

        const dragState = dragRef.current;
        dragRef.current = null;
        if (tileLayerRef.current) {
          tileLayerRef.current.style.transform = `rotate(${-rotationRef.current}deg)`;
        }
        if (!dragState) return;
        if (dragState.moved) {
          panByScreenPixels({ dx: dragState.totalDx, dy: dragState.totalDy });
          return;
        }
        const rect = pickerElement.getBoundingClientRect();
        const centerPixel = latLngToGlobalPixel(
          centerRef.current.lat,
          centerRef.current.lng,
          zoomRef.current
        );
        const clickDelta = screenDeltaToMapPixelDelta({
          dx: e.clientX - rect.left - rect.width / 2,
          dy: e.clientY - rect.top - rect.height / 2,
          rotationDeg: rotationRef.current,
        });
        syncCenter(
          globalPixelToLatLng(
            {
              x: centerPixel.x + clickDelta.dx,
              y: centerPixel.y + clickDelta.dy,
            },
            zoomRef.current
          )
        );
      };

      pickerElement.addEventListener("pointermove", handleMove);
      pickerElement.addEventListener("pointerup", finish);
      pickerElement.addEventListener("pointercancel", finish);
    };

    pickerElement.addEventListener("pointerdown", handlePointerDown);
    return () =>
      pickerElement.removeEventListener("pointerdown", handlePointerDown);
  }, [panByScreenPixels, pickerElement, syncCenter]);

  useEffect(() => {
    if (!locationSearchError && locationResults.length === 0) return;

    const closeSearchResults = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && searchPanelRef.current?.contains(target)) {
        return;
      }

      setLocationResults([]);
      setLocationSearchError(null);
    };

    document.addEventListener("pointerdown", closeSearchResults);
    return () =>
      document.removeEventListener("pointerdown", closeSearchResults);
  }, [locationResults.length, locationSearchError]);

  const handleLocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      syncCenter({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      syncZoom(Math.max(zoomRef.current, 18));
    });
  };

  const jumpToLocation = (location: LatLng, nextZoom = 18) => {
    syncCenter({
      lat: clampLatitude(location.lat),
      lng: normalizeLongitude(location.lng),
    });
    syncZoom(Math.max(zoomRef.current, nextZoom));
  };

  const searchLocations = useCallback(
    async (query: string, signal?: AbortSignal) => {
      const params = new URLSearchParams({
        f: "json",
        SingleLine: query,
        maxLocations: "5",
        outFields: "PlaceName,City,Region,Country",
        location: `${centerRef.current.lng},${centerRef.current.lat}`,
      });
      const response = await fetch(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${params.toString()}`,
        { signal }
      );
      if (!response.ok) {
        throw new Error("Location search failed");
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          address?: unknown;
          location?: { x?: unknown; y?: unknown };
          score?: unknown;
        }>;
      };

      return (payload.candidates ?? [])
        .filter(
          (candidate) =>
            typeof candidate.location?.x === "number" &&
            typeof candidate.location.y === "number"
        )
        .map((candidate, index) => ({
          address:
            typeof candidate.address === "string"
              ? candidate.address
              : "Unknown location",
          id: `${candidate.location?.x}-${candidate.location?.y}-${index}`,
          lat: clampLatitude(candidate.location?.y as number),
          lng: normalizeLongitude(candidate.location?.x as number),
          score: typeof candidate.score === "number" ? candidate.score : 0,
        }));
    },
    []
  );

  useEffect(() => {
    const query = locationQuery.trim();
    locationSearchAbortRef.current?.abort();

    if (!query) {
      setLocationResults([]);
      setLocationSearchError(null);
      setLocationSearchPending(false);
      return;
    }

    if (query === selectedLocationLabel) return;

    const coordinateLocation = parseCoordinateQuery(query);
    if (coordinateLocation) {
      setLocationResults([]);
      setLocationSearchError(null);
      setLocationSearchPending(false);
      return;
    }

    if (query.length < LOCATION_SEARCH_MIN_LENGTH) {
      setLocationResults([]);
      setLocationSearchError(null);
      setLocationSearchPending(false);
      return;
    }

    const controller = new AbortController();
    locationSearchAbortRef.current = controller;
    setLocationSearchError(null);
    setLocationSearchPending(true);

    const timeout = window.setTimeout(() => {
      void searchLocations(query, controller.signal)
        .then((results) => {
          setLocationResults(results);
          setLocationSearchError(
            results.length === 0 ? "No locations found." : null
          );
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setLocationResults([]);
          setLocationSearchError("Location search is unavailable.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLocationSearchPending(false);
          }
        });
    }, LOCATION_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locationQuery, searchLocations, selectedLocationLabel]);

  const handleLocationSearch = async () => {
    const query = locationQuery.trim();
    if (!query || locationSearchPending) return;

    const coordinateLocation = parseCoordinateQuery(query);
    if (coordinateLocation) {
      setLocationResults([]);
      setLocationSearchError(null);
      jumpToLocation(coordinateLocation);
      return;
    }

    if (query.length < LOCATION_SEARCH_MIN_LENGTH) return;

    locationSearchAbortRef.current?.abort();
    setLocationSearchPending(true);
    setLocationSearchError(null);

    try {
      const results = await searchLocations(query);
      setLocationResults(results);
      if (results.length === 0) {
        setLocationSearchError("No locations found.");
      }
    } catch {
      setLocationSearchError("Location search is unavailable.");
    } finally {
      setLocationSearchPending(false);
    }
  };

  const mapEditor = (
    <div className="grid min-h-0 gap-0 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1fr)_210px] lg:overflow-hidden">
      <div className="min-w-0 space-y-2 lg:pr-3">
        <div
          ref={searchPanelRef}
          className="relative z-20"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <div className="relative">
            <Search className="text-muted-foreground/65 pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleLocationSearch();
                }
                if (event.key === "Escape") {
                  setLocationResults([]);
                  setLocationSearchError(null);
                  event.currentTarget.blur();
                }
              }}
              placeholder="Search place or paste coordinates"
              className="border-border/45 bg-muted/30 focus-visible:bg-background h-8 rounded-md pr-16 pl-8 text-[12px] shadow-none"
            />
            <span className="text-muted-foreground/65 pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] font-medium">
              {locationSearchPending ? "Searching" : "Enter"}
            </span>
          </div>
          {locationSearchError || locationResults.length > 0 ? (
            <div className="border-border/45 bg-background absolute top-[calc(100%+0.25rem)] right-0 left-0 z-30 max-h-56 overflow-y-auto rounded-md border shadow-lg">
              {locationSearchError ? (
                <p className="text-muted-foreground px-3 py-2 text-[11px] leading-relaxed">
                  {locationSearchError}
                </p>
              ) : null}
              {locationResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="hover:bg-muted/35 flex w-full flex-col items-start px-3 py-2 text-left transition-colors"
                  onClick={() => {
                    setLocationQuery(result.address);
                    setSelectedLocationLabel(result.address);
                    setLocationResults([]);
                    jumpToLocation({
                      lat: result.lat,
                      lng: result.lng,
                    });
                  }}
                >
                  <span className="text-foreground line-clamp-2 text-[11px] font-medium">
                    {result.address}
                  </span>
                  <span className="text-muted-foreground/70 mt-0.5 font-mono text-[10px]">
                    {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div
          ref={setPickerNode}
          data-vaul-no-drag
          className="border-border/55 bg-muted/30 relative h-[min(56vh,430px)] min-h-70 cursor-grab overflow-hidden rounded-lg border active:cursor-grabbing lg:h-125"
          style={{ touchAction: "none" }}
        >
          <div
            ref={tileLayerRef}
            className="pointer-events-none absolute inset-0"
            style={{
              transform: `rotate(${-rotationDeg}deg)`,
              transformOrigin: "50% 50%",
            }}
          >
            {tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute select-none"
                style={{
                  left: tile.left,
                  top: tile.top,
                  width: tile.size,
                  height: tile.size,
                }}
              />
            ))}
          </div>
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 border-2 border-sky-400/90 bg-sky-400/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.12)]"
            style={{
              width: fieldWidthPx,
              height: fieldHeightPx,
              transform: "translate(-50%, -50%)",
            }}
          />
          <div className="pointer-events-none absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-500 shadow" />
          <div className="bg-background/92 text-muted-foreground absolute right-2 bottom-2 left-2 rounded-md px-2 py-1 text-[9px] leading-snug shadow-sm backdrop-blur-sm lg:right-auto lg:max-w-[70%] lg:text-[10px]">
            {mapReferenceProvider.styles.satellite.attribution}
          </div>
        </div>
      </div>

      <div className="border-border/40 mt-3 space-y-4 lg:mt-0 lg:border-l lg:pl-3">
        <div className="space-y-2">
          <div className="text-muted-foreground text-[11px] font-medium">
            View
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => syncZoom(zoomRef.current - 1)}
              aria-label="Zoom out"
            >
              <Minus />
              Out
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => syncZoom(zoomRef.current + 1)}
              aria-label="Zoom in"
            >
              <Plus />
              In
            </Button>
          </div>
          <div className="bg-muted/35 text-muted-foreground flex h-8 items-center justify-center rounded-lg text-xs">
            Preview zoom {zoom.toFixed(1)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-muted-foreground text-[11px] font-medium">
            Center
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLocate}
          >
            <LocateFixed />
            Use location
          </Button>

          <div className="hidden space-y-2 lg:block">
            <label className="text-muted-foreground text-[11px] font-medium">
              Latitude
            </label>
            <Input
              value={latInput}
              onChange={(event) => setLatInput(event.target.value)}
              onBlur={applyTypedCenter}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyTypedCenter();
              }}
            />
            <label className="text-muted-foreground text-[11px] font-medium">
              Longitude
            </label>
            <Input
              value={lngInput}
              onChange={(event) => setLngInput(event.target.value)}
              onBlur={applyTypedCenter}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyTypedCenter();
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-muted-foreground text-[11px] font-medium">
              Rotation
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => syncRotation(0)}
              aria-label="Reset rotation"
            >
              <RotateCcw />
            </Button>
          </div>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={rotationDeg}
            onChange={(event) => syncRotation(Number(event.target.value))}
            className="accent-primary w-full"
          />
          <Input
            type="number"
            min={0}
            max={359}
            value={Math.round(rotationDeg)}
            onChange={(event) => syncRotation(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={() => {
          const nextReference = createReference({ center, rotationDeg, zoom });
          onConfirm({
            ...nextReference,
            opacity: initialReference?.opacity ?? nextReference.opacity,
            visible: initialReference?.visible ?? nextReference.visible,
          });
          onOpenChange(false);
        }}
      >
        Save map
      </Button>
    </>
  );

  if (!isDesktop) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Map reference"
        subtitle="Choose the field center and align the field footprint."
        contentClassName="data-[vaul-drawer-direction=bottom]:mt-8 data-[vaul-drawer-direction=bottom]:max-h-[94dvh]"
        bodyClassName="p-0"
      >
        {mapEditor}
        <div className="border-border/40 bg-muted/35 flex flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end">
          {actions}
        </div>
      </MobileDrawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="auto"
        className="max-h-[min(92vh,760px)] w-[min(94vw,920px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-border/40 border-b px-4 py-3 pr-12">
          <DialogTitle>Map reference</DialogTitle>
          <DialogDescription>
            Choose the field center and align the field footprint.
          </DialogDescription>
        </DialogHeader>

        {mapEditor}

        <DialogFooter className="bg-muted/35 mx-0 mb-0 rounded-none border-t px-4 py-3">
          {actions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
