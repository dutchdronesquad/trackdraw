// @vitest-environment happy-dom

import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapReferenceLayer } from "@/components/canvas/renderers/map-reference-layer";
import { getFieldMapTileCoverage } from "@/lib/map-reference/geometry";
import type { MapReference } from "@/lib/types";

vi.mock("react-konva", () => ({
  Group: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  ),
  Image: ({ image }: { image?: HTMLImageElement }) =>
    image ? <div data-testid="konva-image" /> : null,
}));

const mapReference: MapReference = {
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

const field = { width: 60, height: 40, ppm: 20 };

const imageInstances: MockImage[] = [];

class MockImage {
  crossOrigin = "";
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  src = "";

  constructor() {
    imageInstances.push(this);
  }
}

describe("MapReferenceLayer", () => {
  beforeEach(() => {
    imageInstances.length = 0;
    vi.stubGlobal("Image", MockImage);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not duplicate pending tile image requests after partial loads", () => {
    const expectedTileCount = getFieldMapTileCoverage({
      field,
      mapReference,
    }).length;

    render(
      <MapReferenceLayer
        field={field}
        heightPx={800}
        mapReference={mapReference}
        widthPx={1200}
      />
    );

    expect(imageInstances).toHaveLength(expectedTileCount);

    act(() => {
      imageInstances[0]?.onload?.();
    });

    expect(imageInstances).toHaveLength(expectedTileCount);
  });

  it("prunes stale pending tile requests when coverage changes", () => {
    const shiftedReference: MapReference = {
      ...mapReference,
      centerLat: 48.8566,
      centerLng: 2.3522,
    };
    const expectedTileCount = getFieldMapTileCoverage({
      field,
      mapReference,
    }).length;
    const shiftedTileCount = getFieldMapTileCoverage({
      field,
      mapReference: shiftedReference,
    }).length;

    const { rerender } = render(
      <MapReferenceLayer
        field={field}
        heightPx={800}
        mapReference={mapReference}
        widthPx={1200}
      />
    );

    expect(imageInstances).toHaveLength(expectedTileCount);

    rerender(
      <MapReferenceLayer
        field={field}
        heightPx={800}
        mapReference={shiftedReference}
        widthPx={1200}
      />
    );

    expect(imageInstances).toHaveLength(expectedTileCount + shiftedTileCount);

    rerender(
      <MapReferenceLayer
        field={field}
        heightPx={800}
        mapReference={mapReference}
        widthPx={1200}
      />
    );

    expect(imageInstances).toHaveLength(
      expectedTileCount + shiftedTileCount + expectedTileCount
    );
  });

  it("preserves pending tile requests while the map reference is hidden", () => {
    const hiddenReference: MapReference = {
      ...mapReference,
      visible: false,
    };
    const expectedTileCount = getFieldMapTileCoverage({
      field,
      mapReference,
    }).length;

    const { rerender } = render(
      <MapReferenceLayer
        field={field}
        heightPx={800}
        mapReference={mapReference}
        widthPx={1200}
      />
    );

    expect(imageInstances).toHaveLength(expectedTileCount);

    rerender(
      <MapReferenceLayer
        field={field}
        heightPx={800}
        mapReference={hiddenReference}
        widthPx={1200}
      />
    );
    rerender(
      <MapReferenceLayer
        field={field}
        heightPx={800}
        mapReference={mapReference}
        widthPx={1200}
      />
    );

    expect(imageInstances).toHaveLength(expectedTileCount);
  });
});
