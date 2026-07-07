"use client";

import { useEffect, useRef, useState } from "react";
import {
  SidebarDialog,
  type SidebarDialogNavItem,
} from "@/components/SidebarDialog";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import { buildStoredSharePath } from "@/lib/share";
import { serializeDesign } from "@/lib/track/design";
import { downloadJsonFile } from "@/lib/export/download-json";
import { useEditor } from "@/store/editor";
import type { FlythroughProgress, FlythroughTheme } from "@/lib/export/shared";
import { cn } from "@/lib/utils";
import type { TrackCanvasHandle } from "@/components/canvas/editor/TrackCanvas";
import {
  AlertTriangle,
  ArrowRight,
  Database,
  Download,
  FileText,
  FlaskConical,
  ImageIcon,
  Loader2,
  Moon,
  Sun,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type { TrackPreview3DHandle } from "@/components/canvas/editor/TrackPreview3D";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "next-intl";
import type { Translate } from "@/lib/editor/tool-registry";

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<TrackCanvasHandle | null>;
  preview3DRef?: React.RefObject<TrackPreview3DHandle | null>;
  activeTab?: "2d" | "3d";
  onRequest3DView?: () => void;
  projectId?: string | null;
}

type Theme = FlythroughTheme;
type ExportCategoryId =
  "visuals" | "raceDay" | "projectData" | "motion" | "simulatorLab";
type ExportFormatId =
  "png" | "svg" | "render3d" | "racePack" | "json" | "webm" | "velocidrone";

type ExportFormat = {
  id: ExportFormatId;
  category: ExportCategoryId;
  ext: string;
  fileExtension: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
  busyId: string;
  showTheme?: boolean;
  showRouteNumbers?: boolean;
};

type ExportReadiness = {
  status: "blocked" | "warning";
  message: string;
};

const DEFAULT_SELECTED_FORMAT_BY_CATEGORY: Record<
  ExportCategoryId,
  ExportFormatId
> = {
  visuals: "png",
  raceDay: "racePack",
  projectData: "json",
  motion: "webm",
  simulatorLab: "velocidrone",
};

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

function formatDateStamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function sanitizeFilenameStem(
  value: string,
  fallback: string,
  extension?: string
) {
  const extensionSuffix = extension ? `.${extension.toLowerCase()}` : "";
  const withoutExtension =
    extensionSuffix && value.toLowerCase().endsWith(extensionSuffix)
      ? value.slice(0, -extensionSuffix.length)
      : value;
  const sanitized = (withoutExtension.trim() || fallback)
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || fallback;
}

function ExportFormatChoice({
  format,
  selected,
  onSelect,
}: {
  format: ExportFormat;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition-colors",
        "md:min-h-14 md:flex-row md:items-center md:gap-3 md:px-3 md:py-2.5 md:text-left",
        selected ? "bg-muted/60" : "hover:bg-muted/30"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          format.color
        )}
      >
        {format.icon}
      </span>
      <span className="flex max-w-full min-w-0 flex-col items-center gap-1 md:max-w-none md:flex-1 md:flex-row md:items-center md:gap-2">
        <span className="text-foreground w-full truncate text-xs font-medium md:w-auto md:text-sm">
          {format.label}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide",
            format.color
          )}
        >
          {format.ext}
        </span>
      </span>
    </button>
  );
}

