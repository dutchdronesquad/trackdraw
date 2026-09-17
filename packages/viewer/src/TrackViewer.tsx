// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.
//
// Top-level viewer shell: composes TrackViewer2D/TrackViewer3D behind a
// tab switch, lazy-loads the 3D chunk on demand (first 3D visit, or an
// 800ms idle-prefetch timer - the same pattern as the editor's
// EditorShell.tsx, without any of its Next.js/editor-store/app-chrome
// coupling), and gates 3D entirely behind WebGL support so unsupported
// browsers transparently keep the 2D view.

"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { useWebglSupport } from "./capabilities/useWebglSupport";
import type { TrackViewerLabels } from "./i18n/labels";
import type { MeasurementUnitSystem, TrackDesign } from "./types";
import TrackViewer2D from "./viewer-2d/TrackViewer2D";

const TrackViewer3D = lazy(() => import("./viewer-3d/TrackViewer3D"));

export interface TrackViewerProps {
  design: TrackDesign;
  initialView?: "2d" | "3d";
  assetsBaseUrl?: string;
  unitSystem?: MeasurementUnitSystem;
  theme?: "light" | "dark";
  labels?: Partial<TrackViewerLabels["canvasOverlay"]>;
  showObstacleNumbers?: boolean;
  /** Test-only: force the WebGL-unsupported fallback path (see capabilities/useWebglSupport). */
  forceWebglUnsupported?: boolean;
}

const IDLE_PREFETCH_DELAY_MS = 800;

export function TrackViewer({
  design,
  initialView = "2d",
  assetsBaseUrl,
  unitSystem,
  theme,
  labels,
  showObstacleNumbers,
  forceWebglUnsupported = false,
}: TrackViewerProps) {
  const webglSupport = useWebglSupport(forceWebglUnsupported);
  const webglSupported = webglSupport === "supported";
  const [view, setView] = useState<"2d" | "3d">(
    initialView === "3d" && webglSupported ? "3d" : "2d"
  );
  const [has3DLoaded, setHas3DLoaded] = useState(view === "3d");

  useEffect(() => {
    if (!webglSupported || has3DLoaded) return;
    const timer = window.setTimeout(() => {
      setHas3DLoaded(true);
    }, IDLE_PREFETCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [has3DLoaded, webglSupported]);

  const showView = (next: "2d" | "3d") => {
    if (next === "3d" && !webglSupported) return;
    setView(next);
    if (next === "3d") setHas3DLoaded(true);
  };

  return (
    <div className="relative h-full w-full">
      {webglSupported ? (
        <div className="absolute top-2 left-2 z-30 flex gap-1">
          <button
            type="button"
            onClick={() => showView("2d")}
            aria-pressed={view === "2d"}
            className="border-border/60 bg-card/85 rounded-md border px-2 py-1 text-xs font-medium backdrop-blur"
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => showView("3d")}
            aria-pressed={view === "3d"}
            className="border-border/60 bg-card/85 rounded-md border px-2 py-1 text-xs font-medium backdrop-blur"
          >
            3D
          </button>
        </div>
      ) : null}

      <div
        style={{ visibility: view === "2d" ? "visible" : "hidden" }}
        className="absolute inset-0"
      >
        <TrackViewer2D
          design={design}
          unitSystem={unitSystem}
          theme={theme}
          labels={labels}
          showObstacleNumbers={showObstacleNumbers}
        />
      </div>

      {webglSupported && has3DLoaded ? (
        <div
          style={{ visibility: view === "3d" ? "visible" : "hidden" }}
          className="absolute inset-0"
        >
          <Suspense fallback={null}>
            <TrackViewer3D
              design={design}
              theme={theme}
              assetsBaseUrl={assetsBaseUrl}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
