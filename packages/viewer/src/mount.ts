// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TrackViewer, type TrackViewerProps } from "./TrackViewer";

export interface TrackDrawViewerHandle {
  /** Re-renders with new options (e.g. after refreshing a snapshot). */
  update(options: TrackViewerProps): void;
  /** Unmounts and releases the React root. */
  destroy(): void;
}

/**
 * Vanilla mount API for hosts without their own React tree (e.g. a plain
 * <script> consumer such as a future RotorHazard plugin). Internally just
 * wraps ReactDOM.createRoot + <TrackViewer/> - this is the static build's
 * entry point, and is also re-exported from ./index.ts for React/npm
 * consumers who prefer an imperative API.
 */
export function createTrackDrawViewer(
  container: HTMLElement,
  options: TrackViewerProps
): TrackDrawViewerHandle {
  const root: Root = createRoot(container);
  root.render(createElement(TrackViewer, options));

  return {
    update(next) {
      root.render(createElement(TrackViewer, next));
    },
    destroy() {
      root.unmount();
    },
  };
}
