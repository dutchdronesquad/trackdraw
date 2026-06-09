import {
  shapeKindLabels,
  isSetupHardObstacle,
  getTrackItemAdapter,
  type SetupComplexity,
  type SetupProfile,
} from "@/lib/track/items/registry";
import {
  getObstacleNumberMap,
  isNumberedObstacle,
} from "@/lib/track/obstacleNumbering";
import type { Shape, TrackDesign } from "@/lib/types";

export type { SetupComplexity, SetupProfile };

export type SetupStep = {
  id: string;
  stepType: "crew" | "item" | "group";
  kind: string;
  label: string;
  note: string;
  complexity: SetupComplexity;
  estimatedMinutes: number;
  obstacleNumber: number | null;
};

export type SetupPlan = {
  steps: SetupStep[];
  estimatedElapsedMinutes: number;
  estimatedElapsedRange: [number, number];
  crewAssumption: string;
  complexityLabel: "Light" | "Standard" | "Heavy";
  summary: string;
};

function getSetupProfile(shape: Shape): SetupProfile {
  return getTrackItemAdapter(shape.kind).getSetupProfile(shape);
}

function getDisplayLabel(shape: Shape) {
  const customName = shape.name?.trim();
  return customName ? customName : shapeKindLabels[shape.kind];
}

function getComplexityLabel(totalMinutes: number) {
  if (totalMinutes >= 70) return "Heavy" as const;
  if (totalMinutes >= 35) return "Standard" as const;
  return "Light" as const;
}

