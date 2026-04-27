// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocationSearch } from "@/components/map-reference/useLocationSearch";
import type { LatLng } from "@/lib/map-reference/geometry";

type MutableRef<T> = {
  current: T;
};

function LocationSearchHarness({
  centerRef,
  zoomRef,
  onCenterChange,
  onZoomChange,
}: {
  centerRef: MutableRef<LatLng>;
  zoomRef: MutableRef<number>;
  onCenterChange: (center: LatLng) => void;
  onZoomChange: (zoom: number) => void;
}) {
  const {
    handleLocationSearch,
    locationQuery,
    locationResults,
    locationSearchError,
    locationSearchPending,
    searchPanelRef,
    selectLocationResult,
    setLocationQuery,
  } = useLocationSearch({
    centerRef,
    zoomRef,
    syncCenter: (center) => {
      centerRef.current = center;
      onCenterChange(center);
    },
    syncZoom: (zoom) => {
      zoomRef.current = zoom;
      onZoomChange(zoom);
    },
  });

  return (
    <div ref={searchPanelRef}>
      <input
        aria-label="Location"
        value={locationQuery}
        onChange={(event) => setLocationQuery(event.target.value)}
      />
      <button type="button" onClick={() => void handleLocationSearch()}>
        Search
      </button>
      <output data-testid="search-error">{locationSearchError ?? ""}</output>
      <output data-testid="search-pending">
        {String(locationSearchPending)}
      </output>
      <ul>
        {locationResults.map((result) => (
          <li key={result.id}>
            <button type="button" onClick={() => selectLocationResult(result)}>
              {result.address}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderLocationSearchHarness() {
  const centerRef: MutableRef<LatLng> = { current: { lat: 52.1, lng: 5.2 } };
  const zoomRef: MutableRef<number> = { current: 7 };
  const onCenterChange = vi.fn();
  const onZoomChange = vi.fn();

  render(
    <LocationSearchHarness
      centerRef={centerRef}
      zoomRef={zoomRef}
      onCenterChange={onCenterChange}
      onZoomChange={onZoomChange}
    />
  );

  return {
    centerRef,
    onCenterChange,
    onZoomChange,
    zoomRef,
  };
}

const fetchMock = vi.fn();

describe("useLocationSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("jumps directly to coordinate queries without calling geocoding", () => {
    const { onCenterChange, onZoomChange } = renderLocationSearchHarness();

    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "52.37, 4.9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    const selectedCenter = onCenterChange.mock.calls[0]?.[0];
    expect(fetchMock).not.toHaveBeenCalled();
    expect(selectedCenter?.lat).toBeCloseTo(52.37);
    expect(selectedCenter?.lng).toBeCloseTo(4.9);
    expect(onZoomChange).toHaveBeenCalledWith(18);
  });

  it("normalizes geocoding results and jumps when a result is selected", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            address: "Amsterdam, Noord-Holland, Netherlands",
            location: { x: 4.9, y: 52.37 },
            score: 100,
          },
        ],
      }),
    });
    const { onCenterChange, onZoomChange } = renderLocationSearchHarness();

    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Amsterdam" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    const resultButton = screen.getByRole("button", {
      name: "Amsterdam, Noord-Holland, Netherlands",
    });
    fireEvent.click(resultButton);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText("Location") as HTMLInputElement).value).toBe(
      "Amsterdam, Noord-Holland, Netherlands"
    );
    expect(
      screen.queryByRole("button", {
        name: "Amsterdam, Noord-Holland, Netherlands",
      })
    ).toBeNull();
    expect(screen.getByTestId("search-error").textContent).toBe("");
    const selectedCenter = onCenterChange.mock.calls[0]?.[0];
    expect(selectedCenter?.lat).toBeCloseTo(52.37);
    expect(selectedCenter?.lng).toBeCloseTo(4.9);
    expect(onZoomChange).toHaveBeenCalledWith(18);
  });

  it("surfaces an unavailable state when geocoding fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    renderLocationSearchHarness();

    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Broken search" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(screen.getByTestId("search-error").textContent).toBe(
      "Location search is unavailable."
    );
    expect(screen.getByTestId("search-pending").textContent).toBe("false");
  });
});
