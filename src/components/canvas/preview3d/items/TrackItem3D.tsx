"use client";

import { getTowerTopY, Tower3D } from "./Tower3D";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { memo, useRef, type Ref, type RefObject } from "react";
import * as THREE from "three";
import {
  getMultiGpDiveGateArchTopY,
  getMultiGpLaunchGateTopY,
  getLadderRenderedHeight,
  resolveDiveGateElevation,
} from "@/lib/track/render3d-layout";
import {
  getDiveGateVisualSpec,
  getGateVisualSpec,
  getLadderVisualSpec,
} from "@/lib/track/elements/visual";
import { POLYLINE_3D_HEIGHT_OFFSET } from "@/lib/track/constants";
import type {
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LabelShape,
  LadderShape,
  PolylineShape,
  Shape,
  ShapeKind,
  TowerShape,
} from "@/lib/types";
import { assertNever } from "@/lib/utils";
import { Gate3D } from "./Gate3D";
import { Ladder3D } from "./Ladder3D";
import { Flag3D } from "./Flag3D";
import { Cone3D } from "./Cone3D";
import { Label3D } from "./Label3D";
import { StartFinish3D } from "./StartFinish3D";
import { DiveGate3D } from "./DiveGate3D";
import { RaceLine3D, getPolylineTubeRadius } from "./RaceLine3D";

const SELECTION_MARKER_MARGIN = 0.35;

function getPolylineTopY(shape: PolylineShape): number {
  const maxPointZ = shape.points.reduce(
    (maxZ, point) => Math.max(maxZ, point.z ?? 0),
    0
  );
  return (
    Math.max(maxPointZ, 0) +
    POLYLINE_3D_HEIGHT_OFFSET +
    getPolylineTubeRadius(shape)
  );
}

function getDiveGateTopY(shape: DiveGateShape): number {
  const visual = getDiveGateVisualSpec(shape);
  if (visual?.variant === "arch") {
    return getMultiGpDiveGateArchTopY(shape.elevation);
  }
  if (visual?.variant === "launch") {
    return getMultiGpLaunchGateTopY(shape.elevation);
  }

  const tiltRad = ((shape.tilt ?? 0) * Math.PI) / 180;
  return (
    resolveDiveGateElevation(shape.elevation, "generic") +
    ((shape.width ?? 2.8) / 2) * Math.sin(tiltRad)
  );
}

const shapeTopYDispatch: Record<ShapeKind, (shape: Shape) => number> = {
  gate: (shape) => {
    const s = shape as GateShape;
    const gateVisual = getGateVisualSpec(s);
    const openingH = s.height ?? 2;
    if (gateVisual.variant === "panel-frame") {
      return openingH + gateVisual.panels.top.heightMeters;
    }
    return openingH;
  },
  tower: (shape) => getTowerTopY(shape as TowerShape),
  flag: (shape) => Math.max((shape as FlagShape).poleHeight ?? 3.5, 0.5),
  cone: (shape) => {
    const radius = (shape as ConeShape).radius ?? 0.2;
    return Math.max(radius * 1.15, 0.1);
  },
  label: (shape) => ((shape as LabelShape).project ? 0.1 : 2.8),
  polyline: (shape) => getPolylineTopY(shape as PolylineShape),
  startfinish: () => 0.1,
  ladder: (shape) => {
    const s = shape as LadderShape;
    const ladderVisual = getLadderVisualSpec(s);
    return Math.max(
      getLadderRenderedHeight(
        s,
        ladderVisual?.variant === "panel-frame" ? ladderVisual : null
      ) + (s.elevation ?? 0),
      0.5
    );
  },
  divegate: (shape) => Math.max(getDiveGateTopY(shape as DiveGateShape), 0.5),
};

function getShapeTopY(shape: Shape): number {
  return shapeTopYDispatch[shape.kind](shape);
}

function SelectionMarker3D({ shape }: { shape: Shape }) {
  const pulse = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  const markerY = getShapeTopY(shape) + SELECTION_MARKER_MARGIN;

  useFrame((_, delta) => {
    pulse.current += delta * 3.4;
    if (!meshRef.current) return;
    const scale = 1 + Math.sin(pulse.current) * 0.08;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} position={[shape.x, markerY, shape.y]} renderOrder={10}>
      <sphereGeometry args={[0.12, 18, 18]} />
      <meshBasicMaterial
        color="#60a5fa"
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </mesh>
  );
}

function Shape3D({
  isPrimaryPolyline,
  isSelected,
  onSelect,
  shape,
  outerRef,
  tiltDragRef,
  elevationOverrideRef,
}: {
  isPrimaryPolyline: boolean;
  isSelected: boolean;
  onSelect: (event: ThreeEvent<MouseEvent>, shapeId: string) => void;
  shape: Shape;
  outerRef?: Ref<THREE.Group>;
  tiltDragRef?: RefObject<number | null>;
  elevationOverrideRef?: RefObject<number | null>;
}) {
  switch (shape.kind) {
    case "gate":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Gate3D shape={shape} selected={isSelected} outerRef={outerRef} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "tower":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Tower3D shape={shape} selected={isSelected} outerRef={outerRef} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "flag":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Flag3D shape={shape} selected={isSelected} outerRef={outerRef} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "cone":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Cone3D shape={shape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "label":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Label3D shape={shape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "polyline":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <RaceLine3D
            isPrimary={isPrimaryPolyline}
            shape={shape}
            selected={isSelected}
          />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "startfinish":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <StartFinish3D shape={shape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "ladder":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Ladder3D
            shape={shape}
            selected={isSelected}
            outerRef={outerRef}
            elevationOverrideRef={elevationOverrideRef}
          />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "divegate":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <DiveGate3D
            shape={shape}
            selected={isSelected}
            outerRef={outerRef}
            tiltDragRef={tiltDragRef}
            elevationOverrideRef={elevationOverrideRef}
          />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    default:
      return assertNever(shape);
  }
}

export const MemoShape3D = memo(
  Shape3D,
  (prev, next) =>
    prev.shape === next.shape &&
    prev.isPrimaryPolyline === next.isPrimaryPolyline &&
    prev.isSelected === next.isSelected &&
    prev.onSelect === next.onSelect &&
    prev.outerRef === next.outerRef &&
    prev.tiltDragRef === next.tiltDragRef &&
    prev.elevationOverrideRef === next.elevationOverrideRef
);
