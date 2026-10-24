import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { captureViewport } from "../workspace/workspace.mjs";
import { useDocument } from "../workspace/document-context.jsx";
export * from "../../../../src/components/canvas/preview3d/shared-scene";
export function CameraCapture({ onCamera }) {
  const { camera, controls } = useThree();
  const document = useDocument();
  const restored = useRef(false);
  useEffect(() => {
    onCamera(camera);
  }, [camera, onCamera]);
  useFrame(() => {
    if (!document || !controls) return;
    if (!restored.current) {
      const view = document.viewport3d;
      if (view) {
        camera.position.fromArray(view.position);
        controls.target.fromArray(view.target);
        controls.update();
      }
      restored.current = true;
    }
    captureViewport(document.id, "viewport3d", {
      position: camera.position.toArray(),
      target: controls.target.toArray(),
    });
  });
  return null;
}
