"use client";

import { useEffect, type RefObject } from "react";
import type { Stage as KonvaStage } from "konva/lib/Stage";

interface TrackCanvasViewportParams {
  containerRef: RefObject<HTMLDivElement | null>;
  fitFieldToViewport: () => void;
  hasManualViewRef: RefObject<boolean>;
  setManualView: (value: boolean) => void;
  setViewportSize: (size: { width: number; height: number }) => void;
  stageRef: RefObject<KonvaStage | null>;
  syncTransform: () => void;
}

export function useTrackCanvasViewport({
  containerRef,
  fitFieldToViewport,
  hasManualViewRef,
  setManualView,
  setViewportSize,
  stageRef,
  syncTransform,
}: TrackCanvasViewportParams) {
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewportSize({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height)),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef, setViewportSize]);

  useEffect(() => {
    if (hasManualViewRef.current) return;
    fitFieldToViewport();
  }, [fitFieldToViewport, hasManualViewRef]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let middlePanActive = false;
    let lastPointer = { x: 0, y: 0 };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 1) return;
      event.preventDefault();
      middlePanActive = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      element.style.cursor = "grabbing";
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!middlePanActive) return;
      const stage = stageRef.current;
      if (!stage) return;

      setManualView(true);
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      stage.position({ x: stage.x() + dx, y: stage.y() + dy });
      stage.batchDraw();
      lastPointer = { x: event.clientX, y: event.clientY };
      syncTransform();
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 1) return;
      middlePanActive = false;
      element.style.cursor = "";
    };

    element.addEventListener("mousedown", onMouseDown);
    element.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      element.removeEventListener("mousedown", onMouseDown);
      element.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [containerRef, setManualView, stageRef, syncTransform]);
}
