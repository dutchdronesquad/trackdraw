"use client";
import { useEditor } from "@/store/editor";

export default function Toolbar() {
  const { addShape, design } = useEditor();

  const addGate = () =>
    addShape({
      kind: "gate",
      x: 2,
      y: 2,
      rotation: 0,
      width: 1.5,
      height: 1.2,
      color: "#1f2937",
    } as any);
  const addFlag = () =>
    addShape({
      kind: "flag",
      x: 3,
      y: 3,
      rotation: 0,
      radius: 0.2,
      poleHeight: 2.2,
      color: "#7c3aed",
    } as any);
  const addCone = () =>
    addShape({
      kind: "cone",
      x: 4,
      y: 4,
      rotation: 0,
      radius: 0.15,
      color: "#f59e0b",
    } as any);
  const addLabel = () =>
    addShape({
      kind: "label",
      x: 1,
      y: 1,
      rotation: 0,
      text: "Start",
      color: "#111827",
    } as any);
  const addPath = () =>
    addShape({
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 1, y: 1, z: 0 },
        { x: 5, y: 1, z: 0.5 },
        { x: 8, y: 4, z: 0.2 },
        { x: 12, y: 7, z: 1.0 },
      ],
      strokeWidth: 0.15,
      showArrows: true,
      color: "#0ea5e9",
    } as any);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = design.title.trim().replaceAll(" ", "_") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2 p-2 border-b bg-white">
      <button className="btn" onClick={addGate}>
        + Gate
      </button>
      <button className="btn" onClick={addFlag}>
        + Flag
      </button>
      <button className="btn" onClick={addCone}>
        + Cone
      </button>
      <button className="btn" onClick={addLabel}>
        + Label
      </button>
      <button className="btn" onClick={addPath}>
        + Path
      </button>
      <div className="ml-auto" />
      <button className="btn" onClick={exportJson}>
        Export JSON
      </button>
    </div>
  );
}
