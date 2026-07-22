"use client";

import Link from "next/link";
import { Play, Scan, Share2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import ViewModeSwitch from "@/components/editor/ViewModeSwitch";
import { cn } from "@/lib/utils";
import type { EditorViewportTab } from "@/components/editor/mobile/Panels";

interface EditorMobileViewControlsProps {
  hasPath: boolean;
  inspectorHint: string;
  mobileGizmoEnabled: boolean;
  mobileObstacleNumbersEnabled: boolean;
  mobileRulersEnabled: boolean;
  onFitView: () => void;
  onSetMobileGizmoEnabled: (enabled: boolean) => void;
  onSetMobileObstacleNumbersEnabled: (enabled: boolean) => void;
  onSetMobileRulersEnabled: (enabled: boolean) => void;
  onShare?: () => void;
  onStartFlyThrough: () => void;
  snapEnabled?: boolean;
  onToggleSnapEnabled?: () => void;
  onTabChange: (tab: EditorViewportTab) => void;
  saveStatusLabel: string;
  showShareActions?: boolean;
  studioHref?: string;
  tab: EditorViewportTab;
  closePanel?: () => void;
  readOnly?: boolean;
}

function ToggleRow({
  description,
  enabled,
  onClick,
  title,
}: {
  description: string;
  enabled: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      onClick={onClick}
      className={cn(
        "border-border/50 bg-muted/18 mt-2.5 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
        enabled
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium">{title}</p>
        <p className="text-muted-foreground/75 pt-0.5 text-[11px] leading-snug">
          {description}
        </p>
      </div>
      <div
        className={cn(
          "flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
          enabled
            ? "bg-foreground/90 justify-end"
            : "bg-border/80 justify-start"
        )}
      >
        <span className="bg-background block size-5 rounded-full shadow-xs" />
      </div>
    </button>
  );
}

export function ViewControls({
  closePanel,
  hasPath,
  inspectorHint,
  mobileGizmoEnabled,
  mobileObstacleNumbersEnabled,
  mobileRulersEnabled,
  onFitView,
  onSetMobileGizmoEnabled,
  onSetMobileObstacleNumbersEnabled,
  onSetMobileRulersEnabled,
  onShare,
  onStartFlyThrough,
  onTabChange,
  onToggleSnapEnabled,
  readOnly = false,
  saveStatusLabel,
  showShareActions = true,
  snapEnabled = false,
  studioHref = "/studio",
  tab,
}: EditorMobileViewControlsProps) {
  const t = useTranslations("editor.mobilePanels.viewControls");
  const tCommon = useTranslations("editor.common");
  const modeDescription = !readOnly
    ? `${inspectorHint}. ${saveStatusLabel}.`
    : tab === "3d"
      ? hasPath
        ? t("readOnly.review3dWithPath")
        : t("readOnly.review3dNoPath")
      : hasPath
        ? t("readOnly.review2dWithPath")
        : t("readOnly.review2dNoPath");

  return (
    <>
      <div>
        <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
          {readOnly ? saveStatusLabel : t("mode.current")}
        </p>
        <div className="border-border/50 bg-muted/18 rounded-2xl border px-3 py-3">
          <p className="text-foreground text-sm font-medium">
            {tab === "2d" ? tCommon("canvas2d") : tCommon("preview3d")}
          </p>
          <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
            {modeDescription}
          </p>
        </div>
      </div>
      <div>
        <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
          {t("mode.viewModeLabel")}
        </p>
        <ViewModeSwitch
          value={tab}
          onValueChange={(nextTab) => {
            onTabChange(nextTab);
            closePanel?.();
          }}
          size="drawer"
        />
        <button
          type="button"
          onClick={onFitView}
          className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground mt-2.5 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium">
              {t("controls.fitToField.label")}
            </p>
            <p className="text-muted-foreground/75 pt-0.5 text-[11px] leading-snug">
              {t("controls.fitToField.description")}
            </p>
          </div>
          <Scan className="size-4 shrink-0" />
        </button>
        {tab === "2d" ? (
          <>
            {onToggleSnapEnabled && (
              <button
                type="button"
                aria-label={t("controls.snap.label")}
                onClick={onToggleSnapEnabled}
                className={cn(
                  "border-border/50 bg-muted/18 mt-2.5 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                  snapEnabled
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium">
                    {t("controls.snap.label")}
                  </p>
                  <p className="text-muted-foreground/75 pt-0.5 text-[11px] leading-snug">
                    {t("controls.snap.description")}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
                    snapEnabled
                      ? "bg-foreground/90 justify-end"
                      : "bg-border/80 justify-start"
                  )}
                >
                  <span className="bg-background block size-5 rounded-full shadow-xs" />
                </div>
              </button>
            )}
            <ToggleRow
              title={t("controls.rulers.label")}
              description={t("controls.rulers.description")}
              enabled={mobileRulersEnabled}
              onClick={() => onSetMobileRulersEnabled(!mobileRulersEnabled)}
            />
            <ToggleRow
              title={t("controls.obstacleNumbers.label")}
              description={t("controls.obstacleNumbers.description")}
              enabled={mobileObstacleNumbersEnabled}
              onClick={() =>
                onSetMobileObstacleNumbersEnabled(!mobileObstacleNumbersEnabled)
              }
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                closePanel?.();
                onStartFlyThrough();
              }}
              disabled={!hasPath}
              className={cn(
                "border-border/50 bg-muted/18 mt-2.5 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                hasPath
                  ? "text-muted-foreground hover:bg-muted/28 hover:text-foreground"
                  : "text-muted-foreground/45 cursor-not-allowed"
              )}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-medium">
                  {t("controls.flyThrough.label")}
                </p>
                <p className="text-muted-foreground/75 pt-0.5 text-[11px] leading-snug">
                  {hasPath
                    ? t("controls.flyThrough.descriptions.available")
                    : readOnly
                      ? t("controls.flyThrough.descriptions.readOnly")
                      : t("controls.flyThrough.descriptions.draw")}
                </p>
              </div>
              <Play className="size-4 shrink-0" />
            </button>
            <ToggleRow
              title={t("controls.gizmo.label")}
              description={t("controls.gizmo.description")}
              enabled={mobileGizmoEnabled}
              onClick={() => onSetMobileGizmoEnabled(!mobileGizmoEnabled)}
            />
          </>
        )}
      </div>
      {readOnly && showShareActions ? (
        <div>
          <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
            {t("share.sectionLabel")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={studioHref}
              className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all"
            >
              <ArrowRight className="size-4" />
              <span className="max-w-full truncate text-[11px] leading-none font-medium">
                {t("share.editableCopy")}
              </span>
            </Link>
            <button
              type="button"
              onClick={onShare}
              className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all"
            >
              <Share2 className="size-4" />
              <span className="max-w-full truncate text-[11px] leading-none font-medium">
                {t("share.shareButton")}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
