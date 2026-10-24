import { useLayoutEffect } from "react";
import { useTrackCanvasViewport as useOriginalViewport } from "../../../../src/components/canvas/useTrackCanvasViewport";
import { useDocument } from "../workspace/document-context.jsx";
export function useTrackCanvasViewport(params) {
  const document = useDocument();
  const { stageInstance, setManualView, syncTransform } = params;
  useLayoutEffect(() => {
    const stage = stageInstance;
    if (!stage || !document) return;
    const view = document.viewport2d;
    if (view) {
      setManualView(true);
      stage.scale({ x: view.scale, y: view.scale });
      stage.position({ x: view.x, y: view.y });
      syncTransform();
    }
    const capture = () => {
      document.viewport2d = {
        x: stage.x(),
        y: stage.y(),
        scale: stage.scaleX(),
      };
    };
    stage.on("xChange.desktop yChange.desktop scaleXChange.desktop", capture);
    return () => {
      stage.off(".desktop");
    };
  }, [document, stageInstance, setManualView, syncTransform]);
  useOriginalViewport(params);
}
