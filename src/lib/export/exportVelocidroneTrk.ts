import CryptoJS from "crypto-js";
import { getDesignShapes } from "@/lib/track/design";
import { getObstacleNumberMap } from "@/lib/track/obstacleNumbering";
import { getShapeFacingDegrees } from "@/lib/track/orientation";
import type {
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  Shape,
  StartFinishShape,
  TrackDesign,
} from "@/lib/types";

const VELOCIDRONE_KEY = "VelocidrrdicoleV";
const GROUND_HEIGHT = -0.86;
const FLOOR_BARRIER_HEIGHT = -0.86;
const START_GRID_ROTATION: [number, number, number, number] = [-707, 707, 0, 0];
const PERIMETER_BARRIER_ROTATION_X: [number, number, number, number] = [
  707, 0, 0, 707,
];
const PERIMETER_BARRIER_ROTATION_Z: [number, number, number, number] = [
  -500, 500, 500, -500,
];

interface VelocidroneTransform {
  pos: [number, number, number];
  rot: [number, number, number, number];
  scale: [number, number, number];
}

interface VelocidroneGateRecord {
  prefab: number;
  trans: VelocidroneTransform;
  gate: number;
  start: boolean;
  finish: boolean;
  lap1only: boolean;
}

interface VelocidroneGatePlacement {
  prefab: number;
  trans: VelocidroneTransform;
}

interface VelocidroneBarrierRecord {
  prefab: number;
  trans: VelocidroneTransform;
}

interface VelocidroneValueJson {
  gates: VelocidroneGateRecord[];
  barriers: VelocidroneBarrierRecord[];
}

export interface VelocidroneExportSummary {
  warnings: string[];
  gateCount: number;
  barrierCount: number;
}

interface ExportTransform {
  fieldHeight: number;
  flipZ: boolean;
  offsetX: number;
  offsetZ: number;
  positionScale: number;
}

type QuaternionTuple = [number, number, number, number];

export interface VelocidronePocConfig {
  sceneId: number;
  type: number;
  onlineId: number;
  positionScale: number;
  perimeterBarrierPrefabId: number;
  startGridPrefabId: number;
  gatePrefabId: number;
  finishGatePrefabId: number;
  flagPrefabId: number;
  conePrefabId: number;
  diveGatePrefabId: number;
}

const DEFAULT_CONFIG: VelocidronePocConfig = {
  sceneId: 8,
  type: 0,
  onlineId: 0,
  positionScale: 100,
  perimeterBarrierPrefabId: 336,
  startGridPrefabId: 90,
  gatePrefabId: 150,
  finishGatePrefabId: 150,
  flagPrefabId: 170,
  conePrefabId: 42,
  diveGatePrefabId: 619,
};

function isVelocidroneGateShape(shape: Shape): shape is GateShape {
  return shape.kind === "gate";
}

function isVelocidroneStartShape(shape: Shape): shape is StartFinishShape {
  return shape.kind === "startfinish";
}

function isVelocidroneFlagShape(shape: Shape): shape is FlagShape {
  return shape.kind === "flag";
}

function isVelocidroneConeShape(shape: Shape): shape is ConeShape {
  return shape.kind === "cone";
}

function isVelocidroneLadderShape(shape: Shape): shape is LadderShape {
  return shape.kind === "ladder";
}

function isVelocidroneDiveGateShape(shape: Shape): shape is DiveGateShape {
  return shape.kind === "divegate";
}

function degreesToQuaternionStorageY(
  degrees: number
): [number, number, number, number] {
  const radians = (degrees * Math.PI) / 180;
  const half = radians / 2;
  return [
    Math.round(Math.cos(half) * 1000),
    0,
    Math.round(Math.sin(half) * 1000),
    0,
  ];
}

function axisAngleToQuaternion(
  axis: "x" | "y" | "z",
  degrees: number
): QuaternionTuple {
  const radians = (degrees * Math.PI) / 180;
  const half = radians / 2;
  const sin = Math.sin(half);
  const cos = Math.cos(half);

  if (axis === "x") return [cos, sin, 0, 0];
  if (axis === "y") return [cos, 0, sin, 0];
  return [cos, 0, 0, sin];
}

function multiplyQuaternions(
  [aw, ax, ay, az]: QuaternionTuple,
  [bw, bx, by, bz]: QuaternionTuple
): QuaternionTuple {
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

function quaternionToStorage([w, x, y, z]: QuaternionTuple): QuaternionTuple {
  return [
    Math.round(w * 1000),
    Math.round(x * 1000),
    Math.round(y * 1000),
    Math.round(z * 1000),
  ];
}

function getResolvedConfig(config: VelocidronePocConfig): VelocidronePocConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}

