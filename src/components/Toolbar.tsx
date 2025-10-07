"use client";

import { ChangeEvent, useRef } from "react";
import { EditorTool, useEditor } from "@/store/editor";
import type { TrackDesign } from "@/lib/types";

const tools: Array<{
  id: EditorTool;
  label: string;
  hint: string;
  description: string;
}> = [
  {
    id: "select",
    label: "Select",
    hint: "V",
    description: "Move, rotate & edit existing elements",
  },
  {
    id: "gate",
    label: "Gate",
    hint: "G",
    description: "Place rectangular gates (width × height)",
  },
  {
    id: "flag",
    label: "Flag",
    hint: "F",
    description: "Add flag markers with pole height",
  },
  {
    id: "cone",
    label: "Cone",
    hint: "C",
    description: "Drop an apex marker/cone",
  },
  {
    id: "label",
    label: "Label",
    hint: "L",
    description: "Place text labels for pilots",
  },
  {
    id: "polyline",
    label: "Path",
    hint: "P",
    description: "Click to sketch race line, double-click to finish",
  },
];

export default function Toolbar({ embedMode = false }: { embedMode?: boolean }) {
  const {
    design,
    activeTool,
    setActiveTool,
    setSelection,
    replaceDesign,
  } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = design.title.trim() || "track";
    a.download = safeName.replace(/[^a-z0-9-_]+/gi, "_") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((content) => {
      try {
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== "object") throw new Error();
        replaceDesign(parsed as TrackDesign);
      } catch (err) {
        console.error("Failed to import design", err);
        alert("Kon het bestand niet inladen. Controleer of het een geldige TrackDraw export is.");
      } finally {
        event.target.value = "";
      }
    });
  };

  return (
    <aside className={
      `flex w-64 min-w-[14rem] flex-col bg-white/90 backdrop-blur ${
        embedMode ? 'border-slate-200' : 'border-r border-slate-200'
      }`
    }>
      <div className="border-b border-slate-200/70 px-4 py-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          TrackDraw
        </div>
        <div className="mt-1 text-lg font-semibold text-slate-900">Ontwerpstudio</div>
        <p className="mt-1 text-xs text-slate-500">
          Kies een tool en klik op het veld om gates, pylons en een vlieglijn te plaatsen.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tools
        </div>
        <div className="mt-3 grid gap-2">
          {tools.map((tool) => {
            const active = tool.id === activeTool;
            return (
              <button
                key={tool.id}
                className={`flex flex-col rounded-lg border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                  active
                    ? "border-sky-400 bg-sky-50 text-slate-900"
                    : "border-transparent bg-slate-100/70 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
                onClick={() => {
                  setSelection([]);
                  setActiveTool(tool.id);
                }}
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{tool.label}</span>
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-tight text-slate-600">
                    {tool.hint}
                  </span>
                </div>
                <div className="mt-1 text-[11px] leading-tight text-slate-500">
                  {tool.description}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bestand
          </div>
          <div className="mt-3 grid gap-2">
            <button
              className="rounded-lg border border-transparent bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onClick={exportJson}
            >
              Exporteren (JSON)
            </button>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
              onClick={() => fileInputRef.current?.click()}
            >
              Importeren
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={importJson}
            />
          </div>
          <p className="mt-3 text-[11px] leading-snug text-slate-500">
            Tip: gebruik de Path tool om de vlieglijn te tekenen. Dubbelklik om af te ronden, Esc om te annuleren.
          </p>
        </div>
      </div>
      <div className="px-4 pb-5 text-[11px] text-slate-400">
        Sneltoetsen: V Select · G Gate · F Flag · C Cone · L Label · P Path
      </div>
    </aside>
  );
}
