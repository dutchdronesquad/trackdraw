"use client";

import { useEffect, useState } from "react";
import { MobileDrawer } from "@/components/MobileDrawer";
import { DesktopModal } from "@/components/DesktopModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEditor } from "@/store/editor";
import { exportSvg } from "@/lib/export/exportSvg";
import { exportPng } from "@/lib/export/exportPng";
import { cn } from "@/lib/utils";
import type { TrackCanvasHandle } from "@/components/canvas/TrackCanvas";
import { Download, Loader2, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import type { TrackPreview3DHandle } from "@/components/canvas/TrackPreview3D";
import { useTheme } from "@/hooks/useTheme";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<TrackCanvasHandle | null>;
  preview3DRef?: React.RefObject<TrackPreview3DHandle | null>;
  activeTab?: "2d" | "3d";
  onRequest3DView?: () => void;
}

type Theme = "dark" | "light";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground/60 pb-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase select-none">
      {children}
    </p>
  );
}

function ExportThemeToggle({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (v: Theme) => void;
}) {
  return (
    <div className="border-border/50 bg-muted/28 flex shrink-0 items-center gap-1.5 rounded-2xl border p-1">
      {(["dark", "light"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-[0.8rem] border px-3 py-2.5 text-[11px] font-medium tracking-wide uppercase transition-colors",
            value === t
              ? "border-primary/30 bg-primary/12 text-primary shadow-xs"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground border-transparent"
          )}
        >
          {t === "dark" ? (
            <Moon className="size-3.5 shrink-0" />
          ) : (
            <Sun className="size-3.5 shrink-0" />
          )}
          {t}
        </button>
      ))}
    </div>
  );
}