function ExportSettingsPanel({
  format,
  busy,
  lockedAction,
  readiness,
  filenameStem,
  exportTheme,
  includeObstacleNumbers,
  onFilenameStemChange,
  onThemeChange,
  onIncludeObstacleNumbersChange,
  onExport,
  webmProgress,
  webmStartedAt,
  showHeader = true,
  t,
}: {
  format: ExportFormat;
  busy: string | null;
  lockedAction?: { label: string; onClick: () => void };
  readiness?: ExportReadiness;
  filenameStem: string;
  exportTheme: Theme;
  includeObstacleNumbers: boolean;
  onFilenameStemChange: (value: string) => void;
  onThemeChange: (theme: Theme) => void;
  onIncludeObstacleNumbersChange: (value: boolean) => void;
  onExport: () => void;
  webmProgress: FlythroughProgress | null;
  webmStartedAt: number | null;
  showHeader?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const isBusy = busy === format.busyId;
  const actionLabel = lockedAction
    ? lockedAction.label
    : t("export.aria.exportFormat", { label: format.label });
  const hasOptions = !!format.showTheme || !!format.showRouteNumbers;
  const isBlocked = readiness?.status === "blocked" && !lockedAction;

  return (
    <div className="space-y-5">
      {showHeader ? (
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
              format.color
            )}
          >
            {format.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-foreground block truncate text-sm font-medium">
                {format.label}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide",
                  format.color
                )}
              >
                {format.ext}
              </span>
            </span>
            <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
              {format.description}
            </span>
          </span>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {format.description}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor={`export-filename-${format.id}`}
            className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase select-none"
          >
            {t("export.fields.filename.label")}
          </label>
          <div className="border-border/60 bg-background/70 focus-within:ring-ring/40 mt-1.5 flex min-w-0 overflow-hidden rounded-lg border focus-within:ring-1">
            <input
              id={`export-filename-${format.id}`}
              value={filenameStem}
              onChange={(event) => onFilenameStemChange(event.target.value)}
              className="text-foreground min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-hidden"
            />
            <span className="border-border/50 text-muted-foreground flex shrink-0 items-center border-l px-3 font-mono text-xs">
              .{format.fileExtension}
            </span>
          </div>
        </div>

        {hasOptions ? (
          <ExportOptionsStrip
            exportTheme={exportTheme}
            includeObstacleNumbers={includeObstacleNumbers}
            showTheme={format.showTheme}
            showRouteNumbers={format.showRouteNumbers}
            onThemeChange={onThemeChange}
            onIncludeObstacleNumbersChange={onIncludeObstacleNumbersChange}
            t={t}
          />
        ) : null}

        {format.id === "webm" && webmProgress !== null && (
          <div className="space-y-1.5">
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>
                {t("export.webm.progressLabel", {
                  duration: formatDuration(webmProgress.videoDurationSeconds),
                })}
              </span>
              <span>
                {getFlythroughStatusText(webmProgress, webmStartedAt ?? null)}
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

        {readiness ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs leading-snug",
              readiness.status === "blocked"
                ? "border-destructive/25 bg-destructive/8 text-destructive"
                : "border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-400"
            )}
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <p>{readiness.message}</p>
          </div>
        ) : null}

        <button
          type="button"
          disabled={isBusy || isBlocked}
          aria-label={actionLabel}
          onClick={lockedAction?.onClick ?? onExport}
          className={cn(
            "bg-foreground text-background hover:bg-foreground/90 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
            (isBusy || isBlocked) && "cursor-not-allowed opacity-65"
          )}
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : lockedAction ? (
            <ArrowRight className="size-4" />
          ) : (
            <Download className="size-4" />
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
function ExportOptionsStrip({
  exportTheme,
  includeObstacleNumbers,
  showTheme = false,
  showRouteNumbers = false,
  onThemeChange,
  onIncludeObstacleNumbersChange,
  t,
}: {
  exportTheme: Theme;
  includeObstacleNumbers: boolean;
  showTheme?: boolean;
  showRouteNumbers?: boolean;
  onThemeChange: (theme: Theme) => void;
  onIncludeObstacleNumbersChange: (value: boolean) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!showTheme && !showRouteNumbers) return null;

  const labelClassName =
    "text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase select-none";

  return (
    <div className="flex flex-wrap items-end gap-3 pt-1">
      {showTheme ? (
        <div className="w-32">
          <p className={labelClassName}>{t("export.theme.label")}</p>
          <div className="border-border/60 bg-muted/50 mt-1.5 grid grid-cols-2 gap-1 rounded-lg border p-1">
            <button
              type="button"
              onClick={() => onThemeChange("dark")}
              aria-pressed={exportTheme === "dark"}
              className={cn(
                "flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
                exportTheme === "dark"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Moon className="size-3.5" />
              {t("export.theme.dark")}
            </button>
            <button
              type="button"
              onClick={() => onThemeChange("light")}
              aria-pressed={exportTheme === "light"}
              className={cn(
                "flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
                exportTheme === "light"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sun
                className={cn(
                  "size-3.5",
                  exportTheme === "light" ? "text-amber-500" : ""
                )}
              />
              {t("export.theme.light")}
            </button>
          </div>
        </div>
      ) : null}

      {showRouteNumbers ? (
        <div className="w-36">
          <p className={labelClassName}>{t("export.routeNumbers.label")}</p>
          <button
            type="button"
            onClick={() =>
              onIncludeObstacleNumbersChange(!includeObstacleNumbers)
            }
            className="bg-muted/40 text-foreground hover:bg-muted/60 mt-1.5 flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 text-xs transition-colors"
            aria-pressed={includeObstacleNumbers}
            aria-label={
              includeObstacleNumbers
                ? t("export.routeNumbers.disable")
                : t("export.routeNumbers.enable")
            }
          >
            <span className="truncate">{t("export.routeNumbers.hint")}</span>
            <span
              className={cn(
                "flex h-5 w-8 shrink-0 items-center rounded-full p-0.5 transition-colors",
                includeObstacleNumbers
                  ? "bg-foreground/90 justify-end"
                  : "bg-border/80 justify-start"
              )}
            >
              <span className="bg-background block size-4 rounded-full shadow-xs" />
            </span>
          </button>
        </div>
      ) : null}
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
  projectId = null,
}: ExportDialogProps) {
  const t = useTranslations("dialogs");
  const tExportPdf = useTranslations("exportPdf") as unknown as Translate;
  const tSetupEstimate = useTranslations(
    "setupEstimate"
  ) as unknown as Translate;
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const design = useEditor((s) => s.track.design);
  const { unitSystem } = useMeasurementUnitSystem();
  const currentTheme = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [webmProgress, setWebmProgress] = useState<FlythroughProgress | null>(
    null
  );
  const webmToastIdRef = useRef<string | number | null>(null);
  const [webmStartedAt, setWebmStartedAt] = useState<number | null>(null);
  const [exportTheme, setExportTheme] = useState<Theme>("dark");
  const [includeObstacleNumbers, setIncludeObstacleNumbers] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExportTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    if (!open) return;

    const sampleCanvasReady = () => {
      setCanvasReady(Boolean(canvasRef.current?.getStage()));
    };

    sampleCanvasReady();
    const intervalId = window.setInterval(sampleCanvasReady, 100);
    return () => window.clearInterval(intervalId);
  }, [canvasRef, open]);

  const baseName = sanitizeFilenameStem(design.title, "track");

  const getRacePackShareUrl = async () => {
    if (!projectId) return null;

    try {
      const response = await fetch(
        `/api/shares?projectId=${encodeURIComponent(projectId)}`
      );
      const payload = (await response.json()) as {
        ok: boolean;
        share?: {
          shareType: "temporary" | "published";
          token: string;
        } | null;
      };

      if (
        !response.ok ||
        !payload.ok ||
        payload.share?.shareType !== "published"
      ) {
        return null;
      }

      return new URL(
        buildStoredSharePath(payload.share.token, "2d"),
        window.location.origin
      ).toString();
    } catch {
      return null;
    }
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
          ? `${options?.successMessage ?? t("export.messages.exported")}. ${warningText}`
          : (options?.successMessage ?? t("export.messages.exported")),
        options?.toastId !== undefined ? { id: options.toastId } : undefined
      );
      if (!options?.closeOnStart) {
        onOpenChange(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const description = t("export.errors.exportFailedDescription", {
        message,
      });
      if (options?.toastId !== undefined) {
        toast.error(t("export.errors.exportFailed"), {
          description,
          id: options.toastId,
        });
      } else {
        toast.error(t("export.errors.exportFailed"), { description });
      }
    } finally {
      setBusy(null);
    }
  };

  const [activeCategory, setActiveCategory] =
    useState<ExportCategoryId>("visuals");
  const [selectedFormatByCategory, setSelectedFormatByCategory] = useState<
    Record<ExportCategoryId, ExportFormatId>
  >(DEFAULT_SELECTED_FORMAT_BY_CATEGORY);
  const [filenameByFormat, setFilenameByFormat] = useState<
    Partial<Record<ExportFormatId, string>>
  >({});

  const exportFormats: ExportFormat[] = [
    {
      id: "png",
      category: "visuals",
      ext: "PNG",
      fileExtension: "png",
      label: t("export.formats.image.label"),
      color: "bg-sky-500/15 text-sky-400",
      icon: <ImageIcon className="size-4" />,
      description: t("export.formats.image.descriptionFull"),
      busyId: "png",
      showTheme: true,
      showRouteNumbers: true,
    },
    {
      id: "svg",
      category: "visuals",
      ext: "SVG",
      fileExtension: "svg",
      label: t("export.formats.vector.label"),
      color: "bg-purple-500/15 text-purple-400",
      icon: <FileText className="size-4" />,
      description: t("export.formats.vector.descriptionFull"),
      busyId: "svg",
      showTheme: true,
      showRouteNumbers: true,
    },
    {
      id: "render3d",
      category: "visuals",
      ext: "PNG",
      fileExtension: "png",
      label: t("export.formats.render3d.label"),
      color: "bg-orange-500/15 text-orange-400",
      icon: <ImageIcon className="size-4" />,
      description: t("export.formats.render3d.descriptionFull"),
      busyId: "3d",
    },
    {
      id: "racePack",
      category: "raceDay",
      ext: "PDF",
      fileExtension: "pdf",
      label: t("export.formats.racePack.label"),
      color: "bg-red-500/15 text-red-400",
      icon: <FileText className="size-4" />,
      description: t("export.formats.racePack.descriptionFull"),
      busyId: "race-day-pdf",
      showTheme: true,
      showRouteNumbers: true,
    },
    {
      id: "json",
      category: "projectData",
      ext: "JSON",
      fileExtension: "json",
      label: t("export.formats.projectFile.label"),
      color: "bg-emerald-500/15 text-emerald-400",
      icon: <Database className="size-4" />,
      description: t("export.formats.projectFile.descriptionFull"),
      busyId: "json",
    },
    {
      id: "webm",
      category: "motion",
      ext: "WebM",
      fileExtension: "webm",
      label: t("export.formats.cinematicFpv.label"),
      color: "bg-violet-500/15 text-violet-400",
      icon: <Video className="size-4" />,
      description: t("export.formats.cinematicFpv.descriptionFull"),
      busyId: "webm",
      showTheme: true,
    },
    {
      id: "velocidrone",
      category: "simulatorLab",
      ext: "TRK",
      fileExtension: "trk",
      label: t("export.formats.velocidrone.label"),
      color: "bg-lime-500/15 text-lime-400",
      icon: <FlaskConical className="size-4" />,
      description: t("export.formats.velocidrone.descriptionFull"),
      busyId: "trk",
    },
  ];

  const dateStamp = formatDateStamp(new Date());

  const defaultFilenameStem = (formatId: ExportFormatId) => {
    switch (formatId) {
      case "png":
      case "svg":
        return [baseName, "2d", exportTheme, dateStamp].join("_");
      case "render3d":
        return [baseName, "3d", currentTheme, dateStamp].join("_");
      case "racePack":
        return [baseName, "race_pack", exportTheme, dateStamp].join("_");
      case "json":
      case "velocidrone":
        return [baseName, dateStamp].join("_");
      case "webm":
        return [baseName, "flythrough", exportTheme, dateStamp].join("_");
    }
  };

  const filenameStemFor = (format: ExportFormat) =>
    sanitizeFilenameStem(
      filenameByFormat[format.id] ?? defaultFilenameStem(format.id),
      defaultFilenameStem(format.id),
      format.fileExtension
    );

  const filenameFor = (format: ExportFormat) =>
    `${filenameStemFor(format)}.${format.fileExtension}`;

  const hasFlythroughRoute = design.shapeOrder.some((shapeId) => {
    const shape = design.shapeById[shapeId];
    return shape?.kind === "polyline" && shape.points.length >= 2;
  });
  const hasTrackContent = design.shapeOrder.some((shapeId) =>
    Boolean(design.shapeById[shapeId])
  );

  const handleExport = (formatId: ExportFormatId) => {
    const format = exportFormats.find((item) => item.id === formatId);
    if (!format) return;

    switch (formatId) {
      case "png":
        return run("png", () =>
          exportPngFile(design, filenameFor(format), exportTheme, 3, {
            includeObstacleNumbers,
            unitSystem,
          })
        );
      case "svg":
        return run("svg", () =>
          exportSvgFile(design, filenameFor(format), exportTheme, {
            includeObstacleNumbers,
            unitSystem,
          })
        );
      case "render3d":
        return run("3d", () => {
          const dataUrl = preview3DRef?.current?.screenshot();
          if (!dataUrl) throw new Error(t("export.messages.view3dUnavailable"));
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filenameFor(format);
          a.click();
        });
      case "racePack":
        return run("race-day-pdf", async () => {
          const stage = canvasRef.current?.getStage();
          if (!stage) throw new Error(t("export.messages.canvasNotReady"));
          const { exportPdf } = await import("@/lib/export/exportPdf");
          const shareUrl = await getRacePackShareUrl();
          await exportPdf(
            stage,
            design,
            filenameFor(format),
            exportTheme,
            { t: tExportPdf, tSetup: tSetupEstimate, tShapes },
            {
              includeObstacleNumbers,
              preset: "race-day",
              shareUrl,
              unitSystem,
            }
          );
        });
      case "json":
        return run("json", () => {
          const serialized = serializeDesign(design);
          downloadJsonFile(filenameFor(format), serialized);
        });
      case "webm":
        return run(
          "webm",
          async () => {
            const toastId = webmToastIdRef.current ?? "webm-flythrough-export";
            const startedAt = Date.now();
            webmToastIdRef.current = toastId;
            setWebmProgress(null);
            setWebmStartedAt(startedAt);
            toast.loading(t("export.webm.renderingBackground"), {
              id: toastId,
            });
            const { exportFlythrough } =
              await import("@/lib/export/exportFlythrough");
            try {
              await exportFlythrough(
                design,
                filenameFor(format),
                exportTheme,
                (progress) => {
                  setWebmProgress(progress);
                  toast.loading(
                    t("export.webm.renderingProgress", {
                      status: getFlythroughStatusText(progress, startedAt),
                    }),
                    { id: toastId }
                  );
                }
              );
            } finally {
              setWebmProgress(null);
              setWebmStartedAt(null);
              webmToastIdRef.current = null;
            }
          },
          {
            closeOnStart: true,
            successMessage: t("export.webm.ready"),
            toastId: "webm-flythrough-export",
          }
        );
      case "velocidrone":
        return run("trk", () =>
          exportVelocidroneFile(design, filenameFor(format))
        );
    }
  };

  const categoryMeta: Record<
    ExportCategoryId,
    { title: string; icon: React.ReactNode }
  > = {
    visuals: {
      title: t("export.categories.visuals.title"),
      icon: <ImageIcon className="size-4" />,
    },
    raceDay: {
      title: t("export.categories.raceDay.title"),
      icon: <FileText className="size-4" />,
    },
    projectData: {
      title: t("export.categories.projectData.title"),
      icon: <Database className="size-4" />,
    },
    motion: {
      title: t("export.categories.motion.title"),
      icon: <Video className="size-4" />,
    },
    simulatorLab: {
      title: t("export.categories.simulatorLab.title"),
      icon: <FlaskConical className="size-4" />,
    },
  };

  const navItems: SidebarDialogNavItem[] = (
    ["visuals", "raceDay", "projectData", "motion", "simulatorLab"] as const
  ).map((id) => ({
    id,
    label: categoryMeta[id].title,
    icon: categoryMeta[id].icon,
  }));

  const activeFormats = exportFormats.filter(
    (format) => format.category === activeCategory
  );

  const selectedFormat =
    exportFormats.find(
      (format) => format.id === selectedFormatByCategory[activeCategory]
    ) ??
    activeFormats[0] ??
    exportFormats[0];
  const selectedLockedAction =
    selectedFormat?.id === "render3d" && activeTab !== "3d" && onRequest3DView
      ? {
          label: t("export.actions.switchTo3dView"),
          onClick: onRequest3DView,
        }
      : undefined;

  function getExportReadiness(
    format: ExportFormat
  ): ExportReadiness | undefined {
    switch (format.id) {
      case "render3d":
        if (activeTab === "3d") return undefined;
        return {
          status: "blocked",
          message: t("export.readiness.open3d"),
        };
      case "racePack":
        if (!hasTrackContent) {
          return {
            status: "blocked",
            message: t("export.readiness.emptyRacePack"),
          };
        }
        if (!canvasReady) {
          return {
            status: "blocked",
            message: t("export.readiness.canvasNotReady"),
          };
        }
        return undefined;
      case "webm":
        if (hasFlythroughRoute) return undefined;
        return {
          status: "blocked",
          message: t("export.readiness.missingRaceLine"),
        };
      case "velocidrone":
        if (!hasTrackContent) {
          return {
            status: "blocked",
            message: t("export.readiness.emptyVelocidrone"),
          };
        }
        return {
          status: "warning",
          message: t("export.readiness.experimentalSimulator"),
        };
      default:
        return undefined;
    }
  }

  const selectedReadiness = getExportReadiness(selectedFormat);

  const hasMultipleFormats = activeFormats.length > 1;

  const activeContent = (
    <div className="space-y-5">
      {hasMultipleFormats ? (
        <div className="grid grid-cols-3 gap-1">
          {activeFormats.map((format) => (
            <ExportFormatChoice
              key={format.id}
              format={format}
              selected={selectedFormat.id === format.id}
              onSelect={() =>
                setSelectedFormatByCategory((current) => ({
                  ...current,
                  [activeCategory]: format.id,
                }))
              }
            />
          ))}
        </div>
      ) : null}

      <div
        className={cn(hasMultipleFormats && "border-border/40 border-t pt-5")}
      >
        <ExportSettingsPanel
          format={selectedFormat}
          showHeader={!hasMultipleFormats}
          busy={busy}
          lockedAction={selectedLockedAction}
          readiness={selectedReadiness}
          filenameStem={
            filenameByFormat[selectedFormat.id] ??
            defaultFilenameStem(selectedFormat.id)
          }
          exportTheme={exportTheme}
          includeObstacleNumbers={includeObstacleNumbers}
          onFilenameStemChange={(value) =>
            setFilenameByFormat((current) => ({
              ...current,
              [selectedFormat.id]: value,
            }))
          }
          onThemeChange={setExportTheme}
          onIncludeObstacleNumbersChange={setIncludeObstacleNumbers}
          onExport={() => handleExport(selectedFormat.id)}
          webmProgress={selectedFormat.id === "webm" ? webmProgress : null}
          webmStartedAt={selectedFormat.id === "webm" ? webmStartedAt : null}
          t={t}
        />
      </div>
    </div>
  );

  return (
    <SidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("export.dialog.title")}
      subtitle={t("export.dialog.subtitle")}
      mobileSubtitle={t("export.dialog.subtitle")}
      navItems={navItems}
      activeItem={activeCategory}
      onItemChange={(id) => setActiveCategory(id as ExportCategoryId)}
    >
      {activeContent}
    </SidebarDialog>
  );
}
