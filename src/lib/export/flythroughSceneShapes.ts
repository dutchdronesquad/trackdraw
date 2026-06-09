import * as THREE from "three";
import type {
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  Shape,
  ShapeKind,
  StartFinishShape,
  TowerShape,
} from "@/lib/types";
import { addGateSceneShapes } from "./flythrough/gate";
import { addTowerSceneShapes } from "./flythrough/tower";
import { addLadderSceneShapes } from "./flythrough/ladder";
import { addStartFinishSceneShapes } from "./flythrough/startfinish";
import { addDiveGateSceneShapes } from "./flythrough/divegate";
import { addFlagSceneShapes } from "./flythrough/flag";
import { addConeSceneShapes } from "./flythrough/cone";

type FlythroughRenderer = (
  shape: Shape,
  scene: THREE.Scene
) => Promise<void> | void;

const flythroughRenderers: Record<ShapeKind, FlythroughRenderer> = {
  gate: (shape, scene) => addGateSceneShapes(shape as GateShape, scene),
  tower: (shape, scene) => addTowerSceneShapes(shape as TowerShape, scene),
  ladder: (shape, scene) => addLadderSceneShapes(shape as LadderShape, scene),
  startfinish: (shape, scene) =>
    addStartFinishSceneShapes(shape as StartFinishShape, scene),
  divegate: (shape, scene) =>
    addDiveGateSceneShapes(shape as DiveGateShape, scene),
  flag: (shape, scene) => addFlagSceneShapes(shape as FlagShape, scene),
  cone: (shape, scene) => addConeSceneShapes(shape as ConeShape, scene),
  label: () => undefined,
  polyline: () => undefined,
};

export async function addFlythroughShapes(
  scene: THREE.Scene,
  shapes: Shape[]
): Promise<void> {
  for (const shape of shapes) {
    await flythroughRenderers[shape.kind](shape, scene);
  }
}