function FormatTile({
  ext,
  label,
  color,
  description,
  note,
  busy,
  disabled,
  onExport,
}: {
  ext: string;
  label: string;
  color: string;
  description: string;
  note?: React.ReactNode;
  busy: boolean;
  disabled?: boolean;
  onExport: () => void;
}) {
  const inactive = busy || disabled;
  return (
    <div
      role="button"
      tabIndex={inactive ? -1 : 0}
      onClick={inactive ? undefined : onExport}
      onKeyDown={
        inactive
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") onExport();
            }
      }
      className={cn(
        "group border-border/40 flex h-full w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all",
        inactive
          ? "cursor-not-allowed opacity-40"
          : "hover:border-border/60 hover:bg-muted/20 cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide",
            color
          )}
        >
          {ext}
        </span>
        {busy ? (
          <Loader2 className="text-muted-foreground/65 size-3.5 shrink-0 animate-spin" />
        ) : (
          <Download className="text-muted-foreground/40 group-hover:text-muted-foreground/60 size-3.5 shrink-0 transition-colors" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-foreground text-sm font-medium">{label}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {description}
        </p>
      </div>
      {note && <div className="mt-auto">{note}</div>}
    </div>
  );
}

export default function ExportDialog({
  open,
  onOpenChange,
  canvasRef,
  preview3DRef,
  activeTab,
  onRequest3DView,
}: ExportDialogProps) {
  const design = useEditor((s) => s.design);
  const currentTheme = useTheme();
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState<string | null>(null);
  const [exportTheme, setExportTheme] = useState<Theme>("dark");
  const [filename, setFilename] = useState("");

  useEffect(() => {
    setExportTheme(currentTheme);
  }, [currentTheme]);

  const safeName = ({ theme, view }: { theme?: Theme; view: "2d" | "3d" }) => {
    const base = (filename.trim() || design.title.trim() || "track").replace(
      /[^a-z0-9-_]+/gi,
      "_"
    );
    return [base, view, theme].filter(Boolean).join("_");
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

  const settingsBar = (
    <div className="flex items-center gap-3">
      <div className="border-border/50 flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3.5 py-2.5">
        <span className="text-muted-foreground/60 shrink-0 text-xs font-medium">
          Filename
        </span>
        <input
          type="text"
          placeholder={design.title.trim() || "track"}
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="text-foreground placeholder:text-muted-foreground/45 min-w-0 flex-1 bg-transparent text-sm outline-hidden"
        />
      </div>
      <ExportThemeToggle value={exportTheme} onChange={setExportTheme} />
    </div>
  );

  const desktopGrid = (
    <div className="space-y-6">
      <div>
        <SectionLabel>2D</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <FormatTile
            ext="PNG"
            label="Image"
            color="bg-sky-500/15 text-sky-400"
            description="High-resolution raster at 2× pixel density. Great for sharing or printing."
            busy={busy === "png"}
            onExport={() =>
              run("png", () =>
                exportPng(
                  design,
                  `${safeName({ view: "2d", theme: exportTheme })}.png`,
                  exportTheme
                )
              )
            }
          />
          <FormatTile
            ext="SVG"
            label="Vector"
            color="bg-purple-500/15 text-purple-400"
            description="Infinitely scalable. Opens in Illustrator, Inkscape, or any browser."
            busy={busy === "svg"}
            onExport={() =>
              run("svg", () =>
                exportSvg(
                  design,
                  `${safeName({ view: "2d", theme: exportTheme })}.svg`,
                  exportTheme
                )
              )
            }
          />
          <FormatTile
            ext="PDF"
            label="Document"
            color="bg-red-500/15 text-red-400"
            description={`A4 print-ready document using the current ${currentTheme} canvas theme.`}
            busy={busy === "pdf"}
            onExport={() =>
              run("pdf", async () => {
                const stage = canvasRef.current?.getStage();
                if (!stage) throw new Error("Canvas not ready");
                const { exportPdf } = await import("@/lib/export/exportPdf");
                await exportPdf(
                  stage,
                  design,
                  `${safeName({ view: "2d", theme: currentTheme })}.pdf`
                );
              })
            }
          />
        </div>
      </div>

      <div>
        <SectionLabel>3D &amp; Project</SectionLabel>
        {activeTab !== "3d" && onRequest3DView && (
          <button
            type="button"
            onClick={onRequest3DView}
            className="border-border/40 bg-muted/20 hover:bg-muted/35 mb-3 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
          >
            <p className="text-muted-foreground text-xs leading-relaxed">
              Switch to the 3D view to enable the 3D render export.
            </p>
            <span className="text-foreground border-border/50 shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap">
              Switch to 3D
            </span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormatTile
            ext="PNG"
            label="3D Render"
            color="bg-orange-500/15 text-orange-400"
            description={`Screenshot of the live 3D preview in the current ${currentTheme} theme.`}
            disabled={activeTab !== "3d"}
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
                a.download = `${safeName({
                  view: "3d",
                  theme: currentTheme,
                })}.png`;
                a.click();
              })
            }
          />
          <FormatTile
            ext="JSON"
            label="Project File"
            color="bg-emerald-500/15 text-emerald-400"
            description="Full project backup. Re-import into TrackDraw at any time to continue editing."
            busy={busy === "json"}
            onExport={() =>
              run("json", () => {
                const blob = new Blob([JSON.stringify(design, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${safeName({
                  view: "2d",
                  theme: currentTheme,
                })}.json`;
                a.click();
                URL.revokeObjectURL(url);
              })
            }
          />
        </div>
      </div>
    </div>
  );

  const mobileList = (
    <div className="space-y-6">
      <div>
        <SectionLabel>2D</SectionLabel>
        <div className="border-border/40 divide-border/30 divide-y overflow-hidden rounded-xl border">
          {(
            [
              {
                ext: "PNG",
                label: "Image",
                color: "bg-sky-500/15 text-sky-400",
                description: "High-res raster at 2× density",
                id: "png",
                onExport: () =>
                  run("png", () =>
                    exportPng(
                      design,
                      `${safeName({ view: "2d", theme: exportTheme })}.png`,
                      exportTheme
                    )
                  ),
              },
              {
                ext: "SVG",
                label: "Vector",
                color: "bg-purple-500/15 text-purple-400",
                description: "Scalable — opens in Illustrator or Inkscape",
                id: "svg",
                onExport: () =>
                  run("svg", () =>
                    exportSvg(
                      design,
                      `${safeName({ view: "2d", theme: exportTheme })}.svg`,
                      exportTheme
                    )
                  ),
              },
              {
                ext: "PDF",
                label: "Document",
                color: "bg-red-500/15 text-red-400",
                description: `A4 print-ready · ${currentTheme} theme`,
                id: "pdf",
                onExport: () =>
                  run("pdf", async () => {
                    const stage = canvasRef.current?.getStage();
                    if (!stage) throw new Error("Canvas not ready");
                    const { exportPdf } =
                      await import("@/lib/export/exportPdf");
                    await exportPdf(
                      stage,
                      design,
                      `${safeName({ view: "2d", theme: currentTheme })}.pdf`
                    );
                  }),
              },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={busy === f.id}
              onClick={f.onExport}
              className={cn(
                "group active:bg-muted/40 flex w-full items-center gap-4 px-4 py-4 text-left transition-colors",
                busy === f.id && "cursor-not-allowed opacity-40"
              )}
            >
              <span
                className={cn(
                  "w-10 shrink-0 rounded-md py-0.5 text-center font-mono text-[11px] font-bold tracking-wide",
                  f.color
                )}
              >
                {f.ext}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">{f.label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {f.description}
                </p>
              </div>
              {busy === f.id ? (
                <Loader2 className="text-muted-foreground/65 size-4 shrink-0 animate-spin" />
              ) : (
                <Download className="text-muted-foreground/50 size-4 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>3D &amp; Project</SectionLabel>
        {activeTab !== "3d" && onRequest3DView && (
          <button
            type="button"
            onClick={onRequest3DView}
            className="border-border/40 bg-muted/20 active:bg-muted/35 mb-3 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
          >
            <p className="text-muted-foreground text-xs leading-relaxed">
              Switch to the 3D view to enable the 3D render export.
            </p>
            <span className="text-foreground border-border/50 shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap">
              Switch to 3D
            </span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                ext: "PNG",
                label: "3D Render",
                color: "bg-orange-500/15 text-orange-400",
                description: `Screenshot of the ${currentTheme} 3D view.`,
                id: "3d",
                onExport: () =>
                  run("3d", () => {
                    const dataUrl = preview3DRef?.current?.screenshot();
                    if (!dataUrl)
                      throw new Error(
                        "3D view not available — open the 3D tab first"
                      );
                    const a = document.createElement("a");
                    a.href = dataUrl;
                    a.download = `${safeName({
                      view: "3d",
                      theme: currentTheme,
                    })}.png`;
                    a.click();
                  }),
              },
              {
                ext: "JSON",
                label: "Project File",
                color: "bg-emerald-500/15 text-emerald-400",
                description: "Full backup. Re-import into TrackDraw anytime.",
                id: "json",
                onExport: () =>
                  run("json", () => {
                    const blob = new Blob([JSON.stringify(design, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${safeName({
                      view: "2d",
                      theme: currentTheme,
                    })}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }),
              },
            ] as const
          ).map((f) => {
            const isDisabled = f.id === "3d" && activeTab !== "3d";
            const isBusy = busy === f.id;
            return (
              <button
                key={f.id}
                type="button"
                disabled={isBusy || isDisabled}
                onClick={f.onExport}
                className={cn(
                  "group border-border/40 flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
                  isBusy || isDisabled
                    ? "cursor-not-allowed opacity-40"
                    : "active:bg-muted/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide",
                      f.color
                    )}
                  >
                    {f.ext}
                  </span>
                  {isBusy ? (
                    <Loader2 className="text-muted-foreground/65 size-3.5 shrink-0 animate-spin" />
                  ) : (
                    <Download className="text-muted-foreground/50 size-3.5 shrink-0" />
                  )}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {f.label}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Export"
        subtitle="Export the current track as a 2D file or 3D render."
        pinnedContent={
          <div className="border-border/40 space-y-3 border-b px-4 py-3">
            <div className="border-border/50 flex items-center gap-3 rounded-xl border px-3.5 py-2.5">
              <span className="text-muted-foreground/60 shrink-0 text-xs font-medium">
                Filename
              </span>
              <input
                type="text"
                placeholder={design.title.trim() || "track"}
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="text-foreground placeholder:text-muted-foreground/45 min-w-0 flex-1 bg-transparent text-sm outline-hidden"
              />
            </div>
            <ExportThemeToggle value={exportTheme} onChange={setExportTheme} />
          </div>
        }
      >
        {mobileList}
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title="Export"
      subtitle="Export the current track as a 2D file or 3D render."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {settingsBar}
        {desktopGrid}
      </div>
    </DesktopModal>
  );
}
