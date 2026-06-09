"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  type ReactNode,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { DesktopInspectorPanel } from "./DesktopInspectorPanel";
import { ElementPlacementControl } from "./ElementPlacementControl";
import StatusBar from "./StatusBar";
import type {
  TrackCanvasHandle,
  TrackCanvasProps,
} from "@/components/canvas/editor/TrackCanvas";
import type {
  TrackPreview3DHandle,
  TrackPreview3DProps,
} from "@/components/canvas/editor/TrackPreview3D";
import type { EditorView } from "@/lib/editor/view";
import type { RefObject } from "react";
import { Spinner } from "@/components/ui/spinner";

const TrackCanvas = dynamic<TrackCanvasProps>(
  () => import("@/components/canvas/editor/TrackCanvas"),
  { ssr: false }
) as ForwardRefExoticComponent<
  TrackCanvasProps & RefAttributes<TrackCanvasHandle>
>;

function loadTrackPreview3D() {
  return import("@/components/canvas/editor/TrackPreview3D");
}

const TrackPreview3D = dynamic<TrackPreview3DProps>(
  () => loadTrackPreview3D(),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground/40 flex h-full flex-col items-center justify-center gap-2 text-xs">
        <Spinner className="size-5" />
        Loading 3D…
      </div>
    ),
  }
) as ForwardRefExoticComponent<
  TrackPreview3DProps & RefAttributes<TrackPreview3DHandle>
>;

interface EditorWorkspaceProps {
  tab: EditorView;
  readOnly: boolean;
  isMobile: boolean;
  canvasRef: RefObject<TrackCanvasHandle | null>;
  preview3DRef: RefObject<TrackPreview3DHandle | null>;
  hasVisited3D: boolean;
  mobileRulersEnabled: boolean;
  mobileMultiSelectEnabled: boolean;
  showObstacleNumbers: boolean;
  mobileGizmoEnabled: boolean;
  cursorPos: { x: number; y: number } | null;
  snapActive: boolean;
  onCursorChange: (pos: { x: number; y: number } | null) => void;
  onDraftPathStateChange: (state: {
    active: boolean;
    canClose: boolean;
    closed: boolean;
    length: number;
    pointCount: number;
  }) => void;
  onSnapChange: (active: boolean) => void;
  onMobileMultiSelectStart: (shapeId: string) => void;
  onFlyModeChange: (active: boolean) => void;
  onResumeSelectedPath: (shapeId: string) => void;
  overlay?: ReactNode;
}

export function EditorWorkspace({
  tab,
  readOnly,
  isMobile,
  canvasRef,
  preview3DRef,
  hasVisited3D,
  mobileRulersEnabled,
  mobileMultiSelectEnabled,
  showObstacleNumbers,
  mobileGizmoEnabled,
  cursorPos,
  snapActive,
  onCursorChange,
  onDraftPathStateChange,
  onSnapChange,
  onMobileMultiSelectStart,
  onFlyModeChange,
  onResumeSelectedPath,
  overlay,
}: EditorWorkspaceProps) {
  useEffect(() => {
    if (hasVisited3D) return;

    const timeoutId = window.setTimeout(() => {
      void loadTrackPreview3D();
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [hasVisited3D]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {/* Canvas area */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="bg-canvas relative min-h-0 flex-1 overflow-hidden">
          {/* 2D: always mounted so export always works; hidden visually when not active */}
          <div
            className="absolute inset-0"
            style={{
              visibility: tab === "2d" ? "visible" : "hidden",
              pointerEvents: tab === "2d" ? "auto" : "none",
            }}
          >
            <TrackCanvas
              ref={canvasRef}
              onCursorChange={onCursorChange}
              onDraftPathStateChange={onDraftPathStateChange}
              onSnapChange={onSnapChange}
              onMobileMultiSelectStart={onMobileMultiSelectStart}
              mobileRulersEnabled={mobileRulersEnabled}
              mobileMultiSelectEnabled={mobileMultiSelectEnabled}
              readOnly={readOnly}
              showObstacleNumbers={showObstacleNumbers}
            />
          </div>
          {hasVisited3D ? (
            <div
              className="absolute inset-0"
              style={{ display: tab === "3d" ? "block" : "none" }}
            >
              <TrackPreview3D
                ref={preview3DRef}
                showGizmo={mobileGizmoEnabled}
                onFlyModeChange={onFlyModeChange}
                readOnly={readOnly}
              />
            </div>
          ) : null}
          {tab === "2d" && !readOnly && !isMobile ? (
            <ElementPlacementControl />
          ) : null}
          {overlay}
        </div>
        <StatusBar cursorPos={cursorPos} snapActive={snapActive} />
      </div>

      {/* Desktop Inspector */}
      {!readOnly && !isMobile && (
        <DesktopInspectorPanel onResumeSelectedPath={onResumeSelectedPath} />
      )}
    </div>
  );
}
