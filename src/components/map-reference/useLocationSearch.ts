"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampLatitude,
  normalizeLongitude,
  type LatLng,
} from "@/lib/map-reference/geometry";

const LOCATION_SEARCH_DEBOUNCE_MS = 350;
const LOCATION_SEARCH_MIN_LENGTH = 3;

export interface LocationSearchResult {
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

export function useLocationSearch({
  centerRef,
  zoomRef,
  syncCenter,
  syncZoom,
}: {
  centerRef: { readonly current: LatLng };
  zoomRef: { readonly current: number };
  syncCenter: (center: LatLng) => void;
  syncZoom: (zoom: number) => void;
}) {
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const locationSearchAbortRef = useRef<AbortController | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<
    LocationSearchResult[]
  >([]);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null
  );
  const [locationSearchPending, setLocationSearchPending] = useState(false);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");

  const jumpToLocation = useCallback(
    (location: LatLng, nextZoom = 18) => {
      syncCenter({
        lat: clampLatitude(location.lat),
        lng: normalizeLongitude(location.lng),
      });
      syncZoom(Math.max(zoomRef.current, nextZoom));
    },
    [syncCenter, syncZoom, zoomRef]
  );

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
    [centerRef]
  );

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

  const selectLocationResult = (result: LocationSearchResult) => {
    setLocationQuery(result.address);
    setSelectedLocationLabel(result.address);
    setLocationResults([]);
    setLocationSearchError(null);
    jumpToLocation({ lat: result.lat, lng: result.lng });

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  const clearResults = () => {
    setLocationResults([]);
    setLocationSearchError(null);
  };

  return {
    searchPanelRef,
    locationQuery,
    setLocationQuery,
    locationResults,
    locationSearchError,
    locationSearchPending,
    handleLocationSearch,
    selectLocationResult,
    clearResults,
  };
}
