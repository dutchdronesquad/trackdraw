"use client";

import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import Toolbar from "./Toolbar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import TrackCanvas from "./TrackCanvas";
import Inspector from "./Inspector";
import ElevationPanel from "./ElevationPanel";

export default function EditorShell() {
  const { design, updateDesignMeta, updateField } = useEditor();

  const lastUpdatedLabel = useMemo(() => {
    if (!design.updatedAt) return "Recent";
    try {
      const date = new Date(design.updatedAt);
      return new Intl.DateTimeFormat("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Recent";
    }
  }, [design.updatedAt]);

  return (
    <div className="flex h-full min-h-0 bg-gradient-to-br from-slate-100 via-slate-200/60 to-slate-100">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Toolbar />
      </div>
      {/* Mobile sheet trigger */}
      <Sheet>
        <div className="md:hidden absolute left-3 top-3 z-40 flex items-center gap-2">
          <SheetTrigger>
            <Button size="icon" variant="secondary" className="shadow-md">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <div className="text-xs font-semibold tracking-wide uppercase text-slate-500 bg-white/70 rounded-md px-2 py-1 shadow">TrackDraw</div>
        </div>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>TrackDraw</SheetTitle>
            <SheetClose>
              <Button size="sm" variant="ghost">Sluit</Button>
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <Toolbar embedMode />
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="min-w-[220px] flex-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              TrackDraw project
            </label>
            <Input
              className="mt-1 font-semibold text-base"
              value={design.title}
              onChange={(e) => updateDesignMeta({ title: e.target.value })}
              aria-label="Track title"
              placeholder="Naam van je track"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                {design.shapes.length} element{design.shapes.length === 1 ? "" : "en"}
              </span>
              <span>Laatste wijziging {lastUpdatedLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm">
            <label className="flex flex-col gap-1">
              <span className="uppercase tracking-wide">Breedte (m)</span>
              <Input type="number" min={5} step={0.5} className="w-24" value={design.field.width} onChange={(e) => updateField({ width: Number(e.target.value) })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="uppercase tracking-wide">Lengte (m)</span>
              <Input type="number" min={5} step={0.5} className="w-24" value={design.field.height} onChange={(e) => updateField({ height: Number(e.target.value) })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="uppercase tracking-wide">Grid (m)</span>
              <Input type="number" min={0.5} step={0.5} className="w-20" value={design.field.gridStep} onChange={(e) => updateField({ gridStep: Number(e.target.value) })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="uppercase tracking-wide">Schaal (px/m)</span>
              <Input type="number" min={10} max={200} step={5} className="w-24" value={design.field.ppm} onChange={(e) => updateField({ ppm: Number(e.target.value) })} />
            </label>
            <div className="pl-2 flex items-center h-full self-end">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          <div className="relative flex-1 overflow-auto bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 p-6">
            <div className="inline-block min-w-[360px] rounded-2xl border border-slate-300/80 bg-white shadow-xl">
              <TrackCanvas />
            </div>
          </div>
          <aside className="flex w-80 min-w-[18rem] flex-col border-l border-slate-200 bg-white/95 backdrop-blur-sm shadow-inner min-h-0">
            <Inspector />
            <ElevationPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
