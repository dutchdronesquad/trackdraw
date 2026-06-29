import {
  getShapeKindLabel,
  getTrackItemAdapter,
  isSetupHardObstacle,
  type SetupComplexity,
  type SetupProfile,
  type Translate,
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
  complexityLabel: string;
  summary: string;
};

function getSetupProfile(shape: Shape, t: Translate): SetupProfile {
  return getTrackItemAdapter(shape.kind).getSetupProfile(shape, t);
}

function getDisplayLabel(shape: Shape, tShapes: Translate) {
  const customName = shape.name?.trim();
  return customName ? customName : getShapeKindLabel(shape.kind, tShapes);
}

function getComplexityLabel(totalMinutes: number, t: Translate) {
  if (totalMinutes >= 70) return t("complexity.heavy");
  if (totalMinutes >= 35) return t("complexity.standard");
  return t("complexity.light");
}

export function buildSetupPlan(
  design: TrackDesign,
  t: Translate,
  tShapes: Translate
): SetupPlan {
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
      const profile = getSetupProfile(shape, t);
      const obstacleNumber =
        isNumberedObstacle(shape) && obstacleNumberMap.has(shape.id)
          ? (obstacleNumberMap.get(shape.id) ?? null)
          : null;

      return {
        id: shape.id,
        stepType: "item" as const,
        kind: getShapeKindLabel(shape.kind, tShapes),
        label: getDisplayLabel(shape, tShapes),
        note:
          obstacleNumber != null
            ? t("obstacleNoteWithNumber", {
                note: profile.note,
                number: obstacleNumber,
              })
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
      const profile = getSetupProfile(shape, t);
      return sum + profile.placeMinutes;
    }, 0);
    obstacleSteps.push({
      id: "flags-final-pass",
      stepType: "group",
      kind: t("kinds.trackGroup"),
      label: t("flagsFinalPass.label"),
      note: t("flagsFinalPass.note"),
      complexity: "light",
      estimatedMinutes: Math.max(2, Math.round(flagMinutes * 0.9)),
      obstacleNumber: null,
    });
  }

  if (coneShapes.length > 0) {
    const coneMinutes = coneShapes.reduce((sum, shape) => {
      const profile = getSetupProfile(shape, t);
      return sum + profile.placeMinutes;
    }, 0);
    obstacleSteps.push({
      id: "cones-track-walk",
      stepType: "group",
      kind: t("kinds.trackGroup"),
      label: t("conesTrackWalk.label"),
      note: t("conesTrackWalk.note"),
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
    (shape) => getSetupProfile(shape, t).complexity === "heavy"
  ).length;

  const prepSteps: SetupStep[] = [
    {
      id: "crew-unload-stage",
      stepType: "crew",
      kind: t("kinds.crew"),
      label: t("crewUnloadStage.label"),
      note: t("crewUnloadStage.note"),
      complexity: "standard",
      estimatedMinutes: 6,
      obstacleNumber: null,
    },
  ];

  if (gatesToPrep > 0 || softGoodsToPrep > 0) {
    prepSteps.push({
      id: "crew-preassemble",
      stepType: "crew",
      kind: t("kinds.crew"),
      label: t("crewPreassemble.label"),
      note:
        softGoodsToPrep > 0
          ? t("crewPreassemble.noteWithSoftGoods")
          : t("crewPreassemble.noteWithoutSoftGoods"),
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
      kind: t("kinds.crew"),
      label: t("crewRiggingCheck.label"),
      note: t("crewRiggingCheck.note"),
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
  const complexityLabel = getComplexityLabel(estimatedElapsedMinutes, t);
  const heavyCount = obstacleSteps.filter(
    (step) => step.complexity === "heavy"
  ).length;
  const summary =
    heavyCount > 0
      ? t("summaryHeavy", { count: heavyCount })
      : t("summaryLight");

  return {
    steps,
    estimatedElapsedMinutes,
    estimatedElapsedRange,
    crewAssumption: t("crewAssumption"),
    complexityLabel,
    summary,
  };
}
