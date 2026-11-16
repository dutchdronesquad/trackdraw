"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  useEffect,
  type ReactNode,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { DesktopInspectorPanel } from "./DesktopInspectorPanel";
import { ElementPlacementControl } from "./ElementPlacementControl";
import StatusBar from "./StatusBar";
import { EditorViewDivider } from "./EditorViewDivider";
import type { useEditorSplitView } from "@/hooks/editor/useEditorSplitView";
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
    loading: Loading3D,
  }
) as ForwardRefExoticComponent<
  TrackPreview3DProps & RefAttributes<TrackPreview3DHandle>
>;

function Loading3D() {
  const t = useTranslations("editor");

  return (
    <div className="text-muted-foreground/40 flex h-full flex-col items-center justify-center gap-2 text-xs">
      <Spinner className="size-5" />
      {t("shell.loading3d")}
    </div>
  );
}

interface EditorWorkspaceProps {
  tab: EditorView;
  canvasAreaRef: RefObject<HTMLDivElement | null>;
  split: ReturnType<typeof useEditorSplitView>[1];
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
  canvasAreaRef,
  split,
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

  const show2D = split.active || tab === "2d";
  const show3D = split.active || tab === "3d";

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {/* Canvas area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={canvasAreaRef}
          className="bg-canvas relative min-h-0 flex-1 overflow-hidden"
        >
          {/* 2D: always mounted so export always works; hidden visually when not active */}
          <div
            id="editor-canvas-2d"
            className="absolute inset-0 overflow-hidden"
            style={{
              right: split.active ? `${100 - split.ratio}%` : undefined,
              visibility: show2D ? "visible" : "hidden",
              pointerEvents: show2D ? "auto" : "none",
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
            {show2D && !readOnly && !isMobile ? (
              <ElementPlacementControl />
            ) : null}
          </div>
          {hasVisited3D ? (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                left: split.active ? `${split.ratio}%` : undefined,
                display: show3D ? "block" : "none",
              }}
            >
              <TrackPreview3D
                ref={preview3DRef}
                active={show3D}
                showGizmo={mobileGizmoEnabled}
                onFlyModeChange={onFlyModeChange}
                readOnly={readOnly || split.active}
              />
            </div>
          ) : null}
          {split.active && (
            <EditorViewDivider canvasAreaRef={canvasAreaRef} split={split} />
          )}
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
