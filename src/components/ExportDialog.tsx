"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEditor } from "@/store/editor";
import { exportSvg } from "@/lib/export/exportSvg";
import { exportPng } from "@/lib/export/exportPng";
import { cn } from "@/lib/utils";
import { exportPdf } from "@/lib/export/exportPdf";
import type { TrackCanvasHandle } from "@/components/TrackCanvas";
import { Download, Loader2, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import type { TrackPreview3DHandle } from "@/components/TrackPreview3D";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<TrackCanvasHandle | null>;
  preview3DRef?: React.RefObject<TrackPreview3DHandle | null>;
}

type Theme = "dark" | "light";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40 px-1 pb-1 select-none">
      {children}
    </p>
  );
}

function ThemeToggle({ value, onChange }: { value: Theme; onChange: (v: Theme) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5 shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); onChange("dark"); }}
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded transition-colors",
          value === "dark" ? "bg-muted text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
      >
        <Moon className="size-3" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onChange("light"); }}
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded transition-colors",
          value === "light" ? "bg-muted text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
      >
        <Sun className="size-3" />
      </button>
    </div>
  );
}

function FormatRow({
  ext, label, color, description, theme, onThemeChange, busy, onExport,
}: {
  ext: string;
  label: string;
  color: string;
  description: string;
  theme?: Theme;
  onThemeChange?: (v: Theme) => void;
  busy: boolean;
  onExport: () => void;
}) {
  return (
    <div
      className={cn(
        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors group",
        busy ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/40 cursor-pointer"
      )}
      onClick={busy ? undefined : onExport}
    >
      <span className={cn("text-[10px] font-bold font-mono w-8 shrink-0 text-center py-0.5 rounded", color)}>
        {ext}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-none">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      {theme && onThemeChange && (
        <ThemeToggle value={theme} onChange={onThemeChange} />
      )}
      {busy
        ? <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
        : <Download className="size-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
      }
    </div>
  );
}

export default function ExportDialog({ open, onOpenChange, canvasRef, preview3DRef }: ExportDialogProps) {
  const design = useEditor((s) => s.design);
  const [busy, setBusy] = useState<string | null>(null);
  const [pngTheme, setPngTheme] = useState<Theme>("dark");
  const [svgTheme, setSvgTheme] = useState<Theme>("dark");
  const [filename, setFilename] = useState("");

  const safeName = (suffix = "") => {
    const base = (filename.trim() || design.title.trim() || "track").replace(/[^a-z0-9-_]+/gi, "_");
    const dims = `${design.field.width}x${design.field.height}m`;
    const date = new Date().toISOString().slice(0, 10);
    return [base, dims, date, suffix].filter(Boolean).join("_");
  };

  const run = async (id: string, fn: () => void | Promise<void>) => {
    setBusy(id);
    try {
      await fn();
      toast.success("Exported");
      onOpenChange(false);
    } catch (err) {
      toast.error(`Export failed: ${String(err)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>

        {/* Filename */}
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 mb-1">
          <span className="text-xs text-muted-foreground shrink-0">Filename</span>
          <input
            type="text"
            placeholder={design.title.trim() || "track"}
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none min-w-0"
          />
        </div>

        <div className="space-y-4">
          {/* 2D */}
          <div>
            <SectionLabel>2D</SectionLabel>
            <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/40">
              <FormatRow
                ext="PNG" label="Image" color="bg-sky-500/15 text-sky-400"
                description="High-res raster (2×)"
                theme={pngTheme} onThemeChange={setPngTheme}
                busy={busy === "png"}
                onExport={() => run("png", () => exportPng(design, `${safeName()}.png`, pngTheme))}
              />
              <FormatRow
                ext="SVG" label="Vector" color="bg-purple-500/15 text-purple-400"
                description="Scalable vector, opens in Illustrator / Inkscape"
                theme={svgTheme} onThemeChange={setSvgTheme}
                busy={busy === "svg"}
                onExport={() => run("svg", () => exportSvg(design, `${safeName()}.svg`, svgTheme))}
              />
              <FormatRow
                ext="PDF" label="Document" color="bg-red-500/15 text-red-400"
                description="A4 page with title and field dimensions"
                busy={busy === "pdf"}
                onExport={() => run("pdf", async () => {
                  const stage = canvasRef.current?.getStage();
                  if (!stage) throw new Error("Canvas not ready");
                  await exportPdf(stage, design, `${safeName()}.pdf`);
                })}
              />
            </div>
          </div>

          {/* 3D */}
          <div>
            <SectionLabel>3D</SectionLabel>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <FormatRow
                ext="PNG" label="3D Render" color="bg-orange-500/15 text-orange-400"
                description="Screenshot of the current 3D view"
                busy={busy === "3d"}
                onExport={() => run("3d", () => {
                  const dataUrl = preview3DRef?.current?.screenshot();
                  if (!dataUrl) throw new Error("3D view not available — open the 3D tab first");
                  const a = document.createElement("a");
                  a.href = dataUrl;
                  a.download = `${safeName("3d")}.png`;
                  a.click();
                })}
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <SectionLabel>Project</SectionLabel>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <FormatRow
                ext="JSON" label="Project File" color="bg-emerald-500/15 text-emerald-400"
                description="Import this file back into TrackDraw later"
                busy={busy === "json"}
                onExport={() => run("json", () => {
                  const blob = new Blob([JSON.stringify(design, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${safeName()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                })}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