function createExportTransform(
  design: TrackDesign,
  config: VelocidronePocConfig
): ExportTransform {
  return {
    fieldHeight: design.field.height,
    flipZ: design.field.origin === "tl",
    offsetX: -design.field.width / 2,
    offsetZ: -design.field.height / 2,
    positionScale: config.positionScale,
  };
}

function toVelocidronePosition(
  transform: ExportTransform,
  x: number,
  z: number,
  y = 0,
  options?: { flipZ?: boolean }
): [number, number, number] {
  const shouldFlipZ = options?.flipZ ?? transform.flipZ;
  const resolvedZ = shouldFlipZ ? transform.fieldHeight - z : z;
  return [
    Math.round((x + transform.offsetX) * transform.positionScale),
    Math.round(y * transform.positionScale),
    Math.round((resolvedZ + transform.offsetZ) * transform.positionScale),
  ];
}

function buildTransform(
  transform: ExportTransform,
  x: number,
  z: number,
  rotation: number,
  y = GROUND_HEIGHT,
  scale: [number, number, number] = [100, 100, 100]
): VelocidroneTransform {
  return {
    pos: toVelocidronePosition(transform, x, z, y),
    rot: degreesToQuaternionStorageY(rotation),
    scale,
  };
}

function buildGatePlacement(
  shape: GateShape,
  prefab: number,
  transform: ExportTransform,
  height = GROUND_HEIGHT
): VelocidroneGatePlacement {
  return {
    prefab,
    trans: buildTransform(
      transform,
      shape.x,
      shape.y,
      getShapeFacingDegrees(shape),
      height
    ),
  };
}

function buildLadderGatePlacements(
  shape: LadderShape,
  config: VelocidronePocConfig,
  transform: ExportTransform
): VelocidroneGatePlacement[] {
  const count = Math.max(2, shape.rungs);
  const rungHeight = Math.max(1.2, shape.height);
  const rungSpacing = Math.max(0.55, rungHeight * 0.3);

  return Array.from({ length: count }, (_, idx) => ({
    prefab: config.gatePrefabId,
    trans: buildTransform(
      transform,
      shape.x,
      shape.y,
      getShapeFacingDegrees(shape),
      GROUND_HEIGHT - 0.38 + rungHeight * 0.05 + idx * rungSpacing
    ),
  }));
}

function buildBarrierRecord(
  shape: Pick<Shape, "x" | "y" | "rotation">,
  prefab: number,
  transform: ExportTransform,
  options?: { sinkIntoGround?: number; rotationOffset?: number }
): VelocidroneBarrierRecord {
  const y = GROUND_HEIGHT - (options?.sinkIntoGround ?? 0);
  const rotation = shape.rotation + (options?.rotationOffset ?? 0);

  return {
    prefab,
    trans: buildTransform(transform, shape.x, shape.y, rotation, y),
  };
}

function buildStartGridBarrierRecord(
  shape: StartFinishShape,
  config: VelocidronePocConfig,
  transform: ExportTransform
): VelocidroneBarrierRecord {
  return {
    prefab: config.startGridPrefabId,
    trans: {
      pos: toVelocidronePosition(
        transform,
        shape.x,
        shape.y,
        FLOOR_BARRIER_HEIGHT
      ),
      rot: START_GRID_ROTATION,
      scale: [100, 100, 100],
    },
  };
}

function buildDiveGateBarrierRecord(
  shape: DiveGateShape,
  config: VelocidronePocConfig,
  transform: ExportTransform
): VelocidroneBarrierRecord {
  const baseRotation = multiplyQuaternions(
    axisAngleToQuaternion("y", getShapeFacingDegrees(shape)),
    axisAngleToQuaternion("x", 90)
  );
  const tiltAdjustedRotation = multiplyQuaternions(
    baseRotation,
    axisAngleToQuaternion("z", -(shape.tilt ?? 0))
  );

  return {
    prefab: config.diveGatePrefabId,
    trans: {
      pos: toVelocidronePosition(
        transform,
        shape.x,
        shape.y,
        GROUND_HEIGHT - 0.42
      ),
      rot: quaternionToStorage(tiltAdjustedRotation),
      scale: [100, 100, 100],
    },
  };
}

