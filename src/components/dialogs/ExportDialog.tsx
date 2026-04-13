"use client";

import { useEffect, useRef, useState } from "react";
import { MobileDrawer } from "@/components/MobileDrawer";
import { DesktopModal } from "@/components/DesktopModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEditor } from "@/store/editor";
import type { FlythroughProgress, FlythroughTheme } from "@/lib/export/shared";
import { cn } from "@/lib/utils";
import type { TrackCanvasHandle } from "@/components/canvas/editor/TrackCanvas";
import { ArrowRight, Download, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import type { TrackPreview3DHandle } from "@/components/canvas/editor/TrackPreview3D";
import { useTheme } from "@/hooks/useTheme";

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<TrackCanvasHandle | null>;
  preview3DRef?: React.RefObject<TrackPreview3DHandle | null>;
  activeTab?: "2d" | "3d";
  onRequest3DView?: () => void;
}

type Theme = FlythroughTheme;

async function exportPngFile(
  ...args: Parameters<typeof import("@/lib/export/exportPng").exportPng>
) {
  const { exportPng } = await import("@/lib/export/exportPng");
  return exportPng(...args);
}

async function exportSvgFile(
  ...args: Parameters<typeof import("@/lib/export/exportSvg").exportSvg>
) {
  const { exportSvg } = await import("@/lib/export/exportSvg");
  return exportSvg(...args);
}

async function exportVelocidroneFile(
  ...args: Parameters<
    typeof import("@/lib/export/exportVelocidroneTrk").exportVelocidroneTrk
  >
) {
  const { exportVelocidroneTrk } =
    await import("@/lib/export/exportVelocidroneTrk");
  return exportVelocidroneTrk(...args);
}

function formatDuration(seconds: number) {
  const roundedSeconds = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const secs = roundedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function getFlythroughStatusText(
  progress: FlythroughProgress,
  startedAt: number | null
) {
  const percent = Math.round(progress.progress * 100);
  if (progress.progress <= 0.01 || startedAt === null) {
    return `${percent}%`;
  }

  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const remainingSeconds = Math.max(
    0,
    (elapsedSeconds / progress.progress) * (1 - progress.progress)
  );

  return `${percent}% - ${formatDuration(remainingSeconds)} left`;
}

function DesktopFormatCard({
  ext,
  label,
  color,
  description,
  busy,
  disabled,
  lockedAction,
  onExport,
}: {
  ext: string;
  label: string;
  color: string;
  description: string;
  busy: boolean;
  disabled?: boolean;
  lockedAction?: { label: string; onClick: () => void };
  onExport: () => void;
}) {
  const isLocked = !!lockedAction;
  const inactive = busy || disabled;

  return (
    <div
      role="button"
      tabIndex={inactive || isLocked ? -1 : 0}
      onClick={inactive || isLocked ? undefined : onExport}
      onKeyDown={
        inactive || isLocked
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") onExport();
            }
      }
      className={cn(
        "group flex min-h-37 w-full flex-col rounded-2xl border p-4 transition-all",
        inactive
          ? "border-border/20 cursor-not-allowed opacity-40"
          : isLocked
            ? "border-border/20 bg-background/10"
            : "border-border/30 bg-background/15 hover:border-border/50 hover:bg-muted/10 cursor-pointer"
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <span
          className={cn(
            "rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide",
            isLocked ? "opacity-40" : "",
            color
          )}
        >
          {ext}
        </span>
        {busy ? (
          <Loader2 className="text-muted-foreground/60 mt-0.5 size-4 animate-spin" />
        ) : (
          <Download
            className={cn(
              "mt-0.5 size-4 transition-colors",
              inactive || isLocked
                ? "text-muted-foreground/20"
                : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
            )}
          />
        )}
      </div>
      <div className={cn("flex-1", isLocked && "opacity-40")}>
        <p className="text-foreground text-sm font-semibold">{label}</p>
        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
          {description}
        </p>
      </div>
      {lockedAction && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            lockedAction.onClick();
          }}
          className="border-border/20 text-muted-foreground/60 hover:text-foreground mt-3 flex items-center gap-1.5 border-t pt-3 text-[11px] font-medium transition-colors"
        >
          <ArrowRight className="size-3 shrink-0" />
          {lockedAction.label}
        </button>
      )}
    </div>
  );
}

