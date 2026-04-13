"use client";

import { Line as DreiLine } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { getPreviewRotationGuideDegrees } from "@/lib/track/orientation";
import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  PolylineShape,
} from "@/lib/types";

export function LadderElevationHandle3D({
  shape,
  onDragStart,
  isDragging,
  isMobile,
  elevationOverrideRef,
}: {
  shape: LadderShape;
  onDragStart: (event: ThreeEvent<PointerEvent>) => void;
  isDragging: boolean;
  isMobile: boolean;
  elevationOverrideRef: RefObject<number | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const guideGroupRef = useRef<THREE.Group>(null);
  const guideHeight = Math.max(shape.height ?? 4.5, 1) + 0.65;
  const handleY = Math.max(shape.height ?? 4.5, 1) + 0.42;
  const gripRadius = isMobile
    ? isDragging
      ? 0.22
      : 0.2
    : isDragging
      ? 0.18
      : 0.16;
  const gripHeight = isMobile
    ? isDragging
      ? 0.26
      : 0.22
    : isDragging
      ? 0.2
      : 0.17;
  const touchTargetRadius = isMobile ? 0.34 : gripRadius;
  const touchTargetHeight = isMobile ? 0.58 : gripHeight;
  const guideColor = isDragging ? "#f59e0b" : hovered ? "#bfdbfe" : "#93c5fd";

  useFrame(() => {
    if (!guideGroupRef.current) return;
    guideGroupRef.current.position.set(
      shape.x,
      Math.max(elevationOverrideRef.current ?? shape.elevation ?? 0, 0),
      shape.y
    );
  });

  return (
    <group
      ref={guideGroupRef}
      position={[shape.x, Math.max(shape.elevation ?? 0, 0), shape.y]}
    >
      <mesh position={[0, guideHeight / 2, 0]}>
        <cylinderGeometry args={[0.022, 0.022, guideHeight, 12]} />
        <meshBasicMaterial color={guideColor} transparent opacity={0.5} />
      </mesh>
      <mesh
        position={[0, handleY, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart(event);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry
          args={[touchTargetRadius, touchTargetRadius, touchTargetHeight, 24]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, handleY, 0]}>
        <cylinderGeometry args={[gripRadius, gripRadius, gripHeight, 24]} />
        <meshStandardMaterial
          color={isDragging ? "#f59e0b" : hovered ? "#38bdf8" : "#1e293b"}
          emissive={isDragging ? "#fbbf24" : hovered ? "#7dd3fc" : "#60a5fa"}
          emissiveIntensity={isDragging ? 1 : hovered ? 0.62 : 0.28}
          roughness={0.16}
          metalness={0.14}
        />
      </mesh>
      <mesh position={[0, handleY + gripHeight * 0.26, 0]}>
        <coneGeometry
          args={[gripRadius * 0.78, Math.max(gripHeight * 0.6, 0.08), 24]}
        />
        <meshStandardMaterial
          color={isDragging ? "#fff3c4" : hovered ? "#f8fbff" : "#cbd5e1"}
          emissive={isDragging ? "#fbbf24" : hovered ? "#bae6fd" : "#93c5fd"}
          emissiveIntensity={isDragging ? 0.7 : hovered ? 0.38 : 0.16}
          roughness={0.12}
          metalness={0.08}
        />
      </mesh>
    </group>
  );
}

export function PolylineElevationHandles3D({
  isMobile,
  path,
  activeIndex,
  onDragStart,
}: {
  isMobile: boolean;
  path: PolylineShape;
  activeIndex: number | null;
  onDragStart: (event: ThreeEvent<PointerEvent>, index: number) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <group>
      {path.points.map((point, index) => {
        const pointHeight = Math.max(point.z ?? 0, 0);
        const guideHeight = Math.max(0.4, pointHeight + 0.5);
        const isActive = activeIndex === index;
        const isHovered = hoveredIndex === index;
        const handleY = pointHeight + 0.52;
        const guideColor = isActive
          ? "#f59e0b"
          : isHovered
            ? "#bfdbfe"
            : "#93c5fd";
        const gripRadius = isMobile
          ? isActive
            ? 0.23
            : 0.2
          : isActive
            ? 0.19
            : 0.16;
        const gripHeight = isMobile
          ? isActive
            ? 0.24
            : 0.2
          : isActive
            ? 0.18
            : 0.15;
        const touchTargetRadius = isMobile ? 0.38 : gripRadius + 0.06;
        const touchTargetHeight = isMobile ? 0.58 : gripHeight;
        return (
          <group key={`${path.id}-elev-${index}`}>
            <mesh position={[point.x, guideHeight / 2, point.y]}>
              <cylinderGeometry args={[0.028, 0.028, guideHeight, 16]} />
              <meshBasicMaterial
                color={guideColor}
                transparent
                opacity={isActive ? 0.95 : isHovered ? 0.82 : 0.48}
              />
            </mesh>
            <mesh
              position={[point.x, pointHeight + 0.03, point.y]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.13, 0.19, 40]} />
              <meshBasicMaterial
                color={isActive ? "#fbbf24" : "#60a5fa"}
                transparent
                opacity={isActive ? 0.92 : isHovered ? 0.62 : 0.34}
                side={THREE.DoubleSide}
              />
            </mesh>
            {(isActive || isHovered) && (
              <mesh
                position={[point.x, pointHeight + 0.031, point.y]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <circleGeometry args={[0.24, 36]} />
                <meshBasicMaterial
                  color={isActive ? "#fbbf24" : "#93c5fd"}
                  transparent
                  opacity={isActive ? 0.14 : 0.09}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
            <mesh
              position={[point.x, handleY, point.y]}
              onPointerDown={(event) => onDragStart(event, index)}
              onPointerOver={() => setHoveredIndex(index)}
              onPointerOut={() =>
                setHoveredIndex((current) =>
                  current === index ? null : current
                )
              }
            >
              <cylinderGeometry
                args={[
                  touchTargetRadius,
                  touchTargetRadius,
                  touchTargetHeight,
                  24,
                ]}
              />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh position={[point.x, handleY, point.y]}>
              <cylinderGeometry
                args={[gripRadius, gripRadius, gripHeight, 24]}
              />
              <meshStandardMaterial
                color={isActive ? "#f59e0b" : isHovered ? "#38bdf8" : "#1e293b"}
                emissive={
                  isActive ? "#fbbf24" : isHovered ? "#7dd3fc" : "#60a5fa"
                }
                emissiveIntensity={isActive ? 1 : isHovered ? 0.62 : 0.28}
                roughness={0.16}
                metalness={0.14}
              />
            </mesh>
            <mesh position={[point.x, handleY + gripHeight * 0.22, point.y]}>
              <cylinderGeometry
                args={[
                  gripRadius * 0.72,
                  gripRadius * 0.92,
                  Math.max(gripHeight * 0.38, 0.05),
                  24,
                ]}
              />
              <meshStandardMaterial
                color={isActive ? "#fff3c4" : isHovered ? "#f8fbff" : "#cbd5e1"}
                emissive={
                  isActive ? "#fbbf24" : isHovered ? "#bae6fd" : "#93c5fd"
                }
                emissiveIntensity={isActive ? 0.7 : isHovered ? 0.38 : 0.16}
                roughness={0.12}
                metalness={0.08}
              />
            </mesh>
            {(isActive || isHovered) && (
              <mesh position={[point.x, handleY + 0.14, point.y]}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial
                  color={isActive ? "#fbbf24" : "#60a5fa"}
                  transparent
                  opacity={0.95}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function GateRotateHandle3D({
  shape,
  onDragStart,
  isDragging,
  isMobile,
  rotationOverrideRef,
}: {
  shape: GateShape | LadderShape | DiveGateShape | FlagShape;
  onDragStart: (event: ThreeEvent<PointerEvent>) => void;
  isDragging: boolean;
  isMobile: boolean;
  rotationOverrideRef: RefObject<number | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const guideRotationDeg = getPreviewRotationGuideDegrees(shape);
  const ringRadius = Math.max(
    shape.kind === "gate"
      ? ((shape as GateShape).width ?? 3) / 2 + 0.85
      : shape.kind === "flag"
        ? Math.max(((shape as FlagShape).poleHeight ?? 3.5) * 0.22, 1.45)
        : shape.kind === "ladder"
          ? ((shape as LadderShape).width ?? 2) / 2 + 0.85
          : ((shape as DiveGateShape).size ?? 2.8) / 2 + 0.85,
    1.7
  );
  const yawRad = (-guideRotationDeg * Math.PI) / 180;
  const hitR = isMobile ? 0.65 : 0.5;
  const ringThickness = 0.16;
  const indicatorThickness = ringThickness;

  const ringColor = isDragging ? "#fbbf24" : hovered ? "#7dd3fc" : "#38bdf8";
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const needleMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const centerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const needleGroupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (isDragging && needleGroupRef.current) {
      const rot = getPreviewRotationGuideDegrees({
        ...shape,
        rotation: rotationOverrideRef.current ?? shape.rotation,
      });
      needleGroupRef.current.rotation.y = (-rot * Math.PI) / 180;
    }
    if (isDragging || hovered) return;
    pulseRef.current += delta * 1.6;
    const t = 0.62 + Math.sin(pulseRef.current) * 0.13;
    if (ringMatRef.current) {
      ringMatRef.current.opacity = t;
    }
    if (needleMatRef.current) {
      needleMatRef.current.opacity = t * 0.88;
    }
    if (centerMatRef.current) {
      centerMatRef.current.opacity = t * 0.92;
    }
  });

  const ringOpacity = isDragging ? 0.96 : hovered ? 0.88 : 0.68;
  const needleOpacity = isDragging ? 0.96 : hovered ? 0.88 : 0.68;

  return (
    <group>
      <mesh position={[shape.x, 0.07, shape.y]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringRadius - 0.08, ringRadius + 0.08, 72]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={ringColor}
          transparent
          opacity={ringOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[shape.x, 0.07, shape.y]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart(event);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <ringGeometry
          args={[Math.max(0.2, ringRadius - hitR), ringRadius + hitR, 72]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group
        ref={needleGroupRef}
        position={[shape.x, 0, shape.y]}
        rotation={[0, yawRad, 0]}
      >
        <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[indicatorThickness / 2, 32]} />
          <meshBasicMaterial
            ref={centerMatRef}
            color={ringColor}
            transparent
            opacity={needleOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          position={[0, 0.025, ringRadius / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[indicatorThickness, ringRadius]} />
          <meshBasicMaterial
            ref={needleMatRef}
            color={ringColor}
            transparent
            opacity={needleOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          position={[0, 0.027, ringRadius / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={(event) => {
            event.stopPropagation();
            onDragStart(event);
          }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <planeGeometry
            args={[Math.max(hitR * 1.2, 0.5), ringRadius + hitR]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export function DiveGateTiltHandle3D({
  shape,
  onDragStart,
  isDragging,
  isMobile,
  tiltOverrideRef,
}: {
  shape: DiveGateShape;
  onDragStart: (event: ThreeEvent<PointerEvent>) => void;
  isDragging: boolean;
  isMobile: boolean;
  tiltOverrideRef: RefObject<number | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const sz = shape.size ?? 2.8;
  const tilt = shape.tilt ?? 0;
  const tiltRad = (tilt * Math.PI) / 180;
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const centerY = shape.elevation ?? 3.0;
  const arcR = sz / 2;
  const localX = arcR + 0.68;

  const tickY = centerY + arcR * Math.sin(tiltRad);
  const tickZ = -arcR * Math.cos(tiltRad);

  const arcPoints = useMemo(() => {
    const steps = 22;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = (i / steps) * (Math.PI / 2);
      return new THREE.Vector3(
        localX,
        centerY + arcR * Math.sin(t),
        -arcR * Math.cos(t)
      );
    });
  }, [arcR, centerY, localX]);

  const tubeCurve = useMemo(
    () => new THREE.CatmullRomCurve3(arcPoints),
    [arcPoints]
  );
  const tubeGeo = useMemo(
    () =>
      new THREE.TubeGeometry(tubeCurve, 22, isMobile ? 0.55 : 0.42, 6, false),
    [isMobile, tubeCurve]
  );
  useEffect(() => () => tubeGeo.dispose(), [tubeGeo]);

  const visArcCurve = useMemo(
    () => new THREE.CatmullRomCurve3(arcPoints),
    [arcPoints]
  );
  const visArcGeo = useMemo(
    () => new THREE.TubeGeometry(visArcCurve, 22, 0.032, 8, false),
    [visArcCurve]
  );
  useEffect(() => () => visArcGeo.dispose(), [visArcGeo]);

  const arcColor = isDragging ? "#fb923c" : "#f97316";
  const arcMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const crossH = useRef<THREE.MeshStandardMaterial>(null);
  const crossV = useRef<THREE.MeshStandardMaterial>(null);
  const crosshairGroupRef = useRef<THREE.Group>(null);
  const crossVMeshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (isDragging && crosshairGroupRef.current && crossVMeshRef.current) {
      const liveTilt = tiltOverrideRef.current ?? tilt;
      const liveTiltRad = (liveTilt * Math.PI) / 180;
      crosshairGroupRef.current.position.y =
        centerY + arcR * Math.sin(liveTiltRad);
      crosshairGroupRef.current.position.z = -arcR * Math.cos(liveTiltRad);
      crossVMeshRef.current.rotation.x = liveTiltRad;
    }
    if (isDragging || hovered) return;
    pulseRef.current += delta * 1.6;
    const t = 0.62 + Math.sin(pulseRef.current) * 0.13;
    const ei = 0.45 + Math.sin(pulseRef.current) * 0.12;
    for (const ref of [arcMatRef, crossH, crossV]) {
      if (ref.current) {
        ref.current.opacity = t;
        ref.current.emissiveIntensity = ei;
      }
    }
  });

  const arcOpacity = isDragging ? 0.96 : hovered ? 0.88 : 0.7;
  const arcEI = isDragging ? 1.1 : hovered ? 0.8 : 0.5;
  const crossColor = isDragging ? "#fbbf24" : hovered ? "#fde68a" : arcColor;
  const crossOpacity = isDragging ? 0.98 : hovered ? 0.9 : 0.72;
  const crossEI = isDragging ? 1.1 : hovered ? 0.8 : 0.5;

  return (
    <group position={[shape.x, 0, shape.y]} rotation={[0, yawRad, 0]}>
      <DreiLine
        points={[
          new THREE.Vector3(arcR, centerY, 0),
          new THREE.Vector3(localX, centerY, 0),
        ]}
        color={arcColor}
        lineWidth={2}
        transparent
        opacity={arcOpacity * 0.5}
      />

      <mesh geometry={visArcGeo}>
        <meshStandardMaterial
          ref={arcMatRef}
          color={arcColor}
          emissive={arcColor}
          emissiveIntensity={arcEI}
          transparent
          opacity={arcOpacity}
          roughness={0.15}
          depthWrite={false}
        />
      </mesh>

      {(
        [
          [localX, centerY, -arcR],
          [localX, centerY + arcR, 0],
        ] as const
      ).map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.085, 10, 10]} />
          <meshStandardMaterial
            color={arcColor}
            emissive={arcColor}
            emissiveIntensity={arcEI * 0.85}
            transparent
            opacity={arcOpacity * 0.85}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
      ))}

      <mesh
        geometry={tubeGeo}
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart(event);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={crosshairGroupRef} position={[localX, tickY, tickZ]}>
        <mesh>
          <boxGeometry args={[0.44, 0.058, 0.058]} />
          <meshStandardMaterial
            ref={crossH}
            color={crossColor}
            emissive={crossColor}
            emissiveIntensity={crossEI}
            transparent
            opacity={crossOpacity}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={crossVMeshRef} rotation={[tiltRad, 0, 0]}>
          <boxGeometry args={[0.058, 0.34, 0.058]} />
          <meshStandardMaterial
            ref={crossV}
            color={crossColor}
            emissive={crossColor}
            emissiveIntensity={crossEI}
            transparent
            opacity={crossOpacity}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
