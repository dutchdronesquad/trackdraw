"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/store/editor";
import { exportSvg } from "@/lib/export/exportSvg";
import { exportPng } from "@/lib/export/exportPng";
import { cn } from "@/lib/utils";
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
    <p className="text-muted-foreground/40 px-1 pb-1 text-[9px] font-bold tracking-[0.14em] uppercase select-none">
      {children}
    </p>
  );
}

function ThemeToggle({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (v: Theme) => void;
}) {
  return (
    <div className="border-border/60 flex shrink-0 items-center gap-0.5 rounded-md border p-0.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onChange("dark");
        }}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded transition-colors",
          value === "dark"
            ? "bg-muted text-foreground"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
      >
        <Moon className="size-3" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onChange("light");
        }}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded transition-colors",
          value === "light"
            ? "bg-muted text-foreground"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
      >
        <Sun className="size-3" />
      </button>
    </div>
  );
}

function FormatRow({
  ext,
  label,
  color,
  description,
  theme,
  onThemeChange,
  busy,
  onExport,
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
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        busy
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-muted/40 cursor-pointer"
      )}
      onClick={busy ? undefined : onExport}
    >
      <span
        className={cn(
          "w-8 shrink-0 rounded py-0.5 text-center font-mono text-[10px] font-bold",
          color
        )}
      >
        {ext}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm leading-none font-medium">
          {label}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          {description}
        </p>
      </div>
      {theme && onThemeChange && (
        <ThemeToggle value={theme} onChange={onThemeChange} />
      )}
      {busy ? (
        <Loader2 className="text-muted-foreground size-3.5 shrink-0 animate-spin" />
      ) : (
        <Download className="text-muted-foreground/30 group-hover:text-muted-foreground size-3.5 shrink-0 transition-colors" />
      )}
    </div>
  );
}

export default function ExportDialog({
  open,
  onOpenChange,
  canvasRef,
  preview3DRef,
}: ExportDialogProps) {
  const design = useEditor((s) => s.design);
  const [busy, setBusy] = useState<string | null>(null);
  const [pngTheme, setPngTheme] = useState<Theme>("dark");
  const [svgTheme, setSvgTheme] = useState<Theme>("dark");
  const [filename, setFilename] = useState("");

  const safeName = (suffix = "") => {
    const base = (filename.trim() || design.title.trim() || "track").replace(
      /[^a-z0-9-_]+/gi,
      "_"
    );
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
          <DialogDescription>
            Export the current track as a 2D file or 3D render.
          </DialogDescription>
        </DialogHeader>

        {/* Filename */}
        <div className="border-border/60 bg-muted/20 mb-1 flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-muted-foreground shrink-0 text-xs">
            Filename
          </span>
          <input
            type="text"
            placeholder={design.title.trim() || "track"}
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="text-foreground placeholder:text-muted-foreground/40 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="space-y-4">
          {/* 2D */}
          <div>
            <SectionLabel>2D</SectionLabel>
            <div className="border-border/50 divide-border/40 divide-y overflow-hidden rounded-xl border">
              <FormatRow
                ext="PNG"
                label="Image"
                color="bg-sky-500/15 text-sky-400"
                description="High-res raster (2×)"
                theme={pngTheme}
                onThemeChange={setPngTheme}
                busy={busy === "png"}
                onExport={() =>
                  run("png", () =>
                    exportPng(design, `${safeName()}.png`, pngTheme)
                  )
                }
              />
              <FormatRow
                ext="SVG"
                label="Vector"
                color="bg-purple-500/15 text-purple-400"
                description="Scalable vector, opens in Illustrator / Inkscape"
                theme={svgTheme}
                onThemeChange={setSvgTheme}
                busy={busy === "svg"}
                onExport={() =>
                  run("svg", () =>
                    exportSvg(design, `${safeName()}.svg`, svgTheme)
                  )
                }
              />
              <FormatRow
                ext="PDF"
                label="Document"
                color="bg-red-500/15 text-red-400"
                description="A4 page with title and field dimensions"
                busy={busy === "pdf"}
                onExport={() =>
                  run("pdf", async () => {
                    const stage = canvasRef.current?.getStage();
                    if (!stage) throw new Error("Canvas not ready");
                    const { exportPdf } =
                      await import("@/lib/export/exportPdf");
                    await exportPdf(stage, design, `${safeName()}.pdf`);
                  })
                }
              />
            </div>
          </div>

          {/* 3D */}
          <div>
            <SectionLabel>3D</SectionLabel>
            <div className="border-border/50 overflow-hidden rounded-xl border">
              <FormatRow
                ext="PNG"
                label="3D Render"
                color="bg-orange-500/15 text-orange-400"
                description="Screenshot of the current 3D view"
                busy={busy === "3d"}
                onExport={() =>
                  run("3d", () => {
                    const dataUrl = preview3DRef?.current?.screenshot();
                    if (!dataUrl)
                      throw new Error(
                        "3D view not available — open the 3D tab first"
                      );
                    const a = document.createElement("a");
                    a.href = dataUrl;
                    a.download = `${safeName("3d")}.png`;
                    a.click();
                  })
                }
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <SectionLabel>Project</SectionLabel>
            <div className="border-border/50 overflow-hidden rounded-xl border">
              <FormatRow
                ext="JSON"
                label="Project File"
                color="bg-emerald-500/15 text-emerald-400"
                description="Import this file back into TrackDraw later"
                busy={busy === "json"}
                onExport={() =>
                  run("json", () => {
                    const blob = new Blob([JSON.stringify(design, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${safeName()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                }
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