export function buildSetupPlan(design: TrackDesign): SetupPlan {
  const obstacleNumberMap = getObstacleNumberMap(design);
  const shapes = design.shapeOrder
    .map((id) => design.shapeById[id])
    .filter((shape): shape is Shape => Boolean(shape))
    .filter((shape) => shape.kind !== "polyline" && shape.kind !== "label");
  const flagShapes = shapes.filter((shape) => shape.kind === "flag");
  const coneShapes = shapes.filter((shape) => shape.kind === "cone");
  const mainObstacleShapes = shapes.filter(
    (shape) => shape.kind !== "flag" && shape.kind !== "cone"
  );

  const obstacleSteps: SetupStep[] = mainObstacleShapes
    .map((shape, index) => {
      const profile = getSetupProfile(shape);
      const obstacleNumber =
        isNumberedObstacle(shape) && obstacleNumberMap.has(shape.id)
          ? (obstacleNumberMap.get(shape.id) ?? null)
          : null;

      return {
        id: shape.id,
        stepType: "item" as const,
        kind: shapeKindLabels[shape.kind],
        label: getDisplayLabel(shape),
        note:
          obstacleNumber != null
            ? `${profile.note} Use obstacle #${obstacleNumber} on the map as the placement reference.`
            : profile.note,
        complexity: profile.complexity,
        estimatedMinutes: profile.placeMinutes,
        obstacleNumber,
        _sortPriority: profile.priority,
        _sortIndex: index,
      };
    })
    .sort((a, b) => {
      if (a._sortPriority !== b._sortPriority) {
        return a._sortPriority - b._sortPriority;
      }
      if (a.obstacleNumber != null && b.obstacleNumber != null) {
        return a.obstacleNumber - b.obstacleNumber;
      }
      if (a.obstacleNumber != null) return -1;
      if (b.obstacleNumber != null) return 1;
      return a._sortIndex - b._sortIndex;
    })
    .map(
      ({
        _sortPriority: _ignoredPriority,
        _sortIndex: _ignoredIndex,
        ...step
      }) => step
    );

  if (flagShapes.length > 0) {
    const flagMinutes = flagShapes.reduce((sum, shape) => {
      const profile = getSetupProfile(shape);
      return sum + profile.placeMinutes;
    }, 0);
    obstacleSteps.push({
      id: "flags-final-pass",
      stepType: "group",
      kind: "Track group",
      label: "Flags final pass",
      note: "Finish the field with flag markers and final visibility checks once the main numbered obstacle line is in place.",
      complexity: "light",
      estimatedMinutes: Math.max(2, Math.round(flagMinutes * 0.9)),
      obstacleNumber: null,
    });
  }

  if (coneShapes.length > 0) {
    const coneMinutes = coneShapes.reduce((sum, shape) => {
      const profile = getSetupProfile(shape);
      return sum + profile.placeMinutes;
    }, 0);
    obstacleSteps.push({
      id: "cones-track-walk",
      stepType: "group",
      kind: "Track group",
      label: "Cone placement during track walk (optional)",
      note: "Cones can be placed during the pilot track walk to avoid a separate pass. If you prefer to set them earlier, allow a little extra time on site.",
      complexity: "light",
      estimatedMinutes: Math.max(2, Math.round(coneMinutes * 0.6)),
      obstacleNumber: null,
    });
  }

  const gatesToPrep = shapes.filter(isSetupHardObstacle).length;
  const softGoodsToPrep = shapes.filter(
    (shape) => shape.kind === "flag"
  ).length;
  const coneCount = shapes.filter((shape) => shape.kind === "cone").length;
  const heavyObstacleCount = shapes.filter(
    (shape) => getSetupProfile(shape).complexity === "heavy"
  ).length;

  const prepSteps: SetupStep[] = [
    {
      id: "crew-unload-stage",
      stepType: "crew",
      kind: "Crew",
      label: "Unload and stage equipment",
      note: "Unload the vehicle, sort anchors and hardware, and lay out the kit so frame prep does not block field placement later.",
      complexity: "standard",
      estimatedMinutes: 6,
      obstacleNumber: null,
    },
  ];

  if (gatesToPrep > 0 || softGoodsToPrep > 0) {
    prepSteps.push({
      id: "crew-preassemble",
      stepType: "crew",
      kind: "Crew",
      label: "Pre-assemble frames and soft goods",
      note:
        softGoodsToPrep > 0
          ? "Prep PVC gate frames and beach flags before walking items onto the field so the placement pass can stay focused on spacing."
          : "Prep PVC gate frames before walking items onto the field so the placement pass can stay focused on spacing.",
      complexity: gatesToPrep >= 4 ? "standard" : "light",
      estimatedMinutes: Math.max(
        5,
        Math.round(gatesToPrep * 1.1 + softGoodsToPrep + coneCount * 0.15)
      ),
      obstacleNumber: null,
    });
  }

  if (heavyObstacleCount > 0) {
    prepSteps.push({
      id: "crew-rigging-check",
      stepType: "crew",
      kind: "Crew",
      label: "Rigging and anchor check",
      note: "Confirm anchor points, overhead lines, and the clearance plan before lifting or suspending heavier structures.",
      complexity: "standard",
      estimatedMinutes: Math.max(2, heavyObstacleCount * 2),
      obstacleNumber: null,
    });
  }

  const steps = [...prepSteps, ...obstacleSteps];

  const prepElapsedMinutes = prepSteps.reduce(
    (sum, step) => sum + step.estimatedMinutes,
    0
  );
  const obstacleWorkMinutes = obstacleSteps.reduce(
    (sum, step) => sum + step.estimatedMinutes,
    0
  );
  const coordinationMinutes = Math.max(3, Math.round(shapes.length * 0.3));
  const estimatedElapsedRange: [number, number] = [
    prepElapsedMinutes +
      coordinationMinutes +
      Math.max(4, Math.round(obstacleWorkMinutes / 3.6)),
    prepElapsedMinutes +
      coordinationMinutes +
      Math.max(6, Math.round(obstacleWorkMinutes / 2.8)),
  ];
  const estimatedElapsedMinutes = Math.round(
    (estimatedElapsedRange[0] + estimatedElapsedRange[1]) / 2
  );
  const complexityLabel = getComplexityLabel(estimatedElapsedMinutes);
  const heavyCount = obstacleSteps.filter(
    (step) => step.complexity === "heavy"
  ).length;
  const summary =
    heavyCount > 0
      ? `${heavyCount} higher-effort structure${heavyCount === 1 ? "" : "s"} should be placed and secured before the standard gate pass. The timing assumes a typical 2-3 person crew and may increase when overhead rigging or long carry distances are involved.`
      : "Most of the setup time comes from unloading, pre-assembling frames, and then placing the numbered obstacle line cleanly with a 2-3 person crew.";

  return {
    steps,
    estimatedElapsedMinutes,
    estimatedElapsedRange,
    crewAssumption:
      "Timing is based on a typical 2-3 person crew and assumes standard club-style prep: unload, stage, pre-assemble, then place and secure.",
    complexityLabel,
    summary,
  };
}
