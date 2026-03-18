import type {
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LabelShape,
  LadderShape,
  ShapeDraft,
  ShapeKind,
  StartFinishShape,
} from "@/lib/types";

export type EditorTool =
  | "select"
  | "grab"
  | "gate"
  | "flag"
  | "cone"
  | "label"
  | "polyline"
  | "startfinish"
  | "ladder"
  | "divegate";

type ToolShapeDefaults = {
  gate: Pick<GateShape, "width" | "height" | "thick" | "color">;
  flag: Pick<FlagShape, "radius" | "poleHeight" | "color">;
  cone: Pick<ConeShape, "radius" | "color">;
  label: Pick<LabelShape, "text" | "fontSize" | "color">;
  startfinish: Pick<StartFinishShape, "width" | "color">;
  ladder: Pick<LadderShape, "width" | "height" | "rungs" | "color">;
  divegate: Pick<
    DiveGateShape,
    "size" | "thick" | "tilt" | "elevation" | "color"
  >;
};

export const shapeKindLabels: Record<ShapeKind, string> = {
  gate: "Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Race Line",
  startfinish: "Start / Finish",
  ladder: "Ladder",
  divegate: "Dive Gate",
};

export const toolLabels: Record<EditorTool, string> = {
  select: "Select",
  grab: "Grab",
  gate: "Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Path",
  startfinish: "Start Pads",
  ladder: "Ladder",
  divegate: "Dive Gate",
};

export const toolShortcuts: Partial<Record<EditorTool, string>> = {
  select: "V",
  grab: "H",
  gate: "G",
  flag: "F",
  cone: "C",
  label: "L",
  polyline: "P",
  startfinish: "S",
  ladder: "R",
  divegate: "D",
};

const toolShapeDefaults: ToolShapeDefaults = {
  gate: { width: 1.5, height: 1.5, thick: 0.2, color: "#3b82f6" },
  flag: { radius: 0.25, poleHeight: 3.5, color: "#a855f7" },
  cone: { radius: 0.2, color: "#f97316" },
  label: { text: "Gate A", fontSize: 18, color: "#e2e8f0" },
  startfinish: { width: 3, color: "#f59e0b" },
  ladder: { width: 1.5, height: 4.5, rungs: 3, color: "#14b8a6" },
  divegate: {
    size: 2.8,
    thick: 0.2,
    tilt: 0,
    elevation: 3,
    color: "#f97316",
  },
};

export function createShapeForTool(
  tool: EditorTool,
  point: { x: number; y: number }
): ShapeDraft | null {
  switch (tool) {
    case "gate":
      return {
        kind: "gate",
        x: point.x,
        y: point.y,
        rotation: 0,
        ...toolShapeDefaults.gate,
      };
    case "flag":
      return {
        kind: "flag",
        x: point.x,
        y: point.y,
        rotation: 0,
        ...toolShapeDefaults.flag,
      };
    case "cone":
      return {
        kind: "cone",
        x: point.x,
        y: point.y,
        rotation: 0,
        ...toolShapeDefaults.cone,
      };
    case "label":
      return {
        kind: "label",
        x: point.x,
        y: point.y,
        rotation: 0,
        ...toolShapeDefaults.label,
      };
    case "startfinish":
      return {
        kind: "startfinish",
        x: point.x,
        y: point.y,
        rotation: 0,
        ...toolShapeDefaults.startfinish,
      };
    case "ladder":
      return {
        kind: "ladder",
        x: point.x,
        y: point.y,
        rotation: 0,
        ...toolShapeDefaults.ladder,
      };
    case "divegate":
      return {
        kind: "divegate",
        x: point.x,
        y: point.y,
        rotation: 0,
        ...toolShapeDefaults.divegate,
      };
    case "select":
    case "grab":
    case "polyline":
      return null;
  }
}
