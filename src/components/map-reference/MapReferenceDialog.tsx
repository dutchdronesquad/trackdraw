"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  getMapTileZoom,
  latLngToGlobalPixel,
  metersPerPixelAtLatitude,
  normalizeLongitude,
  type LatLng,
} from "@/lib/map-reference/geometry";
import {
  MAP_REFERENCE_MAX_ZOOM,
  MAP_REFERENCE_MIN_ZOOM,
  MAP_REFERENCE_TILE_SIZE,
  mapReferenceProvider,
} from "@/lib/map-reference/provider";
import { getMapReferenceTileUrl } from "@/lib/map-reference/tiles";
import type { FieldSpec, MapReference } from "@/lib/types";
import { usePickerGesture } from "./usePickerGesture";
import { useLocationSearch } from "./useLocationSearch";

const MAP_REFERENCE_PICKER_DEFAULT_ZOOM = 7;

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
    initialReference?.zoom ?? MAP_REFERENCE_PICKER_DEFAULT_ZOOM
  );
  const [rotationDeg, setRotationDeg] = useState(
    initialReference?.rotationDeg ?? 0
  );
  const [latInput, setLatInput] = useState(String(center.lat.toFixed(6)));
  const [lngInput, setLngInput] = useState(String(center.lng.toFixed(6)));
  const [locateError, setLocateError] = useState<string | null>(null);
  const [locatePending, setLocatePending] = useState(false);

  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const rotationRef = useRef(rotationDeg);

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

  const { setPickerNode, tileLayerRef, pickerSize } = usePickerGesture({
    centerRef,
    zoomRef,
    rotationRef,
    syncCenter,
    syncZoom,
  });

  const {
    searchPanelRef,
    locationQuery,
    setLocationQuery,
    locationResults,
    locationSearchError,
    locationSearchPending,
    handleLocationSearch,
    selectLocationResult,
    clearResults,
  } = useLocationSearch({ centerRef, zoomRef, syncCenter, syncZoom });

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

  const applyTypedCenter = () => {
    const lat = Number(latInput);
    const lng = Number(lngInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    syncCenter({ lat: clampLatitude(lat), lng: normalizeLongitude(lng) });
  };

  const handleLocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateError("Location is unavailable in this browser.");
      return;
    }

    setLocatePending(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        syncCenter({
          lat: clampLatitude(position.coords.latitude),
          lng: normalizeLongitude(position.coords.longitude),
        });
        syncZoom(Math.max(zoomRef.current, 18));
        setLocatePending(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocateError("Location permission was denied.");
        } else if (error.code === error.TIMEOUT) {
          setLocateError("Location lookup timed out.");
        } else {
          setLocateError("Could not determine your location.");
        }
        setLocatePending(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 12_000,
      }
    );
  };

  const stopPickerControlPointer = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleSave = () => {
    const nextReference = createReference({ center, rotationDeg, zoom });
    onConfirm({
      ...nextReference,
      opacity: initialReference?.opacity ?? nextReference.opacity,
      visible: initialReference?.visible ?? nextReference.visible,
    });
    onOpenChange(false);
  };

  const renderSearchPanel = (mobile = false) => (
    <div
      ref={searchPanelRef}
      data-vaul-no-drag
      className={mobile ? "relative z-30" : "relative z-20"}
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
              clearResults();
              event.currentTarget.blur();
            }
          }}
          placeholder="Search place or paste coordinates"
          className={
            mobile
              ? "border-border/45 bg-muted/30 focus-visible:bg-background h-9 rounded-md pr-16 pl-8 text-[13px] shadow-none"
              : "border-border/45 bg-muted/30 focus-visible:bg-background h-8 rounded-md pr-16 pl-8 text-[12px] shadow-none"
          }
        />
        <span className="text-muted-foreground/65 pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] font-medium">
          {locationSearchPending ? "Searching" : "Enter"}
        </span>
      </div>
      {locationSearchError || locationResults.length > 0 ? (
        <div
          className={`border-border/45 bg-background absolute top-[calc(100%+0.25rem)] right-0 left-0 z-30 overflow-y-auto rounded-md border shadow-lg ${
            mobile ? "max-h-[min(16rem,42dvh)]" : "max-h-56"
          }`}
        >
          {locationSearchError ? (
            <p className="text-muted-foreground px-3 py-2 text-[11px] leading-relaxed">
              {locationSearchError}
            </p>
          ) : null}
          {locationResults.map((result) => (
            <button
              key={result.id}
              type="button"
              data-vaul-no-drag
              className="hover:bg-muted/35 flex w-full flex-col items-start px-3 py-2 text-left transition-colors"
              onClick={() => selectLocationResult(result)}
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
  );

  const renderPicker = (mobile = false) => (
    <div
      ref={setPickerNode}
      data-vaul-no-drag
      className={`border-border/55 bg-muted/30 relative cursor-grab overflow-hidden rounded-lg border active:cursor-grabbing ${
        mobile
          ? "h-[42dvh] max-h-[24rem] min-h-[15rem]"
          : "h-[min(56vh,430px)] min-h-70 lg:h-125"
      }`}
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
      {mobile ? (
        <>
          <div className="bg-background/92 text-muted-foreground absolute top-2 left-2 z-10 rounded-md px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur-sm">
            Zoom {zoom.toFixed(1)}
          </div>
          <div
            className="absolute top-2 right-2 z-10 flex flex-col gap-1.5"
            onPointerDown={stopPickerControlPointer}
            onPointerMove={stopPickerControlPointer}
            onPointerUp={stopPickerControlPointer}
          >
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="bg-background/92 shadow-sm backdrop-blur-sm"
              onClick={() => syncZoom(zoomRef.current + 1)}
              aria-label="Zoom in"
            >
              <Plus />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="bg-background/92 shadow-sm backdrop-blur-sm"
              onClick={() => syncZoom(zoomRef.current - 1)}
              aria-label="Zoom out"
            >
              <Minus />
            </Button>
          </div>
        </>
      ) : null}
      <div className="bg-background/92 text-muted-foreground absolute right-2 bottom-2 left-2 rounded-md px-2 py-1 text-[9px] leading-snug shadow-sm backdrop-blur-sm lg:right-auto lg:max-w-[70%] lg:text-[10px]">
        {mapReferenceProvider.styles.satellite.attribution}
      </div>
    </div>
  );

  const renderCoordinateInputs = () => (
    <div className="space-y-2">
      <label className="block space-y-2">
        <span className="text-muted-foreground text-[11px] font-medium">
          Latitude
        </span>
        <Input
          value={latInput}
          onChange={(event) => setLatInput(event.target.value)}
          onBlur={applyTypedCenter}
          onKeyDown={(event) => {
            if (event.key === "Enter") applyTypedCenter();
          }}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-muted-foreground text-[11px] font-medium">
          Longitude
        </span>
        <Input
          value={lngInput}
          onChange={(event) => setLngInput(event.target.value)}
          onBlur={applyTypedCenter}
          onKeyDown={(event) => {
            if (event.key === "Enter") applyTypedCenter();
          }}
        />
      </label>
    </div>
  );

  const renderRotationControl = (mobile = false) => {
    const nudgeRotation = (delta: number) => {
      syncRotation(rotationRef.current + delta);
    };

    if (mobile) {
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-muted-foreground text-[11px] font-medium">
              Rotation
            </label>
            <div className="flex items-center gap-2">
              <span className="bg-muted/35 text-muted-foreground flex h-7 min-w-16 items-center justify-center rounded-md px-2 font-mono text-[11px]">
                {Math.round(rotationDeg)} deg
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => syncRotation(0)}
                aria-label="Reset rotation"
              >
                <RotateCcw />
              </Button>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={rotationDeg}
            onChange={(event) => syncRotation(Number(event.target.value))}
            className="accent-primary h-7 w-full"
          />

          <div className="grid grid-cols-4 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeRotation(-15)}
              aria-label="Rotate left 15 degrees"
            >
              -15
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeRotation(-1)}
              aria-label="Rotate left 1 degree"
            >
              -1
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeRotation(1)}
              aria-label="Rotate right 1 degree"
            >
              +1
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nudgeRotation(15)}
              aria-label="Rotate right 15 degrees"
            >
              +15
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
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
    );
  };

  const desktopMapEditor = (
    <div className="grid min-h-0 gap-0 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1fr)_210px] lg:overflow-hidden">
      <div className="min-w-0 space-y-2 lg:pr-3">
        {renderSearchPanel()}
        {renderPicker()}
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
            disabled={locatePending}
            onClick={handleLocate}
          >
            <LocateFixed />
            {locatePending ? "Locating" : "Use location"}
          </Button>
          {locateError ? (
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {locateError}
            </p>
          ) : null}
          {renderCoordinateInputs()}
        </div>

        {renderRotationControl()}
      </div>
    </div>
  );

  const mobileMapEditor = (
    <div data-vaul-no-drag className="min-h-0 space-y-3 p-3 pb-4">
      {renderSearchPanel(true)}
      {renderPicker(true)}

      <div className="border-border/30 space-y-3 border-t pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground text-[11px] font-medium">
            Center
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locatePending}
            onClick={handleLocate}
          >
            <LocateFixed />
            {locatePending ? "Locating" : "Use location"}
          </Button>
        </div>
        {locateError ? (
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {locateError}
          </p>
        ) : null}
      </div>

      <div className="border-border/30 border-t pt-3">
        {renderRotationControl(true)}
      </div>
    </div>
  );

  const desktopActions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button type="button" onClick={handleSave}>
        Save map
      </Button>
    </>
  );

  const mobileFooter = (
    <div
      data-vaul-no-drag
      className="border-border/40 bg-card/96 shrink-0 border-t px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xs"
    >
      <Button type="button" className="w-full" onClick={handleSave}>
        Save map
      </Button>
    </div>
  );

  if (!isDesktop) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Map reference"
        subtitle="Choose the field center and align the field footprint."
        contentClassName="data-[vaul-drawer-direction=bottom]:mt-8 data-[vaul-drawer-direction=bottom]:max-h-[94dvh]"
        bodyClassName="min-h-0 overscroll-contain p-0"
        footerContent={mobileFooter}
        nested
        repositionInputs={false}
      >
        {mobileMapEditor}
      </MobileDrawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,760px)] w-[min(94vw,920px)] max-w-[min(94vw,920px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border/40 border-b px-4 py-3 pr-12">
          <DialogTitle>Map reference</DialogTitle>
          <DialogDescription>
            Choose the field center and align the field footprint.
          </DialogDescription>
        </DialogHeader>

        {desktopMapEditor}

        <DialogFooter className="bg-muted/35 mx-0 mb-0 rounded-none border-t px-4 py-3">
          {desktopActions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