function MobileFormatRow({
  ext,
  label,
  color,
  description,
  isBusy,
  locked,
  onAction,
}: {
  ext: string;
  label: string;
  color: string;
  description: string;
  isBusy: boolean;
  locked?: boolean;
  onAction: () => void;
}) {
  const inactive = isBusy || locked;
  return (
    <button
      type="button"
      disabled={inactive}
      onClick={onAction}
      className={cn(
        "flex w-full items-center gap-4 px-4 py-4 text-left transition-colors",
        inactive ? "opacity-50" : "active:bg-muted/30"
      )}
    >
      <span
        className={cn(
          "w-10 shrink-0 rounded-md py-0.5 text-center font-mono text-[11px] font-bold tracking-wide",
          color
        )}
      >
        {ext}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{label}</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {description}
        </p>
      </div>
      {isBusy ? (
        <Loader2 className="text-muted-foreground/60 size-4 shrink-0 animate-spin" />
      ) : locked ? (
        <span className="text-muted-foreground/50 flex shrink-0 items-center gap-1 text-[11px]">
          <ArrowRight className="size-3" />
          3D view
        </span>
      ) : (
        <Download className="text-muted-foreground/40 size-4 shrink-0" />
      )}
    </button>
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
  const design = useEditor((s) => s.track.design);
  const currentTheme = useTheme();
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState<string | null>(null);
  const [webmProgress, setWebmProgress] = useState<FlythroughProgress | null>(
    null
  );
  const webmStartTimeRef = useRef<number | null>(null);
  const webmToastIdRef = useRef<string | number | null>(null);
  const [exportTheme, setExportTheme] = useState<Theme>("dark");
  const [includeObstacleNumbers, setIncludeObstacleNumbers] = useState(true);
  const [filename, setFilename] = useState("");

  useEffect(() => {
    setExportTheme(currentTheme);
  }, [currentTheme]);

  const baseName = (filename.trim() || design.title.trim() || "track").replace(
    /[^a-z0-9-_]+/gi,
    "_"
  );

  const safeName = ({ theme, view }: { theme?: Theme; view: "2d" | "3d" }) => {
    return [baseName, view, theme].filter(Boolean).join("_");
  };

  const run = async <T,>(
    id: string,
    fn: () => T | Promise<T>,
    options?: {
      closeOnStart?: boolean;
      successMessage?: string;
      toastId?: string | number;
    }
  ) => {
    setBusy(id);
    if (options?.closeOnStart) {
      onOpenChange(false);
    }
    try {
      const result = await fn();
      const warningText =
        !!result &&
        typeof result === "object" &&
        "warnings" in result &&
        Array.isArray((result as { warnings?: unknown }).warnings)
          ? (result as { warnings: string[] }).warnings.join(" ")
          : "";

      toast.success(
        warningText
          ? `${options?.successMessage ?? "Exported"}. ${warningText}`
          : (options?.successMessage ?? "Exported"),
        options?.toastId !== undefined ? { id: options.toastId } : undefined
      );
      if (!options?.closeOnStart) {
        onOpenChange(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (options?.toastId !== undefined) {
        toast.error(`Export failed: ${message}`, { id: options.toastId });
      } else {
        toast.error(`Export failed: ${message}`);
      }
    } finally {
      setBusy(null);
    }
  };

  const desktopContent = (
    <div className="space-y-6">
      {/* Settings bar — unified card */}
      <div className="border-border/35 bg-background/50 divide-border/30 flex min-w-0 items-stretch divide-x overflow-hidden rounded-xl border">
        {/* Filename */}
        <label className="flex min-w-0 flex-1 cursor-text flex-col gap-1.5 px-4 py-3">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase select-none">
            Filename
          </span>
          <input
            type="text"
            placeholder={design.title.trim() || "track"}
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="text-foreground placeholder:text-muted-foreground/30 w-full min-w-0 bg-transparent text-sm outline-hidden"
          />
        </label>

        {/* Theme */}
        <div className="flex shrink-0 flex-col gap-1.5 px-4 py-3">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase select-none">
            Theme
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExportTheme("dark")}
              aria-pressed={exportTheme === "dark"}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
                exportTheme === "dark"
                  ? "text-foreground"
                  : "text-muted-foreground/40 hover:text-muted-foreground/65"
              )}
            >
              <Moon className="size-3.5 shrink-0" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => setExportTheme("light")}
              aria-pressed={exportTheme === "light"}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
                exportTheme === "light"
                  ? "text-foreground"
                  : "text-muted-foreground/40 hover:text-muted-foreground/65"
              )}
            >
              <Sun
                className={cn(
                  "size-3.5 shrink-0",
                  exportTheme === "light" ? "text-amber-500" : ""
                )}
              />
              Light
            </button>
          </div>
        </div>

        {/* Route numbers */}
        <div className="flex shrink-0 items-center gap-3 px-4 py-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase select-none">
              Route numbers
            </span>
            <span className="text-muted-foreground/45 text-[10px]">
              In 2D exports
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIncludeObstacleNumbers((v) => !v)}
            className={cn(
              "relative h-5 w-8 shrink-0 rounded-full p-0.5 transition-colors",
              includeObstacleNumbers ? "bg-foreground/80" : "bg-border/70"
            )}
            aria-pressed={includeObstacleNumbers}
            aria-label={
              includeObstacleNumbers
                ? "Disable route numbers in export"
                : "Enable route numbers in export"
            }
          >
            <span className="bg-background block size-4 rounded-full shadow-xs" />
          </button>
        </div>
      </div>

      {/* 2D exports */}
      <div>
        <div className="mb-1.5 flex items-center gap-3">
          <span className="text-muted-foreground/70 shrink-0 text-[10px] font-semibold tracking-[0.15em] uppercase">
            2D Exports
          </span>
          <div className="bg-border/30 h-px flex-1" />
        </div>
        <p className="text-muted-foreground mb-4 text-[11px]">
          Raster, vector, and print-ready files.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <DesktopFormatCard
            ext="PNG"
            label="Image"
            color="bg-sky-500/15 text-sky-400"
            description="High-resolution PNG at 3× scale, ready for sharing or print."
            busy={busy === "png"}
            onExport={() =>
              run("png", () =>
                exportPngFile(
                  design,
                  `${safeName({ view: "2d", theme: exportTheme })}.png`,
                  exportTheme,
                  3,
                  { includeObstacleNumbers }
                )
              )
            }
          />
          <DesktopFormatCard
            ext="SVG"
            label="Vector"
            color="bg-purple-500/15 text-purple-400"
            description="Infinitely scalable — opens in Illustrator, Inkscape, or Figma."
            busy={busy === "svg"}
            onExport={() =>
              run("svg", () =>
                exportSvgFile(
                  design,
                  `${safeName({ view: "2d", theme: exportTheme })}.svg`,
                  exportTheme,
                  { includeObstacleNumbers }
                )
              )
            }
          />
          <DesktopFormatCard
            ext="PDF"
            label="Race Pack"
            color="bg-red-500/15 text-red-400"
            description="Multi-page: track map, material list, and setup sequence."
            busy={busy === "race-day-pdf"}
            onExport={() =>
              run("race-day-pdf", async () => {
                const stage = canvasRef.current?.getStage();
                if (!stage) throw new Error("Canvas not ready");
                const { exportPdf } = await import("@/lib/export/exportPdf");
                await exportPdf(
                  stage,
                  design,
                  `${baseName}_race_pack.pdf`,
                  exportTheme,
                  {
                    includeObstacleNumbers,
                    preset: "race-day",
                  }
                );
              })
            }
          />
        </div>
      </div>

      {/* Project & Simulator */}
      <div>
        <div className="mb-1.5 flex items-center gap-3">
          <span className="text-muted-foreground/70 shrink-0 text-[10px] font-semibold tracking-[0.15em] uppercase">
            Project &amp; Simulator
          </span>
          <div className="bg-border/30 h-px flex-1" />
        </div>
        <p className="text-muted-foreground mb-4 text-[11px]">
          Save your work or fly the track in a simulator.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <DesktopFormatCard
            ext="PNG"
            label="3D Render"
            color="bg-orange-500/15 text-orange-400"
            description="Screenshot of the 3D view at the current camera angle."
            busy={busy === "3d"}
            lockedAction={
              activeTab !== "3d" && onRequest3DView
                ? { label: "Switch to 3D view", onClick: onRequest3DView }
                : undefined
            }
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
          <DesktopFormatCard
            ext="WebM"
            label="Cinematic FPV"
            color="bg-violet-500/15 text-violet-400"
            description="Fly-through video of your track. One full loop, ready to share."
            busy={busy === "webm"}
            onExport={() =>
              run(
                "webm",
                async () => {
                  const toastId =
                    webmToastIdRef.current ?? "webm-flythrough-export";
                  webmToastIdRef.current = toastId;
                  setWebmProgress(null);
                  webmStartTimeRef.current = Date.now();
                  toast.loading(
                    "Cinematic FPV is rendering in the background…",
                    {
                      id: toastId,
                    }
                  );
                  const { exportFlythrough } =
                    await import("@/lib/export/exportFlythrough");
                  try {
                    await exportFlythrough(
                      design,
                      `${baseName}_flythrough.webm`,
                      exportTheme,
                      (progress) => {
                        setWebmProgress(progress);
                        toast.loading(
                          `Rendering cinematic FPV… ${getFlythroughStatusText(
                            progress,
                            webmStartTimeRef.current
                          )}`,
                          {
                            id: toastId,
                          }
                        );
                      }
                    );
                  } finally {
                    setWebmProgress(null);
                    webmStartTimeRef.current = null;
                    webmToastIdRef.current = null;
                  }
                },
                {
                  closeOnStart: true,
                  successMessage: "Cinematic FPV export ready",
                  toastId: "webm-flythrough-export",
                }
              )
            }
          />
          <DesktopFormatCard
            ext="JSON"
            label="Project File"
            color="bg-emerald-500/15 text-emerald-400"
            description="Full project file — share with others or reopen in TrackDraw."
            busy={busy === "json"}
            onExport={() =>
              run("json", () => {
                const blob = new Blob([JSON.stringify(design, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${baseName}.json`;
                a.click();
                URL.revokeObjectURL(url);
              })
            }
          />
          <DesktopFormatCard
            ext="TRK"
            label="Velocidrone"
            color="bg-lime-500/15 text-lime-400"
            description="Experimental format for testing your layout in Velocidrone."
            busy={busy === "trk"}
            onExport={() =>
              run("trk", () => exportVelocidroneFile(design, `${baseName}.trk`))
            }
          />
        </div>
        {webmProgress !== null && (
          <div className="mt-3 space-y-1.5">
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>
                Rendering fly-through… video{" "}
                {formatDuration(webmProgress.videoDurationSeconds)}
              </span>
              <span>
                {getFlythroughStatusText(
                  webmProgress,
                  webmStartTimeRef.current
                )}
              </span>
            </div>
            <div className="bg-border/30 h-1 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-100"
                style={{ width: `${webmProgress.progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const mobileList = (
    <div className="space-y-5 pb-2">
      <div>
        <h3 className="text-muted-foreground mb-2 px-1 text-[10px] font-semibold tracking-[0.15em] uppercase">
          2D Exports
        </h3>
        <div className="border-border/35 divide-border/25 divide-y overflow-hidden rounded-xl border">
          <MobileFormatRow
            key="png"
            ext="PNG"
            label="Image"
            color="bg-sky-500/15 text-sky-400"
            description="High-resolution PNG at 3× scale."
            isBusy={busy === "png"}
            onAction={() =>
              run("png", () =>
                exportPngFile(
                  design,
                  `${safeName({ view: "2d", theme: exportTheme })}.png`,
                  exportTheme,
                  3,
                  { includeObstacleNumbers }
                )
              )
            }
          />
          <MobileFormatRow
            key="svg"
            ext="SVG"
            label="Vector"
            color="bg-purple-500/15 text-purple-400"
            description="Scalable — Illustrator, Inkscape, or Figma."
            isBusy={busy === "svg"}
            onAction={() =>
              run("svg", () =>
                exportSvgFile(
                  design,
                  `${safeName({ view: "2d", theme: exportTheme })}.svg`,
                  exportTheme,
                  { includeObstacleNumbers }
                )
              )
            }
          />
          <MobileFormatRow
            key="race-day-pdf"
            ext="PDF"
            label="Race Pack"
            color="bg-red-500/15 text-red-400"
            description="Track map, material list, and setup sequence."
            isBusy={busy === "race-day-pdf"}
            onAction={() =>
              run("race-day-pdf", async () => {
                const stage = canvasRef.current?.getStage();
                if (!stage) throw new Error("Canvas not ready");
                const { exportPdf } = await import("@/lib/export/exportPdf");
                await exportPdf(
                  stage,
                  design,
                  `${baseName}_race_pack.pdf`,
                  exportTheme,
                  {
                    includeObstacleNumbers,
                    preset: "race-day",
                  }
                );
              })
            }
          />
        </div>
      </div>

      <div>
        <h3 className="text-muted-foreground mb-2 px-1 text-[10px] font-semibold tracking-[0.15em] uppercase">
          Project &amp; Simulator
        </h3>
        <div className="border-border/35 divide-border/25 divide-y overflow-hidden rounded-xl border">
          <MobileFormatRow
            key="3d"
            ext="PNG"
            label="3D Render"
            color="bg-orange-500/15 text-orange-400"
            description="Screenshot at the current camera angle."
            isBusy={busy === "3d"}
            locked={activeTab !== "3d"}
            onAction={
              activeTab !== "3d" && onRequest3DView
                ? onRequest3DView
                : () =>
                    run("3d", () => {
                      const dataUrl = preview3DRef?.current?.screenshot();
                      if (!dataUrl) throw new Error("3D view not available");
                      const a = document.createElement("a");
                      a.href = dataUrl;
                      a.download = `${safeName({ view: "3d", theme: currentTheme })}.png`;
                      a.click();
                    })
            }
          />
          <MobileFormatRow
            key="webm"
            ext="WebM"
            label="Cinematic FPV"
            color="bg-violet-500/15 text-violet-400"
            description="Fly-through video. One full loop."
            isBusy={busy === "webm"}
            onAction={() =>
              run(
                "webm",
                async () => {
                  const toastId =
                    webmToastIdRef.current ?? "webm-flythrough-export";
                  webmToastIdRef.current = toastId;
                  setWebmProgress(null);
                  webmStartTimeRef.current = Date.now();
                  toast.loading(
                    "Cinematic FPV is rendering in the background…",
                    {
                      id: toastId,
                    }
                  );
                  const { exportFlythrough } =
                    await import("@/lib/export/exportFlythrough");
                  try {
                    await exportFlythrough(
                      design,
                      `${baseName}_flythrough.webm`,
                      exportTheme,
                      (progress) => {
                        setWebmProgress(progress);
                        toast.loading(
                          `Rendering cinematic FPV… ${getFlythroughStatusText(
                            progress,
                            webmStartTimeRef.current
                          )}`,
                          {
                            id: toastId,
                          }
                        );
                      }
                    );
                  } finally {
                    setWebmProgress(null);
                    webmStartTimeRef.current = null;
                    webmToastIdRef.current = null;
                  }
                },
                {
                  closeOnStart: true,
                  successMessage: "Cinematic FPV export ready",
                  toastId: "webm-flythrough-export",
                }
              )
            }
          />
          <MobileFormatRow
            key="json"
            ext="JSON"
            label="Project File"
            color="bg-emerald-500/15 text-emerald-400"
            description="Full backup — reopen or share in TrackDraw."
            isBusy={busy === "json"}
            onAction={() =>
              run("json", () => {
                const blob = new Blob([JSON.stringify(design, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${baseName}.json`;
                a.click();
                URL.revokeObjectURL(url);
              })
            }
          />
          <MobileFormatRow
            key="trk"
            ext="TRK"
            label="Velocidrone"
            color="bg-lime-500/15 text-lime-400"
            description="Experimental import for Velocidrone."
            isBusy={busy === "trk"}
            onAction={() =>
              run("trk", () => exportVelocidroneFile(design, `${baseName}.trk`))
            }
          />
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
        contentClassName="data-[vaul-drawer-direction=bottom]:mt-12 data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
        pinnedContent={
          <div className="border-border/40 space-y-2.5 border-b px-4 pt-2 pb-3">
            {/* Filename */}
            <label className="border-border/50 bg-muted/25 flex cursor-text items-center gap-2.5 rounded-xl border px-3.5 py-2.5">
              <span className="text-muted-foreground shrink-0 text-[11px] font-medium select-none">
                Filename
              </span>
              <input
                type="text"
                placeholder={design.title.trim() || "track"}
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="text-foreground placeholder:text-muted-foreground/45 min-w-0 flex-1 bg-transparent text-sm outline-hidden"
              />
            </label>
            {/* Theme + Numbers */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportTheme("dark")}
                  aria-pressed={exportTheme === "dark"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    exportTheme === "dark"
                      ? "border-border/60 bg-muted/35 text-foreground"
                      : "text-muted-foreground/60 hover:text-muted-foreground/80 border-transparent"
                  )}
                >
                  <Moon className="size-3.5 shrink-0" />
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setExportTheme("light")}
                  aria-pressed={exportTheme === "light"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    exportTheme === "light"
                      ? "border-border/60 bg-muted/35 text-foreground"
                      : "text-muted-foreground/60 hover:text-muted-foreground/80 border-transparent"
                  )}
                >
                  <Sun
                    className={cn(
                      "size-3.5 shrink-0",
                      exportTheme === "light" ? "text-amber-500" : ""
                    )}
                  />
                  Light
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-muted-foreground text-[11px] font-medium select-none">
                  Numbers
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setIncludeObstacleNumbers((current) => !current)
                  }
                  className={cn(
                    "flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
                    includeObstacleNumbers
                      ? "bg-foreground/90 justify-end"
                      : "bg-border/80 justify-start"
                  )}
                  aria-pressed={includeObstacleNumbers}
                  aria-label={
                    includeObstacleNumbers
                      ? "Disable route numbers"
                      : "Enable route numbers"
                  }
                >
                  <span className="bg-background block size-5 rounded-full shadow-xs" />
                </button>
              </div>
            </div>
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
      panelClassName="px-7 py-7"
    >
      {desktopContent}
    </DesktopModal>
  );
}
