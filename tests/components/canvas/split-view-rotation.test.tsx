// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { useTrackPreview3DInteractions } from "@/components/canvas/editor/useTrackPreview3DInteractions";
import { useEditor } from "@/store/editor";
import {
  expectPastStatesCount,
  gateDraft,
  resetEditorStore,
  setEditorTestTime,
} from "../../helpers/editor-store";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it.each(["mouseup", "blur"] as const)(
  "shares the 3D rotation before release and clears it on %s",
  (endEvent) => {
    const editor = resetEditorStore();
    const id = editor.addShape(gateDraft({ x: 0, y: 0 }));
    editor.clearHistory();
    setEditorTestTime("2026-04-13T10:00:01.000Z");
    const design = useEditor.getState().track.design;
    const { result } = renderHook(() =>
      useTrackPreview3DInteractions({
        ...editor,
        shapeById: design.shapeById,
        selectedPolyline: null,
        syncSplitView: true,
      })
    );

    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    camera.position.set(0, 10, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const container = document.createElement("div");
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 100, 100)
    );

    act(() => {
      result.current.handleCameraCapture(camera);
      result.current.containerRef.current = container;
      result.current.handleRotateDragStart(
        {
          nativeEvent: new PointerEvent("pointerdown", {
            clientX: 50,
            clientY: 75,
          }),
          stopPropagation() {},
        } as ThreeEvent<PointerEvent>,
        id,
        0
      );
    });
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockReturnValue(1);
    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 75, clientY: 50 })
      );
      expect(requestFrame).toHaveBeenCalledOnce();
      requestFrame.mock.calls[0][0](0);
    });

    expect(useEditor.getState().ui.liveShapePatches[id]?.rotation).toBe(-90);
    expect(useEditor.getState().track.design).toBe(design);
    expectPastStatesCount(0);

    act(() => {
      window.dispatchEvent(new Event(endEvent));
    });

    const state = useEditor.getState();
    expect(state.ui.liveShapePatches[id]).toBeUndefined();
    expect(state.session.interactionSessionDepth).toBe(0);
    expect(state.track.design.shapeById[id]?.rotation).toBe(
      endEvent === "mouseup" ? -90 : 0
    );
    expectPastStatesCount(endEvent === "mouseup" ? 1 : 0);
  }
);
