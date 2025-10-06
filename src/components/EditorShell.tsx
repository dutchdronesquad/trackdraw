"use client";
import Toolbar from "./Toolbar";
import TrackCanvas from "./TrackCanvas";
import Inspector from "./Inspector";
import ElevationPanel from "./ElevationPanel";

export default function EditorShell() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-2">
          <TrackCanvas />
        </div>
        <aside className="w-80 border-l bg-white overflow-auto flex flex-col">
          <Inspector />
          <ElevationPanel />
        </aside>
      </div>
    </div>
  );
}