function buildFieldPerimeterBarrierRecords(
  design: TrackDesign,
  config: VelocidronePocConfig,
  transform: ExportTransform
): VelocidroneBarrierRecord[] {
  const horizontalStep = 5;
  const verticalStep = 5;
  const edgeInset = 0.5;
  const perimeterExtension = 1;
  const horizontalOffset = horizontalStep;
  const verticalOffset = verticalStep;
  const longScale: [number, number, number] = [206, 100, 100];
  const y = -0.9;
  const barriers: VelocidroneBarrierRecord[] = [];

  const pushBarrier = (
    x: number,
    z: number,
    rot: [number, number, number, number],
    scale: [number, number, number]
  ) => {
    barriers.push({
      prefab: config.perimeterBarrierPrefabId,
      trans: {
        pos: toVelocidronePosition(transform, x, z, y, { flipZ: false }),
        rot,
        scale,
      },
    });
  };

  const horizontalCenters: number[] = [];
  for (
    let x = edgeInset + horizontalOffset - perimeterExtension;
    x <=
    design.field.width -
      edgeInset +
      horizontalOffset +
      perimeterExtension +
      0.001;
    x += horizontalStep
  ) {
    horizontalCenters.push(Number(x.toFixed(3)));
  }

  const verticalCenters: number[] = [];
  for (
    let z = edgeInset + verticalOffset - perimeterExtension;
    z <=
    design.field.height -
      edgeInset +
      verticalOffset +
      perimeterExtension +
      0.001;
    z += verticalStep
  ) {
    verticalCenters.push(Number(z.toFixed(3)));
  }

  for (const x of horizontalCenters) {
    pushBarrier(x, -edgeInset, PERIMETER_BARRIER_ROTATION_X, longScale);
    pushBarrier(
      x,
      design.field.height + edgeInset,
      PERIMETER_BARRIER_ROTATION_X,
      longScale
    );
  }

  for (const z of verticalCenters) {
    pushBarrier(-edgeInset, z, PERIMETER_BARRIER_ROTATION_Z, longScale);
    pushBarrier(
      design.field.width + edgeInset,
      z,
      PERIMETER_BARRIER_ROTATION_Z,
      longScale
    );
  }

  return barriers;
}

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`Velocidrone export found an invalid ${label}.`);
  }
}

function assertPocShapes(design: TrackDesign) {
  const shapes = getDesignShapes(design);
  const startShapes = shapes.filter(isVelocidroneStartShape);
  const gates = shapes.filter(isVelocidroneGateShape);

  assertFiniteNumber(design.field.width, "field width");
  assertFiniteNumber(design.field.height, "field height");

  if (design.field.width <= 0 || design.field.height <= 0) {
    throw new Error("Velocidrone export needs a field with a positive size.");
  }

  if (startShapes.length !== 1) {
    throw new Error(
      "Velocidrone POC export needs exactly 1 start/finish object."
    );
  }

  if (gates.length < 2) {
    throw new Error(
      "Velocidrone POC export needs at least 2 gate objects after the start/finish."
    );
  }

  for (const shape of shapes) {
    assertFiniteNumber(shape.x, `${shape.kind} x position`);
    assertFiniteNumber(shape.y, `${shape.kind} y position`);
    assertFiniteNumber(shape.rotation, `${shape.kind} rotation`);
  }
}

function getIgnoredShapeWarnings(design: TrackDesign) {
  const ignoredKinds = new Set(
    getDesignShapes(design)
      .filter(
        (shape: Shape) =>
          shape.kind === "label" || shape.kind === "polyline"
      )
      .map((shape: Shape) => shape.kind)
  );
  if (!ignoredKinds.size) return [];

  return [
    `Ignored non-exported items: ${Array.from(ignoredKinds).join(", ")}.`,
  ];
}

function getOrderedGateSourceShapes(design: TrackDesign) {
  const shapes = getDesignShapes(design);
  const routeNumbers = getObstacleNumberMap(design);

  return shapes
    .map((shape: Shape, shapeOrder: number) => ({
      shape,
      shapeOrder,
      routeNumber: routeNumbers.get(shape.id) ?? Number.POSITIVE_INFINITY,
    }))
    .filter(
      (
        entry
      ): entry is {
        shape: GateShape | LadderShape;
        shapeOrder: number;
        routeNumber: number;
      } =>
        isVelocidroneGateShape(entry.shape) ||
        isVelocidroneLadderShape(entry.shape)
    )
    .sort((a, b) => {
      if (a.routeNumber !== b.routeNumber) {
        return a.routeNumber - b.routeNumber;
      }
      return a.shapeOrder - b.shapeOrder;
    })
    .map((entry) => entry.shape);
}

