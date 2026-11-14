"use client";

import { Component, useLayoutEffect, type ReactNode } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import {
  createOutdoorPresentation,
  outdoorGroundExtent,
  type OutdoorQuality,
} from "@/lib/track/outdoor-presentation";

type Props = {
  width: number;
  height: number;
  quality: OutdoorQuality;
  onGroundClick?: (event: ThreeEvent<MouseEvent>) => void;
};

function Landscape({ width, height, quality, onGroundClick }: Props) {
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const host = useThree((state) => state.gl);
  // Only allocate after commit. Strict Mode and aborted renders must not retain resources.
  useLayoutEffect(() => {
    const outdoor = createOutdoorPresentation({ width, height }, quality);
    const previousFog = scene.fog;
    Object.assign(scene, { fog: outdoor.fog });
    scene.add(outdoor.group);
    invalidate();
    return () => {
      if (scene.fog === outdoor.fog) Object.assign(scene, { fog: previousFog });
      outdoor.dispose();
      Object.assign(host.shadowMap, { needsUpdate: true });
      invalidate();
    };
  }, [width, height, quality, scene, invalidate, host]);

  const extent = outdoorGroundExtent(width, height);
  return onGroundClick ? (
    <mesh
      position={[width / 2, -0.019, height / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={onGroundClick}
    >
      <planeGeometry args={[extent, extent]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  ) : null;
}

class FallbackBoundary extends Component<
  {
    children: ReactNode;
    fallback: ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function OutdoorScene({
  fallback,
  ...props
}: Props & { fallback: ReactNode }) {
  return (
    <FallbackBoundary
      key={`${props.quality}:${props.width}:${props.height}`}
      fallback={fallback}
    >
      <Landscape {...props} />
    </FallbackBoundary>
  );
}