function buildGatePlacements(
  design: TrackDesign,
  config: VelocidronePocConfig,
  transform: ExportTransform
): VelocidroneGatePlacement[] {
  const shapes = getOrderedGateSourceShapes(design);

  return shapes.flatMap((shape) => {
    if (isVelocidroneGateShape(shape)) {
      return [buildGatePlacement(shape, config.gatePrefabId, transform)];
    }
    if (isVelocidroneLadderShape(shape)) {
      return buildLadderGatePlacements(shape, config, transform);
    }
    return [];
  });
}

function buildBarrierRecords(
  design: TrackDesign,
  config: VelocidronePocConfig,
  transform: ExportTransform
): VelocidroneBarrierRecord[] {
  const shapes = getDesignShapes(design);
  const startShape = shapes.find(isVelocidroneStartShape);

  if (!startShape) {
    throw new Error(
      "Velocidrone POC export could not resolve the start shape."
    );
  }

  return [
    ...buildFieldPerimeterBarrierRecords(design, config, transform),
    buildStartGridBarrierRecord(startShape, config, transform),
    ...shapes
      .filter(isVelocidroneFlagShape)
      .map((shape: FlagShape) =>
        buildBarrierRecord(shape, config.flagPrefabId, transform, {
          sinkIntoGround: 0.22,
          rotationOffset: 180,
        })
      ),
    ...shapes
      .filter(isVelocidroneConeShape)
      .map((shape: ConeShape) =>
        buildBarrierRecord(shape, config.conePrefabId, transform)
      ),
    ...shapes
      .filter(isVelocidroneDiveGateShape)
      .map((shape: DiveGateShape) =>
        buildDiveGateBarrierRecord(shape, config, transform)
      ),
  ];
}

function buildGateRecord(
  placement: VelocidroneGatePlacement,
  index: number,
  lastIndex: number,
  config: VelocidronePocConfig
): VelocidroneGateRecord {
  const isLapLine = index === 0;
  const isLast = index === lastIndex;

  return {
    prefab: isLast ? config.finishGatePrefabId : placement.prefab,
    trans: placement.trans,
    gate: index,
    start: isLapLine,
    finish: isLapLine || isLast,
    lap1only: false,
  };
}

export function buildVelocidroneValueJson(
  design: TrackDesign,
  config: VelocidronePocConfig = DEFAULT_CONFIG
): VelocidroneValueJson {
  const resolvedConfig = getResolvedConfig(config);
  const transform = createExportTransform(design, resolvedConfig);

  assertPocShapes(design);

  const gatePlacements = buildGatePlacements(design, resolvedConfig, transform);
  const barriers = buildBarrierRecords(design, resolvedConfig, transform);
  const lastIndex = gatePlacements.length - 1;

  return {
    gates: gatePlacements.map((placement, index) =>
      buildGateRecord(placement, index, lastIndex, resolvedConfig)
    ),
    barriers,
  };
}

export function buildVelocidronePayload({
  sceneId,
  trackName,
  valueJson,
  type,
  onlineId,
}: {
  sceneId: number;
  trackName: string;
  valueJson: VelocidroneValueJson;
  type: number;
  onlineId: number;
}) {
  const value = JSON.stringify(valueJson);
  const safeTrackName = trackName.replace(/[\r\n]+/g, " ").trim() || "track";
  return `${sceneId}\n${safeTrackName}\n${value}\n${type}\n${onlineId}`;
}

export function encryptVelocidroneTrk(plaintext: string) {
  const key = CryptoJS.enc.Utf8.parse(VELOCIDRONE_KEY);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

function downloadTextFile(contents: string, filename: string) {
  const blob = new Blob([contents], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportVelocidroneTrk(
  design: TrackDesign,
  filename = "track.trk",
  config: VelocidronePocConfig = DEFAULT_CONFIG
) {
  const resolvedConfig = getResolvedConfig(config);
  const trackName = filename.replace(/\.trk$/i, "") || "track";
  const warnings = [
    ...getIgnoredShapeWarnings(design),
    ...(getObstacleNumberMap(design).size
      ? []
      : [
          "No route path found, so gate order falls back to canvas order.",
        ]),
  ];
  const valueJson = buildVelocidroneValueJson(design, resolvedConfig);
  const plaintext = buildVelocidronePayload({
    sceneId: resolvedConfig.sceneId,
    trackName,
    valueJson,
    type: resolvedConfig.type,
    onlineId: resolvedConfig.onlineId,
  });
  const encrypted = encryptVelocidroneTrk(plaintext);

  downloadTextFile(encrypted, filename);

  return {
    warnings,
    gateCount: valueJson.gates.length,
    barrierCount: valueJson.barriers.length,
  } satisfies VelocidroneExportSummary;
}
